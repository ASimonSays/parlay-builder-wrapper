/* ACTUAL_SETTLEMENT_TIME_V41 — event-ledger timestamps with one scheduled pass */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const SCHEDULE='https://statsapi.mlb.com/api/v1/schedule';
  const FEED='https://statsapi.mlb.com/api/v1.1/game';
  const cache=new Map();
  let running=false,runTimer=null;
  window.__actualSettlementTimeLoaded=true;

  function clean(v){return String(v??'').trim()}
  function norm(v){return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function store(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function dashDate(v){v=clean(v).replace(/\D/g,'').slice(0,8);return v.length===8?`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6)}`:v}
  function parts(game){const [away='',home='']=clean(game).split('@');return{away:away.toUpperCase(),home:home.toUpperCase()}}
  function teamCode(x){return clean(x?.team?.abbreviation||x?.abbreviation).toUpperCase()}
  function validTime(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString()}
  function playTime(play){return validTime(play?.about?.endTime)||validTime(play?.about?.startTime)}
  function plays(feed){return feed?.liveData?.plays?.allPlays||[]}
  function latestPlayTime(feed){const list=plays(feed);for(let i=list.length-1;i>=0;i--){const t=playTime(list[i]);if(t)return t}return''}
  function isFinal(feed){const s=feed?.gameData?.status||{};return s.abstractGameState==='Final'||/final|game over|completed/i.test(clean(s.detailedState))}
  function samePerson(person,name){const a=norm(person?.fullName||person?.fullNameLastFirst),b=norm(name);return Boolean(a&&b&&(a===b||a.includes(b)||b.includes(a)))}

  async function getFeed(date,game){
    const key=`${date}|${game}`;
    if(cache.has(key))return cache.get(key);
    const promise=(async()=>{
      const p=parts(game);
      const schedule=await fetch(`${SCHEDULE}?sportId=1&date=${encodeURIComponent(dashDate(date))}&hydrate=team`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Schedule ${r.status}`);return r.json()});
      const games=(schedule.dates||[]).flatMap(d=>d.games||[]);
      const match=games.find(g=>teamCode(g.teams?.away)===p.away&&teamCode(g.teams?.home)===p.home);
      if(!match?.gamePk)throw new Error('Game not found');
      return fetch(`${FEED}/${match.gamePk}/feed/live`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Feed ${r.status}`);return r.json()});
    })();
    cache.set(key,promise);
    try{return await promise}catch(e){cache.delete(key);throw e}
  }

  function findPlayer(feed,name){
    const wanted=norm(name),teams=feed?.liveData?.boxscore?.teams||{};
    const all=['away','home'].flatMap(side=>Object.values(teams[side]?.players||{}));
    return all.find(p=>norm(p?.person?.fullName)===wanted)||all.find(p=>norm(p?.person?.fullName).includes(wanted)||wanted.includes(norm(p?.person?.fullName)))||null;
  }

  function teamScore(play,feed,team){
    const away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase();
    return clean(team).toUpperCase()===away?Number(play?.result?.awayScore):Number(play?.result?.homeScore);
  }

  function totalBasesForEvent(type){
    type=clean(type).toLowerCase();
    if(type==='single')return 1;
    if(type==='double')return 2;
    if(type==='triple')return 3;
    if(type==='home_run')return 4;
    return 0;
  }

  function playerLedger(feed,name){
    const out=[];
    let hits=0,totalBases=0,runs=0,rbi=0,walks=0,homeRuns=0,stolenBases=0;
    for(const play of plays(feed)){
      const event=clean(play?.result?.eventType).toLowerCase();
      if(samePerson(play?.matchup?.batter,name)){
        const tb=totalBasesForEvent(event);
        if(tb){hits++;totalBases+=tb;if(event==='home_run')homeRuns++}
        if(event==='walk'||event==='intent_walk')walks++;
        rbi+=Number(play?.result?.rbi||0);
      }
      for(const runner of play?.runners||[]){
        if(!samePerson(runner?.details?.runner,name))continue;
        if(clean(runner?.movement?.end).toLowerCase()==='score'&&!runner?.movement?.isOut)runs++;
        const re=clean(runner?.details?.eventType||runner?.details?.event).toLowerCase();
        if(re.includes('stolen_base'))stolenBases++;
      }
      for(const ev of play?.playEvents||[]){
        const et=clean(ev?.details?.eventType||ev?.details?.event).toLowerCase();
        if(et.includes('stolen_base')&&samePerson(ev?.details?.runner,name))stolenBases++;
      }
      out.push({time:playTime(play),hits,totalBases,runs,rbi,walks,homeRuns,stolenBases,hrrbi:hits+runs+rbi,hwsb:hits+walks+stolenBases});
    }
    return out;
  }

  function pitcherLedger(feed,name){
    const out=[];
    let strikeouts=0,outs=0,lastIndex=-1;
    const list=plays(feed);
    for(let i=0;i<list.length;i++){
      const play=list[i];
      if(samePerson(play?.matchup?.pitcher,name)){
        lastIndex=i;
        if(clean(play?.result?.eventType).toLowerCase()==='strikeout')strikeouts++;
        outs+=Number(play?.count?.outs??0)===3?0:Number(play?.result?.outs||0);
        const outsOnPlay=Number(play?.count?.outs||0)-Number(play?.about?.startOuts||0);
        if(Number.isFinite(outsOnPlay)&&outsOnPlay>0)outs+=outsOnPlay;
      }
      out.push({time:playTime(play),strikeouts,outs});
    }
    return{rows:out,lastIndex,exitTime:pitcherExitTime(feed,name,lastIndex)};
  }

  function pitcherExitTime(feed,name,lastIndex){
    const list=plays(feed);
    if(lastIndex<0)return'';
    for(let i=lastIndex+1;i<list.length;i++){
      if(!samePerson(list[i]?.matchup?.pitcher,name))return validTime(list[i]?.about?.startTime)||playTime(list[i]);
    }
    const p=findPlayer(feed,name);
    if(p?.gameStatus?.isCurrentPitcher===false)return playTime(list[lastIndex]);
    return'';
  }

  function firstAt(rows,key,target,cmp=(v,t)=>v>=t){for(const row of rows)if(cmp(Number(row[key]||0),Number(target)))return row.time;return''}
  function finalTime(feed){return isFinal(feed)?latestPlayTime(feed):''}
  function f5Time(feed){
    const list=plays(feed).filter(p=>Number(p?.about?.inning)===5);
    for(let i=list.length-1;i>=0;i--){if(playTime(list[i]))return playTime(list[i])}
    return'';
  }

  function scoreThresholdTime(feed,leg,over){
    const target=Number(leg.target),type=clean(leg.type);
    for(const play of plays(feed)){
      const a=Number(play?.result?.awayScore),h=Number(play?.result?.homeScore);
      if(!Number.isFinite(a)||!Number.isFinite(h))continue;
      const current=type.startsWith('team_total')?teamScore(play,feed,leg.team):a+h;
      if(over?current>target:current>=target)return playTime(play);
    }
    return'';
  }

  function finalScore(feed,team){
    const line=feed?.liveData?.linescore?.teams||{};
    const away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase();
    return clean(team).toUpperCase()===away?Number(line.away?.runs||0):Number(line.home?.runs||0);
  }
  function opponentScore(feed,team){
    const line=feed?.liveData?.linescore?.teams||{};
    const away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase();
    return clean(team).toUpperCase()===away?Number(line.home?.runs||0):Number(line.away?.runs||0);
  }

  function settleLeg(leg,feed){
    const type=clean(leg.type),target=Number(leg.target),player=leg.player;
    const end=finalTime(feed);
    if(type==='void')return{status:'VOID',settledAt:end,reason:'Void finalized'};
    if(type==='manual')return{status:'PENDING',settledAt:'',reason:'Manual'};

    if(['player_hits','player_total_bases','player_runs','player_hr','player_rbi','player_walks','player_stolen_bases','player_hrrbi','player_hwsb'].includes(type)){
      const key={player_hits:'hits',player_total_bases:'totalBases',player_runs:'runs',player_hr:'homeRuns',player_rbi:'rbi',player_walks:'walks',player_stolen_bases:'stolenBases',player_hrrbi:'hrrbi',player_hwsb:'hwsb'}[type];
      const time=firstAt(playerLedger(feed,player),key,target);
      if(time)return{status:'WIN',settledAt:time,reason:`${key} target reached`};
      if(end)return{status:'LOSS',settledAt:end,reason:'Game final below target'};
      return{status:'LIVE',settledAt:'',reason:''};
    }

    if(type==='pitcher_ks'){
      const ledger=pitcherLedger(feed,player),time=firstAt(ledger.rows,'strikeouts',target);
      if(time)return{status:'WIN',settledAt:time,reason:'Strikeout target reached'};
      if(ledger.exitTime)return{status:'LOSS',settledAt:ledger.exitTime,reason:'Pitcher removed below target'};
      if(end)return{status:'LOSS',settledAt:end,reason:'Game final below target'};
      return{status:'LIVE',settledAt:'',reason:''};
    }

    if(type==='pitcher_ks_under'){
      const ledger=pitcherLedger(feed,player),loss=firstAt(ledger.rows,'strikeouts',target);
      if(loss)return{status:'LOSS',settledAt:loss,reason:'Strikeout under exceeded'};
      if(ledger.exitTime)return{status:'WIN',settledAt:ledger.exitTime,reason:'Pitcher removed under target'};
      if(end)return{status:'WIN',settledAt:end,reason:'Game final under target'};
      return{status:'LIVE',settledAt:'',reason:''};
    }

    if(type==='pitcher_outs_under'){
      const ledger=pitcherLedger(feed,player),loss=firstAt(ledger.rows,'outs',target);
      if(loss)return{status:'LOSS',settledAt:loss,reason:'Outs under exceeded'};
      if(ledger.exitTime)return{status:'WIN',settledAt:ledger.exitTime,reason:'Pitcher removed under target'};
      if(end)return{status:'WIN',settledAt:end,reason:'Game final under target'};
      return{status:'LIVE',settledAt:'',reason:''};
    }

    if(['team_total_over','total_over'].includes(type)){
      const time=scoreThresholdTime(feed,leg,true);
      if(time)return{status:'WIN',settledAt:time,reason:'Over threshold crossed'};
      if(end)return{status:'LOSS',settledAt:end,reason:'Game final below over'};
      return{status:'LIVE',settledAt:'',reason:''};
    }

    if(['team_total_under','total_under'].includes(type)){
      const loss=scoreThresholdTime(feed,leg,false);
      if(loss)return{status:'LOSS',settledAt:loss,reason:'Under threshold crossed'};
      if(end)return{status:'WIN',settledAt:end,reason:'Game final under target'};
      return{status:'LIVE',settledAt:'',reason:''};
    }

    if(['ml','spread'].includes(type)){
      if(!end)return{status:'LIVE',settledAt:'',reason:''};
      const mine=finalScore(feed,leg.team),opp=opponentScore(feed,leg.team),adjusted=type==='spread'?mine+target:mine;
      return{status:adjusted>opp?'WIN':adjusted<opp?'LOSS':'VOID',settledAt:end,reason:'Game final'};
    }

    if(['f5_ml','f5_spread','f5_total_over','f5_total_under'].includes(type)){
      const time=f5Time(feed);
      if(!time)return{status:'LIVE',settledAt:'',reason:''};
      const innings=feed?.liveData?.linescore?.innings||[];
      let a=0,h=0;for(const x of innings)if(Number(x.num)<=5){a+=Number(x.away?.runs||0);h+=Number(x.home?.runs||0)}
      if(type==='f5_total_over'||type==='f5_total_under'){
        const total=a+h,over=type==='f5_total_over';
        return{status:over?(total>target?'WIN':total<target?'LOSS':'VOID'):(total<target?'WIN':total>target?'LOSS':'VOID'),settledAt:time,reason:'First five complete'};
      }
      const away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase(),mine=clean(leg.team).toUpperCase()===away?a:h,opp=clean(leg.team).toUpperCase()===away?h:a,adjusted=type==='f5_spread'?mine+target:mine;
      return{status:adjusted>opp?'WIN':adjusted<opp?'LOSS':'VOID',settledAt:time,reason:'First five complete'};
    }

    return{status:end?'UNAVAILABLE':'LIVE',settledAt:'',reason:'Unsupported settlement mapping'};
  }

  function pickTicketSettlement(results,outcome){
    const settled=results.filter(r=>r.settledAt);
    if(outcome==='LOST'){
      const losses=settled.filter(r=>r.status==='LOSS');
      if(!losses.length)return null;
      return losses.reduce((a,b)=>new Date(a.settledAt)<=new Date(b.settledAt)?a:b);
    }
    if(outcome==='WON'){
      const required=settled.filter(r=>r.status==='WIN');
      if(!required.length)return null;
      return required.reduce((a,b)=>new Date(a.settledAt)>=new Date(b.settledAt)?a:b);
    }
    if(outcome==='PUSH'){
      if(!settled.length)return null;
      return settled.reduce((a,b)=>new Date(a.settledAt)>=new Date(b.settledAt)?a:b);
    }
    return null;
  }

  async function evaluateRecordTimes(record){
    const ticket=record.ticket||{},results=[];
    for(let i=0;i<(ticket.legs||[]).length;i++){
      const leg=ticket.legs[i],game=leg.game||ticket.game,date=leg.date||ticket.date,league=leg.league||ticket.league;
      if((league&&league!=='MLB')||!game||!date){results.push({index:i,status:'UNAVAILABLE',settledAt:'',reason:'No MLB feed'});continue}
      try{const feed=await getFeed(date,game);results.push({index:i,...settleLeg(leg,feed)})}
      catch{results.push({index:i,status:'UNAVAILABLE',settledAt:'',reason:'Feed unavailable'})}
    }
    const outcome=clean(record.liveOutcome).toUpperCase();
    return{results,ticketSettlement:pickTicketSettlement(results,outcome)};
  }

  function formatStamp(value){return new Date(value).toLocaleString([], {year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})}
  function refreshVisibleStamps(list){
    if(!location.hash){if(typeof window.renderTicketDashboard==='function')window.renderTicketDashboard();return}
    const params=new URLSearchParams(location.hash.slice(1)),id=params.get('ticket'),active=params.get('view')==='active';
    const records=id?list.filter(r=>r.id===id):active?list.filter(r=>r.status!=='completed'||document.querySelector('.liveTicketCard')):[];
    [...document.querySelectorAll('#standaloneView .liveTicketCard')].forEach((card,i)=>{
      const r=records[i];card.querySelector('.settlementStamp')?.remove();if(!r?.settledAt)return;
      const stamp=document.createElement('div');stamp.className='settlementStamp';stamp.textContent='Settled '+formatStamp(r.settledAt);
      card.querySelector('.liveSummary')?.insertAdjacentElement('beforebegin',stamp);
    });
  }

  async function run(){
    if(running)return;running=true;
    try{
      const list=load();let changed=false;
      for(const record of list){
        if(!['WON','LOST','PUSH'].includes(clean(record.liveOutcome).toUpperCase()))continue;
        const evaluated=await evaluateRecordTimes(record),settlement=evaluated.ticketSettlement;
        const compact=evaluated.results.map(r=>({index:r.index,status:r.status,settledAt:r.settledAt||null,settlementReason:r.reason||''}));
        if(JSON.stringify(record.legSettlements)!==JSON.stringify(compact)){record.legSettlements=compact;changed=true}
        if(settlement){
          if(record.settledAt!==settlement.settledAt){record.settledAt=settlement.settledAt;changed=true}
          record.settlementSource='mlb-prop-ledger';
          record.settlementReason=settlement.reason||'';
          record.settlementLegIndexes=evaluated.results.filter(r=>r.status===settlement.status&&r.settledAt===settlement.settledAt).map(r=>r.index);
        }else if(record.autoCompleted&&record.settlementSource!=='manual'){
          if(record.settledAt){delete record.settledAt;changed=true}
          record.settlementSource='unavailable';
        }
      }
      if(changed)store(list);
      refreshVisibleStamps(list);
    }finally{running=false}
  }

  function schedule(delay=0){clearTimeout(runTimer);runTimer=setTimeout(run,delay)}
  window.__runActualSettlementTime=run;
  window.__scheduleActualSettlementTime=schedule;
  window.addEventListener('load',()=>schedule(0),{once:true});
  window.addEventListener('hashchange',()=>schedule(0));
  document.addEventListener('parlay:settlement-status-updated',()=>schedule(0));
  if(document.readyState!=='loading')schedule(0);
})();
