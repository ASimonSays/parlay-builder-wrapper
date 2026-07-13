/* PARLAY_VIEW_FIXES_V28 */
(() => {
  'use strict';

  function baseUrl(){ return location.href.split('#')[0]; }
  function goToHash(hash){
    const next=baseUrl()+hash;
    if(location.href===next){ window.dispatchEvent(new CustomEvent('parlay:viewchange')); return; }
    location.href=next;
  }

  window.openSavedTicketView=id=>goToHash('#ticket='+encodeURIComponent(id));
  window.openActiveTicketsView=()=>goToHash('#view=active');
  window.closeStandaloneViewer=()=>goToHash('');

  function addHeaderCss(){
    if(document.getElementById('parlayHeaderLogoCss'))return;
    const style=document.createElement('style');
    style.id='parlayHeaderLogoCss';
    style.textContent=`
      body:not(.standaloneCompactHeader) .top{
        padding:10px 12px 8px!important;
        margin-bottom:10px!important;
      }
      body:not(.standaloneCompactHeader) .top .logo{
        display:block!important;
        width:min(420px,88vw)!important;
        max-height:96px!important;
        object-fit:contain!important;
        margin:0 auto 3px!important;
        filter:drop-shadow(0 5px 8px rgba(0,0,0,.22))!important;
      }
      body:not(.standaloneCompactHeader) .top h1{
        margin:2px 0 0!important;
      }
      body:not(.standaloneCompactHeader) .top p{
        margin:2px 0 0!important;
      }
      body.standaloneCompactHeader .top{padding:5px 12px 4px!important;margin-bottom:8px!important}
      body.standaloneCompactHeader .top .logo{
        display:block!important;
        width:min(138px,34vw)!important;
        max-height:62px!important;
        object-fit:contain!important;
        margin:0 auto!important;
        filter:drop-shadow(0 4px 7px rgba(0,0,0,.22))!important
      }
      body.standaloneCompactHeader .top h1,
      body.standaloneCompactHeader .top p{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function syncHeaderLogo(){
    addHeaderCss();
    const logo=document.querySelector('.top .logo');
    const inTicketView=Boolean(location.hash);
    document.body.classList.toggle('standaloneCompactHeader',inTicketView);
    if(!logo)return;
    if(inTicketView){
      logo.src='./ssb_emblem_webapp_box_transparent_768.png?v=ticket-view-28';
      logo.alt='Simon Sports Betting emblem';
    }else{
      logo.src='./simon-sports-betting-nameplate.png?v=nameplate-28';
      logo.alt='Simon Sports Betting';
    }
  }

  function cleanStandaloneView(){
    syncHeaderLogo();
    document.querySelectorAll('.phaseNote').forEach(el=>el.remove());

    const statuses=[...document.querySelectorAll('#liveRefreshStatus')];
    statuses.slice(0,-1).forEach(el=>el.remove());

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
    window.addEventListener('hashchange',()=>setTimeout(cleanStandaloneView,0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();