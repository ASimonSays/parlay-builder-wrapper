/* SHOW LEGS LABEL FIX V2 — prevents Safari glyph clipping after expand/collapse */
(() => {
  'use strict';

  const STYLE_ID='showLegsLabelFixCss';
  const addCss=()=>{
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ticketList .ticketExpandBtn,
      #ticketList .ticketExpandBtn.ticketDetailsAction,
      #ticketList .ticketExpandBtn.webkitPaintLayer{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        box-sizing:border-box!important;
        overflow:visible!important;
        text-overflow:clip!important;
        white-space:nowrap!important;
        padding-left:4px!important;
        padding-right:4px!important;
        letter-spacing:0!important;
        text-indent:0!important;
        -webkit-transform:none!important;
        transform:none!important;
        -webkit-backface-visibility:visible!important;
        backface-visibility:visible!important;
        clip-path:none!important;
        -webkit-clip-path:none!important;
        contain:none!important;
        mask:none!important;
        -webkit-mask:none!important;
      }
    `;
    document.head.appendChild(style);
  };

  const recordFor=card=>{
    const id=String(card?.dataset?.ticketId||'');
    try{
      const list=window.loadSavedTickets?.()||JSON.parse(localStorage.getItem('parlayTracker.savedTickets.v1')||'[]');
      return Array.isArray(list)?list.find(r=>String(r?.id||'')===id):null;
    }catch{return null}
  };

  const normalize=button=>{
    if(!button||button.dataset.labelFixBusy==='1')return;
    button.dataset.labelFixBusy='1';
    const card=button.closest('.savedTicket');
    const record=recordFor(card);
    const straight=String(record?.ticket?.type||'').toLowerCase()==='straight';
    const open=button.getAttribute('aria-expanded')==='true';
    const compact=window.matchMedia('(max-width:340px)').matches;
    const label=compact?(open?'Hide':'Show'):`${open?'Hide':'Show'} ${straight?'Pick':'Legs'}`;
    button.classList.remove('webkitPaintLayer');
    button.style.removeProperty('-webkit-transform');
    button.style.removeProperty('transform');
    if(button.textContent!==label)button.textContent=label;
    void button.offsetWidth;
    requestAnimationFrame(()=>{
      button.classList.remove('webkitPaintLayer');
      delete button.dataset.labelFixBusy;
    });
  };

  const normalizeAll=()=>document.querySelectorAll('#ticketList .ticketExpandBtn').forEach(normalize);
  const start=()=>{
    addCss();
    normalizeAll();
    new MutationObserver(mutations=>{
      for(const mutation of mutations){
        const target=mutation.target?.nodeType===1?mutation.target:mutation.target?.parentElement;
        const button=target?.closest?.('.ticketExpandBtn');
        if(button)normalize(button);
      }
      normalizeAll();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-expanded','class']});
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('.ticketExpandBtn');
      if(button)setTimeout(()=>normalize(button),0);
    },true);
    document.addEventListener('parlay:dashboard-refreshed',()=>setTimeout(normalizeAll,0));
    window.addEventListener('resize',normalizeAll);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();