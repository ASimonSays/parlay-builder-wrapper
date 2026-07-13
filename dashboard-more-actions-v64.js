/* DASHBOARD MORE ACTIONS V67 — compact primary row with expandable secondary actions */
(() => {
  'use strict';

  function addCss(){
    if(document.getElementById('dashboardMoreActionsV64Css'))return;
    const style=document.createElement('style');
    style.id='dashboardMoreActionsV64Css';
    style.textContent=`
      #ticketList .savedActions{position:relative!important;display:block!important}
      #ticketList .savedActionsPrimary{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;width:100%!important}
      #ticketList .savedActionsPrimary>button{width:100%!important;grid-column:auto!important}
      #ticketList .savedActionsMoreToggle{color:#26303B!important;background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;border-color:rgba(93,105,120,.46)!important}
      #ticketList .savedActionsMoreToggle .moreChevron{display:inline-block;margin-left:5px;font-size:15px;line-height:1;transition:transform .18s ease}
      #ticketList .savedActionsMoreToggle[aria-expanded="true"] .moreChevron{transform:rotate(180deg)}
      #ticketList .savedActionsDrawer{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;overflow:hidden!important;max-height:0!important;opacity:0!important;transform:translateY(-4px)!important;pointer-events:none!important;margin-top:0!important;transition:max-height .2s ease,opacity .16s ease,transform .16s ease,margin-top .16s ease!important}
      #ticketList .savedActionsDrawer.open{max-height:72px!important;opacity:1!important;transform:translateY(0)!important;pointer-events:auto!important;margin-top:6px!important}
      #ticketList .savedActionsDrawer>button{width:100%!important;grid-column:auto!important}
      @media(max-width:390px){#ticketList .savedActionsPrimary,#ticketList .savedActionsDrawer{gap:5px!important}}
    `;
    document.head.appendChild(style);
  }

  function label(button){
    const raw=String(button?.innerText||button?.textContent||'').replace(/\s+/g,'').toUpperCase();
    const aliases={COPYCODE:'COPY CODE',MARKACTIVE:'MARK ACTIVE'};
    return aliases[raw]||raw;
  }

  function validStructure(actions){
    return Boolean(actions?.querySelector('.savedActionsPrimary')&&actions.querySelector('.savedActionsDrawer')&&actions.querySelector('.savedActionsMoreToggle'));
  }

  function enhance(card){
    const actions=card.querySelector('.savedActions');
    if(!actions)return false;
    if(validStructure(actions)){actions.dataset.moreReady='1';return true}

    const buttons=[...actions.querySelectorAll('button')].filter(button=>!button.classList.contains('savedActionsMoreToggle'));
    const view=buttons.find(b=>label(b)==='VIEW');
    const copy=buttons.find(b=>label(b)==='COPY CODE');
    const share=buttons.find(b=>label(b)==='SHARE');
    const duplicate=buttons.find(b=>label(b)==='DUPLICATE');
    const complete=buttons.find(b=>['COMPLETE','MARK ACTIVE'].includes(label(b)));
    const edit=buttons.find(b=>label(b)==='EDIT');
    const del=buttons.find(b=>label(b)==='DELETE');
    if(!view||!copy||!share||!duplicate||!complete||!edit||!del)return false;

    const primary=document.createElement('div');
    primary.className='savedActionsPrimary';
    [view,copy,share].forEach(button=>primary.appendChild(button));

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='ghost savedActionsMoreToggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='More <span class="moreChevron">⌄</span>';
    primary.appendChild(toggle);

    const drawer=document.createElement('div');
    drawer.className='savedActionsDrawer';
    [duplicate,complete,edit,del].forEach(button=>drawer.appendChild(button));

    actions.replaceChildren(primary,drawer);
    actions.dataset.moreReady='1';

    toggle.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      const open=!drawer.classList.contains('open');
      drawer.classList.toggle('open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.childNodes[0].nodeValue=open?'Less ':'More ';
    });
    return true;
  }

  function apply(){addCss();document.querySelectorAll('#ticketList .savedTicket').forEach(enhance)}
  function retry(){let count=0;const timer=setInterval(()=>{apply();count++;if(count>=20||[...document.querySelectorAll('#ticketList .savedTicket')].every(card=>card.querySelector('.savedActionsMoreToggle')))clearInterval(timer)},100)}
  function wrap(){const original=window.renderTicketDashboard;if(typeof original!=='function'||original.__moreActionsV67Wrapped)return;const wrapped=function(...args){const out=original.apply(this,args);requestAnimationFrame(retry);return out};wrapped.__moreActionsV67Wrapped=true;window.renderTicketDashboard=wrapped}

  wrap();retry();
  window.addEventListener('load',()=>{wrap();retry()},{once:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))setTimeout(retry,0)},true);
  document.addEventListener('parlay:dashboard-refreshed',retry);
})();