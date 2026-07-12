/* TICKET DASHBOARD DETAILS V54 */
(() => {
  'use strict';
  const expandedIds=new Set();
  const loadingIds=new Set();

  function esc(v){return window.esc?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function load(){try{return window.loadSavedTickets?window.loadSavedTickets():JSON.parse(localStorage.getItem('parlayTracker.savedTickets.v1')||'[]')}catch{return[]}}
  function stateClass(state){return String(state||'pending').toUpperCase()}
  function valueClass(state){return state==='win'?'valueWin':state==='loss'?'valueLoss':state==='push'?'valuePush':state==='suspended'||state==='unavailable'?'valueSuspended':'valuePending'}

  function addCss(){
    if(document.getElementById('ticketDashboardDetailsCss'))return;
    const style=document.createElement('style');
    style.id='ticketDashboardDetailsCss';
    style.textContent=`
      .savedTicketTop{align-items:center}
      .ticketExpandBtn{flex:0 0 auto;width:38px;height:38px;padding:0;border-radius:50%;font-size:25px;line-height:1;letter-spacing:0;text-transform:none;transition:transform .18s ease}
      .ticketExpandBtn[aria-expanded="true"]{transform:rotate(90deg)}
      .savedTicketDetails{margin-top:10px;padding:8px 10px 4px;border-radius:9px;background:rgba(255,255,255,.48);box-shadow:inset 0 1px 4px rgba(0,0,0,.15)}
      .savedTicketDetails.hide{display:none!important}
      .dashboardLeg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid rgba(0,0,0,.1)}
      .dashboardLeg:first-child{border-top:0}
      .dashboardLegLabel{font-size:14px;font-weight:900;line-height:1.25}
      .dashboardLegMeta{margin-top:4px;color:#596372;font-size:12px;font-weight:750;line-height:1.35}
      .dashboardLegRight{text-align:right;min-width:70px}
      .dashboardLegValue{font-size:13px;font-weight:900;margin-bottom:4px}
      .dashboardLegStatus{display:inline-block;padding:4px 7px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.08em}
      .dashboardLegStatus.WIN{background:#bfe3bd;color:#154e18}.dashboardLegStatus.LOSS{background:#efc1bc;color:#7a1710}.dashboardLegStatus.LIVE{background:#f1dda5;color:#674500}.dashboardLegStatus.PENDING,.dashboardLegStatus.PUSH{background:#d7dde6;color:#4f5966}.dashboardLegStatus.SUSPENDED,.dashboardLegStatus.UNAVAILABLE{background:#f4c27a;color:#6b3b00}
      .dashboardLegValue.valueWin{color:#278c31}.dashboardLegValue.valueLoss{color:#c72f3e}.dashboardLegValue.valuePush{color:#9b7600}.dashboardLegValue.valueSuspended{color:#a75e00}.dashboardLegValue.valuePending{color:#687383}
      .dashboardDetailsMessage{padding:10px 2px;color:#596372;font-size:12px;font-weight:750}
      #standaloneView .liveLeg{padding:14px 0}
      #standaloneView .liveLegLabel{font-size:16px;line-height:1.3}
      #standaloneView .liveLegMeta{margin-top:6px;font-size:13px;font-weight:800;line-height:1.45;color:#53606f;letter-spacing:.01em}
      #standaloneView .liveLegValue{font-size:15px;min-width:58px}
      #standaloneView .liveStatus{margin-top:7px;padding:4px 8px;font-size:10px}
      #standaloneView .liveLegTop{gap:16px}
      @media(min-width:600px){#standaloneView .liveLegLabel{font-size:17px}#standaloneView .liveLegMeta{font-size:14px}.dashboardLegLabel{font-size:15px}.dashboardLegMeta{font-size:13px}}
    `;
    document.head.appendChild(style);
  }

  function datesFor(record){const out=[];const t=record?.ticket||{};if(t.date)out.push(t.date);for(const leg of t.legs||[])if(leg.date)out.push(leg.date);return [...new Set(out)]}

  function detailsHtml(record){
    const C=window.ParlayTrackerCore;
    const t=record.ticket||{};
    return (record.__evaluated||[]).map(leg=>{
      const x=leg.__live||C.statusObj('pending','');
      const game=leg.__game;
      const meta=t.type==='sgp'
        ? [game?C.baseGameMeta(game):'']
        : [C.legGame(t,leg),game?C.baseGameMeta(game):''];
      return `<div class="dashboardLeg"><div><div class="dashboardLegLabel">${esc(leg.label||'Untitled')}</div><div class="dashboardLegMeta">${esc(meta.filter(Boolean).join(' · '))}</div></div><div class="dashboardLegRight"><div class="dashboardLegValue ${esc(x.valueClass||valueClass(x.state))}">${esc(x.value||'')}</div><span class="dashboardLegStatus ${stateClass(x.state)}">${esc(stateClass(x.state))}</span></div></div>`;
    }).join('')||'<div class="dashboardDetailsMessage">No legs in this ticket.</div>';
  }

  async function loadDetails(id,panel){
    if(loadingIds.has(id))return;
    const record=load().find(r=>r.id===id);
    if(!record)return;
    const S=window.ParlayTrackerSources,E=window.ParlayTrackerEvaluator;
    if(!S||!E){panel.innerHTML='<div class="dashboardDetailsMessage">Tracker engine unavailable.</div>';return}
    loadingIds.add(id);
    panel.innerHTML='<div class="dashboardDetailsMessage">Refreshing leg status…</div>';
    try{
      S.resetTrackingCaches?.();
      const games=await S.fetchScoreboards(datesFor(record));
      const evaluated=await E.evaluateRecord(record,games);
      if(expandedIds.has(id))panel.innerHTML=detailsHtml(evaluated);
    }catch(error){
      panel.innerHTML=`<div class="dashboardDetailsMessage">Unable to refresh leg status: ${esc(error?.message||error)}</div>`;
    }finally{loadingIds.delete(id)}
  }

  function toggle(id,button,panel){
    const open=!expandedIds.has(id);
    if(open)expandedIds.add(id);else expandedIds.delete(id);
    button.setAttribute('aria-expanded',String(open));
    panel.classList.toggle('hide',!open);
    if(open)loadDetails(id,panel);
  }

  function decorate(){
    addCss();
    const records=load();
    const cards=[...document.querySelectorAll('#ticketList .savedTicket')];
    cards.forEach((card,index)=>{
      const record=records[index];
      if(!record||card.dataset.detailsReady==='1')return;
      card.dataset.detailsReady='1';
      card.dataset.ticketId=record.id;
      const top=card.querySelector('.savedTicketTop');
      if(!top)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='ghost ticketExpandBtn';
      button.textContent='›';
      button.setAttribute('aria-label','Show ticket legs');
      button.setAttribute('aria-expanded',String(expandedIds.has(record.id)));
      top.appendChild(button);
      const panel=document.createElement('div');
      panel.className='savedTicketDetails'+(expandedIds.has(record.id)?'':' hide');
      const actions=card.querySelector('.savedActions');
      card.insertBefore(panel,actions||null);
      button.addEventListener('click',()=>toggle(record.id,button,panel));
      if(expandedIds.has(record.id))loadDetails(record.id,panel);
    });
  }

  function wrapDashboard(){
    const original=window.renderTicketDashboard;
    if(typeof original!=='function'||original.__detailsWrapped)return;
    const wrapped=function(...args){
      const out=original.apply(this,args);
      requestAnimationFrame(decorate);
      return out;
    };
    wrapped.__detailsWrapped=true;
    window.renderTicketDashboard=wrapped;
  }

  function install(){wrapDashboard();decorate()}
  install();
  window.addEventListener('load',()=>{wrapDashboard();decorate()},{once:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#ticketsTab'))setTimeout(decorate,0);
  },true);
})();