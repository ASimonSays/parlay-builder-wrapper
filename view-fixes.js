/* PARLAY_VIEW_FIXES_V23 */
(() => {
  'use strict';

  function baseUrl(){ return location.href.split('#')[0]; }
  function goToHash(hash){
    const next=baseUrl()+hash;
    if(location.href===next){ location.reload(); return; }
    location.href=next;
  }

  // Keep ticket views inside the current app tab. This avoids hidden/background
  // named windows that iOS Safari may refuse to foreground on later taps.
  window.openSavedTicketView=id=>goToHash('#ticket='+encodeURIComponent(id));
  window.openActiveTicketsView=()=>goToHash('#view=active');
  window.closeStandaloneViewer=()=>goToHash('');

  function cleanStandaloneView(){
    // The live layer is now active, so the old placeholder note is obsolete.
    document.querySelectorAll('.phaseNote').forEach(el=>el.remove());

    // A second bootstrap path could briefly create two status rows. Keep only
    // the newest one.
    const statuses=[...document.querySelectorAll('#liveRefreshStatus')];
    statuses.slice(0,-1).forEach(el=>el.remove());

    // Team totals should read current / target, matching player milestones.
    document.querySelectorAll('.liveLeg').forEach(row=>{
      const label=row.querySelector('.liveLegLabel')?.textContent||'';
      if(!/team total/i.test(label))return;
      const value=row.querySelector('.liveLegValue');
      if(!value)return;
      const match=value.textContent.trim().match(/^(-?\d+(?:\.\d+)?)\s+[OU]\s+(-?\d+(?:\.\d+)?)$/i);
      if(match)value.textContent=`${match[1]} / ${match[2]}`;
    });
  }

  const observer=new MutationObserver(cleanStandaloneView);
  function start(){
    cleanStandaloneView();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
