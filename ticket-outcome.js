/* TICKET_OUTCOME_V30 */
(() => {
  'use strict';

  const css = `
    .ticketOutcome{display:inline-block;margin:8px 0 2px;padding:5px 9px;border-radius:7px;font-size:10px;font-weight:900;letter-spacing:.08em}
    .ticketOutcome.WON{background:#bfe3bd;color:#154e18}
    .ticketOutcome.LOST{background:#efc1bc;color:#7a1710}
    .ticketOutcome.LIVE{background:#f1dda5;color:#674500}
    .ticketOutcome.PENDING{background:#d7dde6;color:#4f5966}
    .liveTicketCard.ticketWon{box-shadow:inset 0 0 0 2px rgba(56,139,63,.22)}
    .liveTicketCard.ticketLost{box-shadow:inset 0 0 0 2px rgba(173,55,43,.22)}
  `;

  function addCss(){
    if(document.getElementById('ticketOutcomeCss')) return;
    const style=document.createElement('style');
    style.id='ticketOutcomeCss';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function settleCard(card){
    const statuses=[...card.querySelectorAll('.liveStatus')]
      .map(el=>String(el.textContent||'').trim().toUpperCase())
      .filter(Boolean);
    if(!statuses.length) return;

    const meaningful=statuses.filter(s=>s!=='VOID');
    let outcome='PENDING';
    if(statuses.includes('LOSS')) outcome='LOST';
    else if(meaningful.length && meaningful.every(s=>s==='WIN')) outcome='WON';
    else if(statuses.includes('LIVE')) outcome='LIVE';

    let badge=card.querySelector('.ticketOutcome');
    if(!badge){
      badge=document.createElement('div');
      badge.className='ticketOutcome';
      const summary=card.querySelector('.liveSummary');
      if(summary) summary.insertAdjacentElement('beforebegin',badge);
      else card.appendChild(badge);
    }

    const wantedClass=`ticketOutcome ${outcome}`;
    const wantedText=`TICKET ${outcome}`;
    if(badge.className!==wantedClass) badge.className=wantedClass;
    if(badge.textContent!==wantedText) badge.textContent=wantedText;
    card.classList.toggle('ticketWon',outcome==='WON');
    card.classList.toggle('ticketLost',outcome==='LOST');
  }

  function apply(){
    addCss();
    document.querySelectorAll('.liveTicketCard').forEach(settleCard);
  }

  let queued=false;
  function queueApply(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  }

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList' && [...m.addedNodes].some(n=>n.nodeType===1))) queueApply();
  });

  function start(){
    apply();
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('parlay:viewchange',queueApply);
    window.addEventListener('hashchange',queueApply);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();