/* DASHBOARD LAYOUT V56 — aligned header controls and two-row ticket actions */
(() => {
  'use strict';

  function addCss(){
    if(document.getElementById('dashboardLayoutV56Css'))return;
    const style=document.createElement('style');
    style.id='dashboardLayoutV56Css';
    style.textContent=`
      /* My Tickets heading + three equal two-line primary actions. */
      #dashboardView .dashboardHeader{
        display:grid!important;
        grid-template-columns:minmax(118px,.9fr) minmax(0,2.7fr)!important;
        gap:10px!important;
        align-items:stretch!important;
      }
      #dashboardView .dashboardHeader h2{
        align-self:center!important;
        min-width:0!important;
        line-height:1.18!important;
      }
      #dashboardView .dashboardActions{
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px!important;
        min-width:0!important;
      }
      #dashboardView .dashboardActions button{
        width:100%!important;
        min-width:0!important;
        min-height:58px!important;
        padding:8px 5px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        text-align:center!important;
        white-space:normal!important;
        line-height:1.18!important;
        font-size:11px!important;
      }
      #dashboardView .dashboardActions button .forcedTwoLine{
        display:block!important;
        width:100%!important;
        text-align:center!important;
      }

      /* Timestamp left, then Refresh, then Select beneath the main actions. */
      #dashboardView .dashboardToolbarV55{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto auto!important;
        gap:8px!important;
        align-items:center!important;
        margin:0 0 10px!important;
      }
      #dashboardView .dashboardToolbarStatus{
        grid-column:1!important;
        grid-row:1!important;
        margin:0!important;
        text-align:left!important;
        min-width:0!important;
      }
      #refreshTicketsBtn{grid-column:2!important;grid-row:1!important}
      #ticketSelectModeBtn{grid-column:3!important;grid-row:1!important}
      #deleteSelectedTicketsBtn{
        grid-column:1/-1!important;
        grid-row:2!important;
        justify-self:end!important;
      }

      /* Ticket actions: use-as-is row of three, modification row of four. */
      #ticketList .savedActions{
        display:grid!important;
        grid-template-columns:repeat(12,minmax(0,1fr))!important;
        gap:8px!important;
      }
      #ticketList .savedActions button{
        width:100%!important;
        min-width:0!important;
        min-height:46px!important;
        padding:7px 4px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        text-align:center!important;
        white-space:normal!important;
        line-height:1.12!important;
        font-size:10px!important;
        font-weight:900!important;
        letter-spacing:.065em!important;
      }
      #ticketList .savedActions .actionUse{grid-column:span 4!important}
      #ticketList .savedActions .actionChange{grid-column:span 3!important}
      #ticketList .savedActions .forcedTwoLine{
        display:block!important;
        width:100%!important;
        text-align:center!important;
      }

      @media(max-width:390px){
        #dashboardView .dashboardHeader{grid-template-columns:minmax(102px,.85fr) minmax(0,2.8fr)!important;gap:7px!important}
        #dashboardView .dashboardActions{gap:6px!important}
        #dashboardView .dashboardActions button{font-size:10px!important;padding:7px 3px!important}
        #ticketList .savedActions{gap:6px!important}
        #ticketList .savedActions button{font-size:9px!important;padding:6px 2px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizedText(button){
    return String(button?.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
  }

  function setTwoLines(button,first,second){
    if(!button)return;
    button.innerHTML=`<span class="forcedTwoLine">${first}<br>${second}</span>`;
  }

  function formatHeaderActions(){
    const actions=document.querySelector('#dashboardView .dashboardActions');
    if(!actions)return;
    [...actions.querySelectorAll('button')].forEach(button=>{
      const text=normalizedText(button);
      if(text.includes('IMPORT'))setTwoLines(button,'IMPORT','CODE');
      else if(text.includes('VIEW')&&text.includes('ACTIVE'))setTwoLines(button,'VIEW','ACTIVE');
      else if(text.includes('NEW')&&text.includes('TICKET'))setTwoLines(button,'NEW','TICKET');
    });
  }

  function arrangeTicketActions(card){
    const actions=card.querySelector('.savedActions');
    if(!actions)return;
    const buttons=[...actions.querySelectorAll('button')];
    const find=pattern=>buttons.find(button=>pattern.test(normalizedText(button)));
    const ordered=[
      {button:find(/^VIEW$/),kind:'actionUse'},
      {button:find(/^COPY CODE$/),kind:'actionUse',lines:['COPY','CODE']},
      {button:find(/^SHARE$/),kind:'actionUse'},
      {button:find(/^DUPLICATE$/),kind:'actionChange'},
      {button:find(/^(COMPLETE|MARK ACTIVE)$/),kind:'actionChange'},
      {button:find(/^EDIT$/),kind:'actionChange'},
      {button:find(/^DELETE$/),kind:'actionChange'}
    ];
    ordered.forEach(item=>{
      if(!item.button)return;
      item.button.classList.remove('actionUse','actionChange');
      item.button.classList.add(item.kind);
      if(item.lines)setTwoLines(item.button,item.lines[0],item.lines[1]);
      actions.appendChild(item.button);
    });
  }

  function apply(){
    addCss();
    formatHeaderActions();
    document.querySelectorAll('#ticketList .savedTicket').forEach(arrangeTicketActions);
  }

  function wrapDashboard(){
    const original=window.renderTicketDashboard;
    if(typeof original!=='function'||original.__layoutV56Wrapped)return;
    const wrapped=function(...args){
      const out=original.apply(this,args);
      requestAnimationFrame(apply);
      return out;
    };
    wrapped.__layoutV56Wrapped=true;
    window.renderTicketDashboard=wrapped;
  }

  wrapDashboard();
  apply();
  window.addEventListener('load',()=>{wrapDashboard();apply()},{once:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#ticketsTab'))setTimeout(apply,0);
  },true);
})();
