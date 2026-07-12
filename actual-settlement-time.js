/* ACTUAL_SETTLEMENT_TIME_V39 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const SCHEDULE='https://statsapi.mlb.com/api/v1/schedule';
  const FEED='https://statsapi.mlb.com/api/v1.1/game';
  const cache=new Map();
  let running=false;

  function clean(v){return String(v??'').trim()}
  function norm(v){return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function store(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function dashDate(v){v=clean(v).replace(/\D/g,'').slice(0,8);return v.length===8?`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6)}`:v}
  function parts(game){const [away='',home='']=clean(game).split('@');return{away:away.toUpperCase(),home:home.toUpperCase()}}
  function teamCode(x){return clean(x?.team?.abbreviation||x?.abbreviation).toUpperCase()}
  function validTime(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString()}
  function playTime(play){return validTime(play?.about?.endTime)||validTime(play?.about?.startTime)}
  function latestPlayTime(feed){const plays=feed?.liveData?.plays?.allPlays||[];for(let i=plays.length-1;i>=0;i--){const t=playTime(plays[i]);if(t)return t}return''}
  function isFinal(feed){const s=feed?.gameData?.status||{};return s.abstractGameState==='Final'||/final|game over|completed/i.test(clean(s.detailedState))}

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
    const wanted=norm(name);
    const teams=feed?.liveData?.boxscore?.teams||{};
    const players=['away','home'].flatMap(side=>Object.values(teams[side]?.players||{}));
    return players.find(p=>norm(p?.person?.fullName)===wanted)||players.find(p=>norm(p?.person?.fullName).includes(wanted)||wanted.includes(norm(p?.person?.fullName)))||null;
  }

  function samePerson(person,name){const a=norm(person?.fullName||person?.fullNameLastFirst),b=norm(name);return Boolean(a&&b&&(a===b||a.includes(b)||b.includes(a)))}

  function pitcherExitTime(feed,name){
    const plays=feed?.liveData?.plays?.allPlays||[];
    let last=-1;
    for(let i=0;i<plays.length;i++)if(samePerson(plays[i]?.matchup?.pitcher,name))last=i;
    if(last<0)return'';
    for(let i=last+1;i<plays.length;i++){const t=validTime(plays[i]?.about?.startTime)||playTime(plays[i]);if(t)return t}
    return playTime(plays[last]);
  }

  function firstPitcherStrikeoutTime(feed,name,target){
    let count=0;
    for(const play of feed?.liveData?.plays?.allPlays||[]){
      if(!samePerson(play?.matchup?.pitcher,name))continue;
      if(clean(play?.result?.eventType).toLowerCase()==='strikeout')count++;
      if(count>=Number(target))return playTime(play);
    }
    return'';
  }

  function scoreForTeam(play,feed,team){
    const away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase();
    const code=clean(team).toUpperCase();
    return code===away?Number(play?.result?.awayScore):Number(play?.result?.homeScore);
  }

  function firstScoreThresholdTime(feed,leg){
    const target=Number(leg.target);
    for(const play of feed?.liveData?.plays?.allPlays||[]){
      const a=Number(play?.result?.awayScore),h=Number(play?.result?.homeScore);
      if(!Number.isFinite(a)||!Number.isFinite(h))continue;
      const type=clean(leg.type);
      if(type==='team_total_over'&&scoreForTeam(play,feed,leg.team)>target)return playTime(play);
      if(type==='team_total_under'&&scoreForTeam(play,feed,leg.team)>=target)return playTime(play);
      if(type==='total_over'&&a+h>target)return playTime(play);
      if(type==='total_under'&&a+h>=target)return playTime(play);
    }
    return'';
  }

  function legCandidate(record,leg,feed,outcome){
    const type=clean(leg.type),target=Number(leg.target),player=leg.player;
    const p=findPlayer(feed,player),pitch=p?.stats?.pitching||{};
    if(outcome==='LOST'){
      if(type==='pitcher_ks'&&Number(pitch.strikeOuts||0)<target&&p&&p.gameStatus?.isCurrentPitcher===false)return pitcherExitTime(feed,player);
      if(type==='pitcher_ks_under'&&Number(pitch.strikeOuts||0)>=target)return firstPitcherStrikeoutTime(feed,player,target);
      if(['team_total_under','total_under'].includes(type))return firstScoreThresholdTime(feed,leg);
      if(isFinal(feed))return latestPlayTime(feed);
      return'';
    }
    if(outcome==='WON'){
      if(type==='pitcher_ks')return firstPitcherStrikeoutTime(feed,player,target);
      if(['team_total_over','total_over'].includes(type))return firstScoreThresholdTime(feed,leg);
      if(isFinal(feed))return latestPlayTime(feed);
      return'';
    }
    if(outcome==='PUSH'&&isFinal(feed))return latestPlayTime(feed);
    return'';
  }

  function pickTime(times,outcome){
    const values=times.filter(Boolean).map(x=>new Date(x).getTime()).filter(Number.isFinite);
    if(!values.length)return'';
    const ms=outcome==='LOST'?Math.min(...values):Math.max(...values);
    return new Date(ms).toISOString();
  }

  async function actualTimeFor(record){
    const outcome=clean(record.liveOutcome).toUpperCase();
    if(!['WON','LOST','PUSH'].includes(outcome))return'';
    const ticket=record.ticket||{},legs=ticket.legs||[];
    const candidates=[];
    for(const leg of legs){
      const game=leg.game||ticket.game,date=leg.date||ticket.date;
      const league=leg.league||ticket.league;
      if((league&&league!=='MLB')||!game||!date)continue;
      try{
        const feed=await getFeed(date,game);
        const t=legCandidate(record,leg,feed,outcome);
        if(t)candidates.push(t);
      }catch{}
    }
    if(!candidates.length&&ticket.game&&ticket.date){
      try{const feed=await getFeed(ticket.date,ticket.game);if(isFinal(feed))candidates.push(latestPlayTime(feed))}catch{}
    }
    return pickTime(candidates,outcome);
  }

  function refreshVisibleStamps(list){
    if(!location.hash){if(typeof window.renderTicketDashboard==='function')window.renderTicketDashboard();return}
    const params=new URLSearchParams(location.hash.slice(1));
    const id=params.get('ticket');
    const active=params.get('view')==='active';
    const records=id?list.filter(r=>r.id===id):active?list.filter(r=>r.status!=='completed'||document.querySelector('.liveTicketCard')):[];
    const cards=[...document.querySelectorAll('#standaloneView .liveTicketCard')];
    cards.forEach((card,i)=>{
      const r=records[i];if(!r?.settledAt)return;
      let stamp=card.querySelector('.settlementStamp');
      if(!stamp){stamp=document.createElement('div');stamp.className='settlementStamp';card.querySelector('.liveSummary')?.insertAdjacentElement('beforebegin',stamp)}
      stamp.textContent='Settled '+new Date(r.settledAt).toLocaleString([], {year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'});
    });
  }

  async function run(){
    if(running)return;
    running=true;
    try{
      const list=load();
      let changed=false;
      for(const record of list){
        if(!['WON','LOST','PUSH'].includes(clean(record.liveOutcome).toUpperCase()))continue;
        const actual=await actualTimeFor(record);
        if(actual&&record.settledAt!==actual){record.settledAt=actual;record.settlementSource='mlb-feed';changed=true}
        else if(!actual&&record.autoCompleted&&record.settlementSource!=='mlb-feed'&&record.settledAt){delete record.settledAt;record.settlementSource='unavailable';changed=true}
      }
      if(changed)store(list);
      refreshVisibleStamps(list);
    }finally{running=false}
  }

  function schedule(){setTimeout(run,1200);setTimeout(run,3200)}
  window.addEventListener('load',schedule);
  window.addEventListener('hashchange',schedule);
  document.addEventListener('click',e=>{if(/^refresh$/i.test(clean(e.target?.textContent)))schedule()},true);
})();