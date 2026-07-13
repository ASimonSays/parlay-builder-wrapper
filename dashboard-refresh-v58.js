/* DASHBOARD REFRESH V58 — single batched refresh and adjacent timestamp */
(() => {
  'use strict';
  const KEY='parlayTracker.savedTickets.v1';
  let running=false;

  function esc(v){return window.esc?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function load(){try{return window.loadSavedTickets?window.loadSavedTickets():JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function stateClass(state){return String(state||'pending').toUpperCase()}
  function valueClass(state){return state==='win'?'valueWin':state==='loss'?'valueLoss':state==='push'?'valuePush':state==='suspended'||state==='unavailable'?'valueSuspended':'valuePending'}

  function addCss(){
    if(document.getElementById('dashboardRefreshV58Css'))return;
    const style=document.createElement('style');
    style.id='dashboardRefreshV58Css';
    style.textContent=`
      #dashboardView .dashboardToolbarV55{
        grid-template-columns:minmax(0,1fr) auto auto auto!important;
      }
      #dashboardView .dashboardToolbarStatus{
        grid-column:2!important;
        justify-self:end!important;
        text-align:right!important;
        white-space:nowrap!important;
      }
      #refreshTicketsBtn{grid-column:3!important}
      #ticketSelectModeBtn{grid-column:4!important}
    `;
    document.head.appendChild(style);
  }

  function datesFor(records){
    const dates=[];
    for(const record of records){
      const t=record?.ticket||{};
      if(t.date)dates.push(t.date);
      for(const leg of t.legs||[])if(leg.date)dates.push(leg.date);
    }
    return [...new Set(dates)];
  }

  function detailsHtml(record){
    const C=window.ParlayTrackerCore,t=record.ticket||{};
    return (record.__evaluated||[]).map(leg=>{
      const x=leg.__live||C.statusObj('pending',''),game=leg.__game;
      const meta=t.type==='sgp'?[game?C.baseGameMeta(game):'']:[C.legGame(t,leg),game?C.baseGameMeta(game):''];
      return `<div class="dashboardLeg"><div><div class="dashboardLegLabel">${esc(leg.label||'Untitled')}</div><div class="dashboardLegMeta">${esc(meta.filter(Boolean).join(' · '))}</div></div><div class="dashboardLegRight"><div class="dashboardLegValue ${esc(x.valueClass||valueClass(x.state))}">${esc(x.value||'')}</div><span class="dashboardLegStatus ${stateClass(x.state)}">${esc(stateClass(x.state))}</span></div></div>`;
    }).join('')||'<div class="dashboardDetailsMessage">No legs in this ticket.</div>';
  }

  async function refreshOnce(){
    if(running)return;
    const status=document.querySelector('.dashboardToolbarStatus');
    const openCards=[...document.querySelectorAll('#ticketList .savedTicket')].filter(card=>{
      const panel=card.querySelector('.savedTicketDetails');
      return panel&&!panel.classList.contains('hide');
    });
    if(!openCards.length){if(status)status.textContent='Open a ticket to refresh its legs.';return}

    const byId=new Map(load().map(record=>[record.id,record]));
    const targets=openCards.map(card=>({card,panel:card.querySelector('.savedTicketDetails'),record:byId.get(card.dataset.ticketId)})).filter(x=>x.record);
    if(!targets.length)return;

    running=true;
    if(status)status.textContent='Refreshing…';
    targets.forEach(x=>x.panel.innerHTML='<div class="dashboardDetailsMessage">Refreshing leg status…</div>');
    try{
      const S=window.ParlayTrackerSources,E=window.ParlayTrackerEvaluator;
      if(!S||!E)throw new Error('Tracker engine unavailable');
      S.resetTrackingCaches?.();
      const games=await S.fetchScoreboards(datesFor(targets.map(x=>x.record)));
      const evaluated=await Promise.all(targets.map(x=>E.evaluateRecord(x.record,games)));
      evaluated.forEach((record,index)=>{targets[index].panel.innerHTML=detailsHtml(record)});
      if(status)status.textContent=`Updated ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
    }catch(error){
      targets.forEach(x=>x.panel.innerHTML=`<div class="dashboardDetailsMessage">Unable to refresh leg status: ${esc(error?.message||error)}</div>`);
      if(status)status.textContent='Refresh failed';
    }finally{running=false}
  }

  function wire(){
    addCss();
    const old=document.getElementById('refreshTicketsBtn');
    if(!old||old.dataset.batchRefresh==='1')return;
    const button=old.cloneNode(true);
    button.dataset.batchRefresh='1';
    old.replaceWith(button);
    button.addEventListener('click',refreshOnce);
  }

  function install(){wire()}
  install();
  window.addEventListener('load',wire,{once:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))setTimeout(wire,0)},true);
})();