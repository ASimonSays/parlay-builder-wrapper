/* MLB live runtime bootstrap V23 */
(async()=>{
  'use strict';
  try{
    const response=await fetch('./mlb-live.js?v=23',{cache:'no-store'});
    if(!response.ok)throw new Error('MLB runtime HTTP '+response.status);
    let code=await response.text();
    const oldInit="window.addEventListener('load',()=>setTimeout(wireRefresh,0));";
    const newInit="if(document.readyState==='loading'){window.addEventListener('load',()=>setTimeout(wireRefresh,0),{once:true})}else{setTimeout(wireRefresh,0);setTimeout(wireRefresh,250)}";
    if(!code.includes(oldInit))throw new Error('MLB runtime initialization marker missing');
    code=code.replace(oldInit,newInit)+'\n//# sourceURL=mlb-live-runtime-v23.js';
    (0,eval)(code);
  }catch(error){
    console.error('MLB live runtime failed to initialize',error);
    const show=()=>{
      const box=document.getElementById('standaloneView');
      if(!box||!location.hash)return;
      let status=document.getElementById('liveRefreshStatus');
      if(!status){status=document.createElement('div');status.id='liveRefreshStatus';status.className='liveRefreshStatus bad';const tools=box.querySelector('.standaloneTools');if(tools)tools.insertAdjacentElement('afterend',status)}
      if(status)status.textContent='Live tracker failed to initialize: '+String(error.message||error);
    };
    document.readyState==='loading'?window.addEventListener('load',show,{once:true}):show();
  }
})();
