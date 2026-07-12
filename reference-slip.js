/* REFERENCE_SLIP_V49 */
(() => {
  'use strict';

  let objectUrl='';
  let collapsed=false;
  let docked=false;
  let dockPosition='bottom';
  let gesture=null;
  let floatFrame=0;
  let floatVisible=false;

  const css=`
    .referenceSlipCard{position:relative}
    .referenceSlipHead{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .referenceSlipTitle{font-weight:900;letter-spacing:.06em}
    .referenceSlipActions{display:flex;gap:7px;flex-wrap:wrap}
    .referenceSlipActions button{width:auto;min-width:0;padding:8px 10px}
    .referenceSlipInput{display:none}
    .referenceSlipEmpty{margin-top:10px;padding:18px 12px;border:1px dashed rgba(70,80,95,.34);border-radius:10px;text-align:center;color:#657080;font-size:12px}
    .referenceSlipStage{margin-top:10px;border-radius:11px;overflow:hidden;background:#111;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);contain:paint}
    .referenceSlipStage img{display:block;width:100%;max-height:58vh;object-fit:contain;background:#111}
    .referenceSlipCard.isCollapsed .referenceSlipStage,.referenceSlipCard.isCollapsed .referenceSlipEmpty{display:none}
    .referenceSlipName{margin-top:7px;color:#687383;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .referenceSlipFloat{position:fixed;z-index:145;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));width:92px;height:92px;padding:0;border:2px solid rgba(255,255,255,.9);border-radius:12px;overflow:hidden;background:#111;box-shadow:0 8px 24px rgba(0,0,0,.38);touch-action:none;contain:layout paint}
    .referenceSlipFloat img{display:block;width:100%;height:100%;object-fit:cover}
    .referenceSlipFloatLabel{position:absolute;left:0;right:0;bottom:0;padding:4px 3px;background:rgba(0,0,0,.72);color:#fff;font-size:8px;font-weight:900;letter-spacing:.04em;text-align:center}
    .referenceSlipFloat.isDocked{left:10px;right:10px;width:auto;height:min(38vh,340px);border-radius:14px;display:block;overflow:hidden}
    .referenceSlipFloat.isDocked.dockTop{top:calc(8px + env(safe-area-inset-top));bottom:auto}
    .referenceSlipFloat.isDocked.dockBottom{top:auto;bottom:calc(8px + env(safe-area-inset-bottom))}
    .referenceSlipFloat.isDocked img{object-fit:contain;background:#111}
    .referenceSlipFloat.isDocked .referenceSlipFloatLabel{top:0;bottom:auto;padding:5px 8px;background:rgba(0,0,0,.64);font-size:9px}
    .referenceSlipFloat.hide{display:none!important}
    .referenceSlipOverlay{position:fixed;inset:0;z-index:220;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))}
    .referenceSlipOverlay.hide{display:none!important}
    .referenceSlipOverlay img{display:block;max-width:100%;max-height:100%;object-fit:contain}
    .referenceSlipClose{position:fixed;z-index:221;top:calc(10px + env(safe-area-inset-top));right:10px;width:44px;height:44px;padding:0;border-radius:50%;font-size:22px;background:rgba(255,255,255,.92);color:#111}
    body.referenceSlipOpen{overflow:hidden}
  `;

  function addCss(){
    if(document.getElementById('referenceSlipCss'))return;
    const style=document.createElement('style');
    style.id='referenceSlipCss';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function builderVisible(){
    const odds=document.getElementById('odds');
    return Boolean(odds&&odds.offsetParent!==null);
  }

  function setFloatVisible(show){
    const floater=document.getElementById('referenceSlipFloat');
    if(!floater)return;
    show=Boolean(show);
    if(show===floatVisible)return;
    floatVisible=show;
    floater.classList.toggle('hide',!show);
  }

  function applyDockState(){
    const floater=document.getElementById('referenceSlipFloat');
    if(!floater)return;
    floater.classList.toggle('isDocked',docked);
    floater.classList.toggle('dockTop',docked&&dockPosition==='top');
    floater.classList.toggle('dockBottom',docked&&dockPosition==='bottom');
    const label=floater.querySelector('.referenceSlipFloatLabel');
    if(label)label.textContent=docked?'TAP TO MINIMIZE · SWIPE UP/DOWN TO MOVE':'OPEN SLIP';
  }

  function updateFloatNow(){
    const card=document.getElementById('referenceSlipCard');
    if(!card||!objectUrl||!builderVisible()){setFloatVisible(false);return}
    if(docked){applyDockState();setFloatVisible(true);return}
    const rect=card.getBoundingClientRect();
    const offscreen=rect.bottom<70||rect.top>window.innerHeight-30;
    applyDockState();
    setFloatVisible(offscreen);
  }

  function scheduleFloatUpdate(){
    if(floatFrame)return;
    floatFrame=requestAnimationFrame(()=>{floatFrame=0;updateFloatNow()});
  }

  function expandDock(){if(!objectUrl)return;docked=true;applyDockState();scheduleFloatUpdate()}
  function minimizeDock(){docked=false;applyDockState();scheduleFloatUpdate()}
  function moveDock(position){dockPosition=position==='top'?'top':'bottom';docked=true;applyDockState();setFloatVisible(true)}

  function openLarge(){
    if(!objectUrl)return;
    const image=document.getElementById('referenceSlipOverlayImg');
    if(image)image.src=objectUrl;
    document.getElementById('referenceSlipOverlay')?.classList.remove('hide');
    document.body.classList.add('referenceSlipOpen');
  }

  function closeLarge(){
    document.getElementById('referenceSlipOverlay')?.classList.add('hide');
    document.body.classList.remove('referenceSlipOpen');
    const image=document.getElementById('referenceSlipOverlayImg');
    if(image)image.removeAttribute('src');
  }

  function clearSlip(){
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl='';collapsed=false;docked=false;dockPosition='bottom';floatVisible=false;
    const input=document.getElementById('referenceSlipInput');
    if(input)input.value='';
    document.getElementById('referenceSlipCard')?.classList.remove('isCollapsed');
    document.getElementById('referenceSlipStage')?.classList.add('hide');
    document.getElementById('referenceSlipLoadedActions')?.classList.add('hide');
    document.getElementById('referenceSlipEmpty')?.classList.remove('hide');
    const name=document.getElementById('referenceSlipName');if(name)name.textContent='';
    const main=document.getElementById('referenceSlipImage');if(main)main.removeAttribute('src');
    const floating=document.getElementById('referenceSlipFloatImage');if(floating)floating.removeAttribute('src');
    document.getElementById('referenceSlipFloat')?.classList.add('hide');
    applyDockState();
    closeLarge();
  }

  function loadFile(file){
    if(!file)return;
    if(!file.type.startsWith('image/')){alert('Choose an image screenshot.');return}
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(file);
    collapsed=false;docked=false;dockPosition='bottom';floatVisible=false;
    document.getElementById('referenceSlipCard')?.classList.remove('isCollapsed');
    document.getElementById('referenceSlipImage').src=objectUrl;
    document.getElementById('referenceSlipFloatImage').src=objectUrl;
    document.getElementById('referenceSlipEmpty')?.classList.add('hide');
    document.getElementById('referenceSlipStage')?.classList.remove('hide');
    document.getElementById('referenceSlipLoadedActions')?.classList.remove('hide');
    document.getElementById('referenceSlipName').textContent=file.name||'Reference screenshot';
    document.getElementById('referenceSlipCollapse').textContent='Collapse';
    applyDockState();
    scheduleFloatUpdate();
  }

  function toggleCollapse(){
    if(!objectUrl)return;
    collapsed=!collapsed;
    document.getElementById('referenceSlipCard')?.classList.toggle('isCollapsed',collapsed);
    document.getElementById('referenceSlipCollapse').textContent=collapsed?'Expand':'Collapse';
    scheduleFloatUpdate();
  }

  function beginGesture(e){
    if(!objectUrl||(e.pointerType==='mouse'&&e.button!==0))return;
    gesture={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function moveGesture(e){
    if(!gesture||e.pointerId!==gesture.pointerId)return;
    gesture.lastX=e.clientX;gesture.lastY=e.clientY;
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>10)gesture.moved=true;
    if(gesture.moved)e.preventDefault();
  }
  function endGesture(e){
    if(!gesture||e.pointerId!==gesture.pointerId)return;
    const dx=gesture.lastX-gesture.startX,dy=gesture.lastY-gesture.startY,moved=gesture.moved;
    gesture=null;
    if(moved&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>=38){moveDock(dy<0?'top':'bottom');return}
    if(!moved){if(docked)minimizeDock();else expandDock()}
  }
  function cancelGesture(){gesture=null}

  function install(){
    if(document.getElementById('referenceSlipCard'))return true;
    const odds=document.getElementById('odds');
    const anchor=odds?.closest('.card');
    if(!anchor||!anchor.parentNode)return false;
    addCss();

    const card=document.createElement('section');
    card.id='referenceSlipCard';
    card.className='card builderOnly referenceSlipCard';
    if(!builderVisible())card.classList.add('hide');
    card.innerHTML=`
      <div class="referenceSlipHead">
        <div class="referenceSlipTitle">REFERENCE SLIP</div>
        <div class="referenceSlipActions">
          <button id="referenceSlipUpload" type="button">Upload Slip</button>
          <span id="referenceSlipLoadedActions" class="referenceSlipActions hide">
            <button id="referenceSlipCollapse" class="ghost" type="button">Collapse</button>
            <button id="referenceSlipLarge" class="ghost" type="button">Open Large</button>
            <button id="referenceSlipClear" class="ghost" type="button">Clear</button>
          </span>
        </div>
      </div>
      <input id="referenceSlipInput" class="referenceSlipInput" type="file" accept="image/*">
      <div id="referenceSlipEmpty" class="referenceSlipEmpty">Upload a betslip screenshot and keep it visible while completing the builder.</div>
      <div id="referenceSlipStage" class="referenceSlipStage hide"><img id="referenceSlipImage" alt="Uploaded betslip reference"></div>
      <div id="referenceSlipName" class="referenceSlipName"></div>`;
    anchor.parentNode.insertBefore(card,anchor);

    const floater=document.createElement('button');
    floater.id='referenceSlipFloat';
    floater.type='button';
    floater.className='referenceSlipFloat hide';
    floater.innerHTML='<img id="referenceSlipFloatImage" alt="Reference slip thumbnail"><span class="referenceSlipFloatLabel">OPEN SLIP</span>';
    document.body.appendChild(floater);

    const overlay=document.createElement('div');
    overlay.id='referenceSlipOverlay';
    overlay.className='referenceSlipOverlay hide';
    overlay.innerHTML='<img id="referenceSlipOverlayImg" alt="Reference slip enlarged"><button id="referenceSlipClose" class="referenceSlipClose" type="button" aria-label="Close">×</button>';
    document.body.appendChild(overlay);

    const input=document.getElementById('referenceSlipInput');
    document.getElementById('referenceSlipUpload').onclick=()=>input.click();
    document.getElementById('referenceSlipCollapse').onclick=toggleCollapse;
    document.getElementById('referenceSlipLarge').onclick=openLarge;
    document.getElementById('referenceSlipClear').onclick=clearSlip;
    floater.addEventListener('pointerdown',beginGesture);
    floater.addEventListener('pointermove',moveGesture,{passive:false});
    floater.addEventListener('pointerup',endGesture);
    floater.addEventListener('pointercancel',cancelGesture);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeLarge()});
    document.getElementById('referenceSlipClose').onclick=closeLarge;
    input.addEventListener('change',()=>loadFile(input.files?.[0]));
    window.addEventListener('scroll',scheduleFloatUpdate,{passive:true});
    window.addEventListener('resize',scheduleFloatUpdate,{passive:true});
    window.addEventListener('hashchange',()=>setTimeout(scheduleFloatUpdate,0));
    return true;
  }

  const start=()=>{
    if(install())return;
    let tries=0;const timer=setInterval(()=>{if(install()||++tries>40)clearInterval(timer)},250);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
