const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

const start = s.indexOf('function teamDisplayName(code,l)');
const endMarker = "document.addEventListener('change',e=>{if(e.target.matches('.team'))selectMatchingGameForTeam(e.target)});";
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('V12 readable option block not found');

const replacement = String.raw`function teamDisplayName(code,l){return TEAM_NAMES[l]?.[code]||code}
function gameDisplayName(value,l){const teams=gameTeams(value);return teams.length===2?teamDisplayName(teams[0],l)+' @ '+teamDisplayName(teams[1],l):value}
function splitGameLabel(text){
  const value=clean(text);
  const match=value.match(/^(.*?)(\s+(?:-|—)\s+.+)$/);
  return match?{base:clean(match[1]),suffix:match[2]}:{base:value,suffix:''};
}
function prepareGameOption(option,l){
  if(!option||!option.value||option.value===MAN)return;
  if(!option.dataset.fullLabel){
    const original=splitGameLabel(option.textContent);
    option.dataset.compactLabel=(original.base||option.value)+original.suffix;
    option.dataset.fullLabel=gameDisplayName(option.value,l)+original.suffix;
  }
}
function prepareTeamOption(option,l){
  if(!option||!option.value||option.value===MAN)return;
  option.dataset.compactLabel=option.value;
  option.dataset.fullLabel=teamDisplayName(option.value,l);
}
function applySelectLabels(sel,l,kind,expanded=false){
  if(!sel)return;
  [...sel.options].forEach(option=>{
    if(!option.value||option.value===MAN)return;
    if(kind==='game')prepareGameOption(option,l);else prepareTeamOption(option,l);
    option.textContent=expanded||option.value!==sel.value?option.dataset.fullLabel:option.dataset.compactLabel;
  });
}
function expandReadableSelect(sel){
  if(!sel)return;
  sel.dataset.readableExpanded='1';
  const leg=sel.closest('.leg');
  const l=leg?legLeague(leg):league();
  applySelectLabels(sel,l,sel.matches('.team')?'team':'game',true);
}
function collapseReadableSelect(sel){
  if(!sel)return;
  sel.dataset.readableExpanded='0';
  const leg=sel.closest('.leg');
  const l=leg?legLeague(leg):league();
  applySelectLabels(sel,l,sel.matches('.team')?'team':'game',false);
}
function selectMatchingGameForTeam(teamSel){if(!teamSel||!teamSel.value||teamSel.value===MAN)return;const leg=teamSel.closest('.leg');const gameSel=ttype()==='parlay'&&leg?leg.querySelector('.lgame'):$('ticketGame');if(!gameSel)return;const match=[...gameSel.options].find(o=>o.value&&o.value!==MAN&&gameTeams(o.value).includes(teamSel.value));if(!match)return;if(gameSel.value!==match.value){gameSel.value=match.value;gameSel.dispatchEvent(new Event('change',{bubbles:true}))}}
function refreshReadableOptions(){
  const ticketGameSel=$('ticketGame');
  applySelectLabels(ticketGameSel,league(),'game',ticketGameSel?.dataset.readableExpanded==='1');
  document.querySelectorAll('.leg').forEach(d=>{
    const l=legLeague(d),gameSel=d.querySelector('.lgame'),teamSel=d.querySelector('.team');
    applySelectLabels(gameSel,l,'game',gameSel?.dataset.readableExpanded==='1');
    applySelectLabels(teamSel,l,'team',teamSel?.dataset.readableExpanded==='1');
  });
  document.querySelectorAll('.team').forEach(selectMatchingGameForTeam);
}
const readableOptionsObserver=new MutationObserver(()=>requestAnimationFrame(refreshReadableOptions));
window.addEventListener('load',()=>{readableOptionsObserver.observe(document.body,{childList:true,subtree:true});requestAnimationFrame(refreshReadableOptions)});
document.addEventListener('pointerdown',e=>{if(e.target.matches('#ticketGame,.lgame,.team'))expandReadableSelect(e.target)},{capture:true});
document.addEventListener('touchstart',e=>{if(e.target.matches('#ticketGame,.lgame,.team'))expandReadableSelect(e.target)},{capture:true,passive:true});
document.addEventListener('focusin',e=>{if(e.target.matches('#ticketGame,.lgame,.team'))expandReadableSelect(e.target)});
document.addEventListener('change',e=>{if(e.target.matches('.team'))selectMatchingGameForTeam(e.target);if(e.target.matches('#ticketGame,.lgame,.team'))requestAnimationFrame(()=>collapseReadableSelect(e.target))});
document.addEventListener('focusout',e=>{if(e.target.matches('#ticketGame,.lgame,.team'))collapseReadableSelect(e.target)});`;

s = s.slice(0, start) + replacement + s.slice(end + endMarker.length);
fs.writeFileSync(path, s);
