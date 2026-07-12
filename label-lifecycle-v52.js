/* LABEL LIFECYCLE V52 */
(() => {
  'use strict';

  const DETAIL_SELECTOR='.ltype,.lleague,.ldate,.lgame,.lgameManual,.team,.teamManual,.player,.playerManual,.targetSelect,.targetCustom,.half';

  function clean(v){return String(v??'').trim()}

  function refreshAutoLabel(leg){
    if(!leg)return;
    const labelInput=leg.querySelector('.lbl');
    if(!labelInput||labelInput.dataset.auto==='0')return;
    try{
      labelInput.value=window.autoLabel(leg);
      window.preview?.();
    }catch{}
  }

  function markLoadedLabelModes(record){
    const sourceLegs=record?.ticket?.legs||[];
    const builderLegs=[...document.querySelectorAll('#legs > .leg')];
    builderLegs.forEach((leg,index)=>{
      const input=leg.querySelector('.lbl');
      if(!input)return;
      const sourceLabel=clean(sourceLegs[index]?.label);
      let generated='';
      try{generated=clean(window.autoLabel(leg))}catch{}
      input.dataset.auto=!sourceLabel||sourceLabel===generated?'1':'0';
      if(input.dataset.auto==='1')refreshAutoLabel(leg);
    });
  }

  function wrapRecordLoader(){
    const original=window.loadRecordIntoBuilder;
    if(typeof original!=='function'||original.__labelLifecycleWrapped)return;
    const wrapped=function(record,...args){
      const out=original.call(this,record,...args);
      markLoadedLabelModes(record);
      for(const delay of [0,150,500,1200])setTimeout(()=>markLoadedLabelModes(record),delay);
      return out;
    };
    wrapped.__labelLifecycleWrapped=true;
    window.loadRecordIntoBuilder=wrapped;
  }

  function installEvents(){
    document.addEventListener('input',event=>{
      const labelInput=event.target.closest?.('.lbl');
      if(labelInput){
        labelInput.dataset.auto=clean(labelInput.value)?'0':'1';
        return;
      }
      const detail=event.target.closest?.(DETAIL_SELECTOR);
      if(detail)refreshAutoLabel(detail.closest('.leg'));
    },true);

    document.addEventListener('change',event=>{
      const detail=event.target.closest?.(DETAIL_SELECTOR);
      if(detail)requestAnimationFrame(()=>refreshAutoLabel(detail.closest('.leg')));
    },true);

    document.addEventListener('click',event=>{
      const button=event.target.closest?.('button');
      if(!button||!/generate label/i.test(clean(button.textContent)))return;
      const leg=button.closest('.leg');
      const input=leg?.querySelector('.lbl');
      if(!input)return;
      input.dataset.auto='1';
      requestAnimationFrame(()=>refreshAutoLabel(leg));
    },true);
  }

  wrapRecordLoader();
  installEvents();
  window.addEventListener('load',wrapRecordLoader,{once:true});
})();