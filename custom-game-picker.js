/* CUSTOM GAME PICKER V1 */
(() => {
  'use strict';

  const SELECTOR = 'select#ticketGame, select.lgame';
  let activeSelect = null;

  function ensureUi(){
    if(document.getElementById('customGamePickerBackdrop')) return;

    const style=document.createElement('style');
    style.id='customGamePickerCss';
    style.textContent=`
      .customGamePickerBackdrop{position:fixed;inset:0;z-index:180;background:rgba(8,12,18,.48);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
      .customGamePickerSheet{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:181;max-height:min(72vh,620px);display:flex;flex-direction:column;border-radius:17px;border:1px solid rgba(255,255,255,.88);background:linear-gradient(180deg,#f8fafc,#d2d9e3 66%,#a7b1bf);box-shadow:0 18px 42px rgba(0,0,0,.34);overflow:hidden}
      .customGamePickerHeader{padding:10px 12px 8px;border-bottom:1px solid rgba(70,80,94,.2);text-align:center}
      .customGamePickerHandle{width:42px;height:5px;margin:0 auto 8px;border-radius:5px;background:rgba(65,73,84,.42)}
      .customGamePickerTitle{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#596372}
      .customGamePickerList{overflow:auto;-webkit-overflow-scrolling:touch;padding:7px}
      .customGamePickerOption{display:block;width:100%;margin:0 0 7px;padding:11px 12px;text-align:left;text-transform:none;letter-spacing:0;border-radius:10px;border:1px solid rgba(255,255,255,.9);color:#17202b;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(219,226,235,.92));box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 2px 5px rgba(0,0,0,.1)}
      .customGamePickerOption:last-child{margin-bottom:0}
      .customGamePickerOption.isSelected{border-color:#9b6d25;box-shadow:inset 0 0 0 1px #e3b556,0 2px 6px rgba(0,0,0,.14)}
      .customGamePickerMatchup{display:block;font-size:15px;font-weight:820;line-height:1.22;color:#17202b}
      .customGamePickerTime{display:block;margin-top:4px;font-size:11px;font-weight:700;line-height:1.15;color:#687383}
      .customGamePickerSingle{display:block;font-size:14px;font-weight:800;color:#17202b}
      .customGamePickerCancel{display:block;width:calc(100% - 14px);margin:0 7px 7px;padding:11px 10px}
      body.customGamePickerOpen{overflow:hidden!important}
    `;
    document.head.appendChild(style);

    const backdrop=document.createElement('div');
    backdrop.id='customGamePickerBackdrop';
    backdrop.className='customGamePickerBackdrop hide';
    backdrop.addEventListener('click',closePicker);

    const sheet=document.createElement('div');
    sheet.id='customGamePickerSheet';
    sheet.className='customGamePickerSheet hide';
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.innerHTML=`
      <div class="customGamePickerHeader">
        <div class="customGamePickerHandle"></div>
        <div class="customGamePickerTitle">Select Game</div>
      </div>
      <div id="customGamePickerList" class="customGamePickerList"></div>
      <button type="button" id="customGamePickerCancel" class="ghost customGamePickerCancel">Cancel</button>
    `;
    sheet.querySelector('#customGamePickerCancel').addEventListener('click',closePicker);

    document.body.append(backdrop,sheet);
  }

  function splitLabel(label){
    const text=String(label||'').trim();
    const match=text.match(/^(.*?)\s+[—–-]\s+(.+)$/);
    if(match) return {matchup:match[1].trim(),time:match[2].trim()};
    return {matchup:text,time:''};
  }

  function optionLabel(option){
    return option.dataset.fullLabel || option.textContent || option.label || option.value || '';
  }

  function renderPicker(select){
    ensureUi();
    activeSelect=select;
    const list=document.getElementById('customGamePickerList');
    list.replaceChildren();

    [...select.options].forEach(option=>{
      if(option.disabled && !option.value) return;
      const button=document.createElement('button');
      button.type='button';
      button.className='customGamePickerOption'+(option.value===select.value?' isSelected':'');
      button.dataset.value=option.value;

      const label=optionLabel(option);
      const {matchup,time}=splitLabel(label);
      if(time){
        const main=document.createElement('span');
        main.className='customGamePickerMatchup';
        main.textContent=matchup;
        const sub=document.createElement('span');
        sub.className='customGamePickerTime';
        sub.textContent=time;
        button.append(main,sub);
      }else{
        const single=document.createElement('span');
        single.className='customGamePickerSingle';
        single.textContent=matchup;
        button.append(single);
      }

      button.addEventListener('click',()=>chooseOption(option.value));
      list.appendChild(button);
    });

    document.getElementById('customGamePickerBackdrop').classList.remove('hide');
    document.getElementById('customGamePickerSheet').classList.remove('hide');
    document.body.classList.add('customGamePickerOpen');
    requestAnimationFrame(()=>list.querySelector('.isSelected')?.scrollIntoView({block:'nearest'}));
  }

  function chooseOption(value){
    const select=activeSelect;
    closePicker();
    if(!select) return;
    select.value=value;
    select.dispatchEvent(new Event('input',{bubbles:true}));
    select.dispatchEvent(new Event('change',{bubbles:true}));
    try{window.refreshReadableOptions?.()}catch{}
    select.focus({preventScroll:true});
  }

  function closePicker(){
    document.getElementById('customGamePickerBackdrop')?.classList.add('hide');
    document.getElementById('customGamePickerSheet')?.classList.add('hide');
    document.body.classList.remove('customGamePickerOpen');
    activeSelect=null;
  }

  function intercept(event){
    const select=event.target?.closest?.(SELECTOR);
    if(!select || select.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    renderPicker(select);
  }

  document.addEventListener('pointerdown',intercept,true);
  document.addEventListener('keydown',event=>{
    const select=event.target?.closest?.(SELECTOR);
    if(!select || select.disabled) return;
    if(event.key==='Enter'||event.key===' '||event.key==='ArrowDown'){
      event.preventDefault();
      renderPicker(select);
    }
    if(event.key==='Escape')closePicker();
  },true);
})();
