(() => {
  'use strict';
  const C=window.ParlayTrackerCore;
  const SCHEDULE='https://statsapi.mlb.com/api/v1/schedule';
  const FEED='https://statsapi.mlb.com/api/v1.1/game';
  const ESPN='https://site.api.espn.com/apis/site/v2/sports';
  const cache=new Map();
  const clean=value=>String(value??'').trim();
  const norm=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const validTime=value=>{const date=new Date(value||'');return Number.isNaN(date.getTime())?'':date.toISOString()};
  const dashDate=value=>{const text=clean(value).replace(/\D/g,'').slice(0,8);return text.length===8?`${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6)}`:text};
  const gameParts=game=>{const [away='',home='']=clean(game).split('@');return{away:away.toUpperCase(),home:home.toUpperCase()}};
  const effectiveLeague=(ticket,leg={})=>clean(leg.league||ticket.league||'MLB').toUpperCase();
  const supportedLeague=league=>['MLB','NBA','WNBA'].includes(clean(league).toUpperCase());
  const instanceValue=(ticket,leg,name)=>C.instanceValue?C.instanceValue(ticket,leg,name):(leg?.[name]??ticket?.[name]);
  const startKey=raw=>C.gameStartCT?C.gameStartCT({date:raw}):'';
  async function json(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
  function cacheRequest(key,loader){if(cache.has(key))return cache.get(key);const promise=Promise.resolve().then(loader).catch(error=>{cache.delete(key);throw error});cache.set(key,promise);return promise}
  function chooseInstance(candidates,ticket,leg,record,idOf,dateOf){
    if(!candidates.length)return null;
    const sorted=[...candidates].sort((a,b)=>new Date(dateOf(a)||0)-new Date(dateOf(b)||0));
    const explicitPk=Number(instanceValue(ticket,leg,'gamePk'));if(Number.isFinite(explicitPk)){const exact=sorted.find(item=>Number(idOf(item))===explicitPk);if(exact)return exact}
    const explicitId=clean(instanceValue(ticket,leg,'gameId'));if(explicitId){const exact=sorted.find(item=>clean(idOf(item))===explicitId);if(exact)return exact}
    const wantedStart=clean(instanceValue(ticket,leg,'gameStart'));if(wantedStart){const exact=sorted.find(item=>startKey(dateOf(item))===wantedStart);if(exact)return exact}
    const ordinal=Number(instanceValue(ticket,leg,'gameNumber'));if(Number.isInteger(ordinal)&&ordinal>=1&&ordinal<=sorted.length)return sorted[ordinal-1];
    const reference=new Date(instanceValue(ticket,leg,'gameSavedAt')||record.savedAt||record.createdAt||record.updatedAt||'').getTime();
    if(Number.isFinite(reference)){return sorted.reduce((best,item)=>{const time=new Date(dateOf(item)||'').getTime();if(!Number.isFinite(time))return best;const distance=Math.abs(time-reference);return !best||distance<best.distance?{item,distance}:best},null)?.item||sorted[0]}
    return sorted[0];
  }
  function mlbTeamMatches(team,abbr){return C.teamMatches?C.teamMatches(team||{},abbr):clean(team?.abbreviation).toUpperCase()===clean(abbr).toUpperCase()}
  async function getMlbFeed(record,ticket,leg){
    const date=leg.date||ticket.date,game=leg.game||ticket.game,{away,home}=gameParts(game);
    const key=['mlb',date,game,record.id,instanceValue(ticket,leg,'gamePk'),instanceValue(ticket,leg,'gameId'),instanceValue(ticket,leg,'gameStart'),instanceValue(ticket,leg,'gameNumber')].join('|');
    return cacheRequest(key,async()=>{
      const schedule=await json(`${SCHEDULE}?sportId=1&date=${encodeURIComponent(dashDate(date))}&hydrate=team`);
      const candidates=(schedule.dates||[]).flatMap(item=>item.games||[]).filter(item=>mlbTeamMatches(item.teams?.away?.team,away)&&mlbTeamMatches(item.teams?.home?.team,home));
      const selected=chooseInstance(candidates,ticket,leg,record,item=>item.gamePk,item=>item.gameDate);
      if(!selected?.gamePk)throw new Error('MLB game not found');
      return json(`${FEED}/${selected.gamePk}/feed/live`);
    });
  }
  const basketballPath=league=>league==='NBA'?'basketball/nba':'basketball/wnba';
  function espnTeamMatches(team,abbr){return C.teamMatches?C.teamMatches(team||{},abbr):clean(team?.abbreviation).toUpperCase()===clean(abbr).toUpperCase()}
  async function getBasketballSummary(record,ticket,leg,league){
    const date=leg.date||ticket.date,game=leg.game||ticket.game,{away,home}=gameParts(game),path=basketballPath(league);
    const key=[league,date,game,record.id,instanceValue(ticket,leg,'gameId'),instanceValue(ticket,leg,'gameStart'),instanceValue(ticket,leg,'gameNumber')].join('|');
    return cacheRequest(key,async()=>{
      const board=await json(`${ESPN}/${path}/scoreboard?dates=${encodeURIComponent(clean(date).replace(/\D/g,''))}&limit=100`);
      const candidates=(board.events||[]).filter(event=>{const sides=event?.competitions?.[0]?.competitors||[],a=sides.find(side=>side.homeAway==='away'),h=sides.find(side=>side.homeAway==='home');return espnTeamMatches(a?.team,away)&&espnTeamMatches(h?.team,home)});
      const selected=chooseInstance(candidates,ticket,leg,record,event=>event.id,event=>event.date);
      if(!selected?.id)throw new Error('Basketball game not found');
      return json(`${ESPN}/${path}/summary?event=${encodeURIComponent(selected.id)}`);
    });
  }
  const mlbPlays=feed=>feed?.liveData?.plays?.allPlays||[];
  const playTime=play=>validTime(play?.about?.endTime)||validTime(play?.about?.startTime);
  const latestMlbTime=feed=>{const list=mlbPlays(feed);for(let i=list.length-1;i>=0;i--){const time=playTime(list[i]);if(time)return time}return''};
  const mlbFinal=feed=>{const status=feed?.gameData?.status||{};return status.abstractGameState==='Final'||/final|game over|completed/i.test(clean(status.detailedState))};
  const samePerson=(person,name)=>{const a=norm(person?.fullName||person?.fullNameLastFirst),b=norm(name);return Boolean(a&&b&&(a===b||a.includes(b)||b.includes(a)))};
  function firstAt(rows,key,target,compare=(value,needed)=>value>=needed){for(const row of rows)if(compare(Number(row[key]||0),Number(target)))return row.time;return''}
  function totalBases(event){return({single:1,double:2,triple:3,home_run:4})[clean(event).toLowerCase()]||0}
  function playerLedger(feed,name){
    const rows=[];let hits=0,totalBasesValue=0,runs=0,rbi=0,walks=0,homeRuns=0,stolenBases=0;
    for(const play of mlbPlays(feed)){
      const event=clean(play?.result?.eventType).toLowerCase();
      if(samePerson(play?.matchup?.batter,name)){const bases=totalBases(event);if(bases){hits++;totalBasesValue+=bases;if(event==='home_run')homeRuns++}if(event==='walk'||event==='intent_walk')walks++;rbi+=Number(play?.result?.rbi||0)}
      for(const runner of play?.runners||[]){if(!samePerson(runner?.details?.runner,name))continue;if(clean(runner?.movement?.end).toLowerCase()==='score'&&!runner?.movement?.isOut)runs++;const type=clean(runner?.details?.eventType||runner?.details?.event).toLowerCase();if(type.includes('stolen_base'))stolenBases++}
      rows.push({time:playTime(play),hits,totalBases:totalBasesValue,runs,rbi,walks,homeRuns,stolenBases,hrrbi:hits+runs+rbi,hwsb:hits+walks+stolenBases});
    }
    return rows;
  }
  function findMlbPlayer(feed,name){const wanted=norm(name),teams=feed?.liveData?.boxscore?.teams||{},all=['away','home'].flatMap(side=>Object.values(teams[side]?.players||{}));return all.find(player=>norm(player?.person?.fullName)===wanted)||all.find(player=>norm(player?.person?.fullName).includes(wanted)||wanted.includes(norm(player?.person?.fullName)))||null}
  function pitcherExitTime(feed,name,lastIndex){const list=mlbPlays(feed);if(lastIndex<0)return'';for(let i=lastIndex+1;i<list.length;i++)if(!samePerson(list[i]?.matchup?.pitcher,name))return validTime(list[i]?.about?.startTime)||playTime(list[i]);const player=findMlbPlayer(feed,name);return player?.gameStatus?.isCurrentPitcher===false?playTime(list[lastIndex]):''}
  function pitcherLedger(feed,name){const rows=[];let strikeouts=0,outs=0,lastIndex=-1;const list=mlbPlays(feed);for(let i=0;i<list.length;i++){const play=list[i];if(samePerson(play?.matchup?.pitcher,name)){lastIndex=i;if(clean(play?.result?.eventType).toLowerCase()==='strikeout')strikeouts++;const delta=Number(play?.count?.outs||0)-Number(play?.about?.startOuts||0);if(Number.isFinite(delta)&&delta>0)outs+=delta}rows.push({time:playTime(play),strikeouts,outs})}return{rows,exitTime:pitcherExitTime(feed,name,lastIndex)}}
  function mlbTeamScore(play,feed,team){const away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase();return clean(team).toUpperCase()===away?Number(play?.result?.awayScore):Number(play?.result?.homeScore)}
  function scoreThresholdTime(feed,leg,over){const target=Number(leg.target),teamMarket=clean(leg.type).startsWith('team_total');for(const play of mlbPlays(feed)){const away=Number(play?.result?.awayScore),home=Number(play?.result?.homeScore);if(!Number.isFinite(away)||!Number.isFinite(home))continue;const current=teamMarket?mlbTeamScore(play,feed,leg.team):away+home;if(over?current>target:current>=target)return playTime(play)}return''}
  function mlbFinalScores(feed,team){const line=feed?.liveData?.linescore?.teams||{},away=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase(),mine=clean(team).toUpperCase()===away?Number(line.away?.runs||0):Number(line.home?.runs||0),opp=clean(team).toUpperCase()===away?Number(line.home?.runs||0):Number(line.away?.runs||0);return{mine,opp}}
  function f5Time(feed){const list=mlbPlays(feed).filter(play=>Number(play?.about?.inning)===5);for(let i=list.length-1;i>=0;i--){const time=playTime(list[i]);if(time)return time}return''}
  function settleMlbLeg(leg,feed){
    const type=clean(leg.type),target=Number(leg.target),end=mlbFinal(feed)?latestMlbTime(feed):'';
    if(type==='void')return{status:'VOID',settledAt:end,reason:'Void finalized'};
    if(type==='manual')return{status:'PENDING',settledAt:'',reason:'Manual'};
    const playerKey={player_hits:'hits',player_total_bases:'totalBases',player_runs:'runs',player_hr:'homeRuns',player_rbi:'rbi',player_walks:'walks',player_stolen_bases:'stolenBases',player_hrrbi:'hrrbi',player_hwsb:'hwsb'}[type];
    if(playerKey){const time=firstAt(playerLedger(feed,leg.player),playerKey,target);if(time)return{status:'WIN',settledAt:time,reason:`${playerKey} target reached`};return end?{status:'LOSS',settledAt:end,reason:'Game final below target'}:{status:'LIVE',settledAt:'',reason:''}}
    if(type==='pitcher_ks'){const ledger=pitcherLedger(feed,leg.player),time=firstAt(ledger.rows,'strikeouts',target);if(time)return{status:'WIN',settledAt:time,reason:'Strikeout target reached'};if(ledger.exitTime)return{status:'LOSS',settledAt:ledger.exitTime,reason:'Pitcher removed below target'};return end?{status:'LOSS',settledAt:end,reason:'Game final below target'}:{status:'LIVE',settledAt:'',reason:''}}
    if(type==='pitcher_ks_under'||type==='pitcher_outs_under'){const ledger=pitcherLedger(feed,leg.player),key=type==='pitcher_ks_under'?'strikeouts':'outs',loss=firstAt(ledger.rows,key,target);if(loss)return{status:'LOSS',settledAt:loss,reason:`${key} under exceeded`};if(ledger.exitTime)return{status:'WIN',settledAt:ledger.exitTime,reason:'Pitcher removed under target'};return end?{status:'WIN',settledAt:end,reason:'Game final under target'}:{status:'LIVE',settledAt:'',reason:''}}
    if(['team_total_over','total_over'].includes(type)){const time=scoreThresholdTime(feed,leg,true);if(time)return{status:'WIN',settledAt:time,reason:'Over threshold crossed'};return end?{status:'LOSS',settledAt:end,reason:'Game final below over'}:{status:'LIVE',settledAt:'',reason:''}}
    if(['team_total_under','total_under'].includes(type)){const loss=scoreThresholdTime(feed,leg,false);if(loss)return{status:'LOSS',settledAt:loss,reason:'Under threshold crossed'};return end?{status:'WIN',settledAt:end,reason:'Game final under target'}:{status:'LIVE',settledAt:'',reason:''}}
    if(['ml','spread'].includes(type)){if(!end)return{status:'LIVE',settledAt:'',reason:''};const {mine,opp}=mlbFinalScores(feed,leg.team),adjusted=type==='spread'?mine+target:mine;return{status:adjusted>opp?'WIN':adjusted<opp?'LOSS':'VOID',settledAt:end,reason:'Game final'}}
    if(['f5_ml','f5_spread','f5_total_over','f5_total_under'].includes(type)){const time=f5Time(feed);if(!time)return{status:'LIVE',settledAt:'',reason:''};const innings=feed?.liveData?.linescore?.innings||[];let away=0,home=0;for(const inning of innings)if(Number(inning.num)<=5){away+=Number(inning.away?.runs||0);home+=Number(inning.home?.runs||0)}if(type.startsWith('f5_total')){const total=away+home,over=type==='f5_total_over';return{status:over?(total>target?'WIN':total<target?'LOSS':'VOID'):(total<target?'WIN':total>target?'LOSS':'VOID'),settledAt:time,reason:'First five complete'}}const awayCode=clean(feed?.gameData?.teams?.away?.abbreviation).toUpperCase(),mine=clean(leg.team).toUpperCase()===awayCode?away:home,opp=clean(leg.team).toUpperCase()===awayCode?home:away,adjusted=type==='f5_spread'?mine+target:mine;return{status:adjusted>opp?'WIN':adjusted<opp?'LOSS':'VOID',settledAt:time,reason:'First five complete'}}
    return{status:end?'UNAVAILABLE':'LIVE',settledAt:'',reason:'Unsupported MLB settlement mapping'};
  }
  const basketballPlays=summary=>summary?.plays||[];
  const basketballTime=play=>validTime(play?.wallclock);
  function basketballFinalTime(summary){if(!summary?.header?.competitions?.[0]?.status?.type?.completed)return'';const list=basketballPlays(summary);for(let i=list.length-1;i>=0;i--){const time=basketballTime(list[i]);if(time)return time}return''}
  function basketballSides(summary){const competitors=summary?.header?.competitions?.[0]?.competitors||[];return{away:competitors.find(side=>side.homeAway==='away')?.team||{},home:competitors.find(side=>side.homeAway==='home')?.team||{}}}
  function basketballScore(play,summary,team){return espnTeamMatches(basketballSides(summary).away,team)?Number(play?.awayScore):Number(play?.homeScore)}
  function basketballOpponent(play,summary,team){return espnTeamMatches(basketballSides(summary).away,team)?Number(play?.homeScore):Number(play?.awayScore)}
  function basketballPlayerLedger(summary,name){const wanted=norm(name),rows=[];let points=0,rebounds=0,assists=0,threes=0,blocks=0;for(const play of basketballPlays(summary)){const text=clean(play?.text),normalized=norm(text),primary=Boolean(wanted&&normalized.startsWith(wanted));if(primary&&play?.scoringPlay){points+=Number(play?.scoreValue||0);if(Number(play?.scoreValue)===3)threes++}if(primary&&/\brebound\b/i.test(text))rebounds++;if(wanted&&normalized.includes(wanted+'assists'))assists++;if(wanted&&normalized.includes(wanted+'blocks'))blocks++;rows.push({time:basketballTime(play),points,rebounds,assists,threes,blocks,pr:points+rebounds,pa:points+assists,ra:rebounds+assists,pra:points+rebounds+assists,doubleCount:[points,rebounds,assists].filter(value=>value>=10).length})}return rows}
  function basketballThresholdTime(summary,leg,over){const target=Number(leg.target),teamMarket=clean(leg.type).startsWith('team_total');for(const play of basketballPlays(summary)){const away=Number(play?.awayScore),home=Number(play?.homeScore);if(!Number.isFinite(away)||!Number.isFinite(home))continue;const current=teamMarket?basketballScore(play,summary,leg.team):away+home;if(over?current>target:current>=target)return basketballTime(play)}return''}
  function settleBasketballLeg(leg,summary){
    const type=clean(leg.type),target=Number(leg.target),end=basketballFinalTime(summary);
    if(type==='void')return{status:'VOID',settledAt:end,reason:'Void finalized'};
    if(type==='manual')return{status:'PENDING',settledAt:'',reason:'Manual'};
    const key={player_points:'points',player_rebounds:'rebounds',player_assists:'assists',player_threes:'threes',player_blocks:'blocks',player_points_rebounds:'pr',player_pr:'pr',player_points_assists:'pa',player_pa:'pa',player_rebounds_assists:'ra',player_ra:'ra',player_points_rebounds_assists:'pra',player_pra:'pra',player_double_double:'doubleCount',player_triple_double:'doubleCount'}[type];
    if(key){const needed=type==='player_double_double'?2:type==='player_triple_double'?3:target,time=firstAt(basketballPlayerLedger(summary,leg.player),key,needed);if(time)return{status:'WIN',settledAt:time,reason:`${key} target reached`};return end?{status:'LOSS',settledAt:end,reason:'Game final below target'}:{status:'LIVE',settledAt:'',reason:''}}
    if(['team_total_over','total_over'].includes(type)){const time=basketballThresholdTime(summary,leg,true);if(time)return{status:'WIN',settledAt:time,reason:'Over threshold crossed'};return end?{status:'LOSS',settledAt:end,reason:'Game final below over'}:{status:'LIVE',settledAt:'',reason:''}}
    if(['team_total_under','total_under'].includes(type)){const loss=basketballThresholdTime(summary,leg,false);if(loss)return{status:'LOSS',settledAt:loss,reason:'Under threshold crossed'};return end?{status:'WIN',settledAt:end,reason:'Game final under target'}:{status:'LIVE',settledAt:'',reason:''}}
    if(['ml','spread'].includes(type)){if(!end)return{status:'LIVE',settledAt:'',reason:''};const last=basketballPlays(summary).at(-1),mine=basketballScore(last,summary,leg.team),opp=basketballOpponent(last,summary,leg.team),adjusted=type==='spread'?mine+target:mine;return{status:adjusted>opp?'WIN':adjusted<opp?'LOSS':'VOID',settledAt:end,reason:'Game final'}}
    return{status:end?'UNAVAILABLE':'LIVE',settledAt:'',reason:'Unsupported basketball settlement mapping'};
  }
  function chooseTicketSettlement(results,outcome){const settled=results.filter(result=>result.settledAt);if(outcome==='LOST'){const losses=settled.filter(result=>result.status==='LOSS');return losses.reduce((best,item)=>!best||new Date(item.settledAt)<new Date(best.settledAt)?item:best,null)}if(outcome==='WON'){const wins=settled.filter(result=>result.status==='WIN');return wins.reduce((best,item)=>!best||new Date(item.settledAt)>new Date(best.settledAt)?item:best,null)}if(outcome==='PUSH')return settled.reduce((best,item)=>!best||new Date(item.settledAt)>new Date(best.settledAt)?item:best,null);return null}
  async function resolve(record,outcome){
    const ticket=record.ticket||{},results=[];
    for(let index=0;index<(ticket.legs||[]).length;index++){
      const leg=ticket.legs[index],league=effectiveLeague(ticket,leg),game=leg.game||ticket.game,date=leg.date||ticket.date;
      if(!supportedLeague(league)||!game||!date){results.push({index,status:'UNAVAILABLE',settledAt:'',reason:'No supported event feed'});continue}
      try{const result=league==='MLB'?settleMlbLeg(leg,await getMlbFeed(record,ticket,leg)):settleBasketballLeg(leg,await getBasketballSummary(record,ticket,leg,league));results.push({index,ledger:league==='MLB'?'mlb':'basketball',...result})}catch{results.push({index,status:'UNAVAILABLE',settledAt:'',reason:'Feed unavailable'})}
    }
    return{results,ticketSettlement:chooseTicketSettlement(results,clean(outcome).toUpperCase())};
  }
  async function apply(record,outcome){const resolved=await resolve(record,outcome),compact=resolved.results.map(result=>({index:result.index,status:result.status,settledAt:result.settledAt||null,settlementReason:result.reason||''}));record.legSettlements=compact;const settlement=resolved.ticketSettlement;if(settlement){record.settledAt=settlement.settledAt;record.settlementSource=settlement.ledger==='basketball'?'basketball-event-ledger':'mlb-prop-ledger';record.settlementReason=settlement.reason||'';record.settlementLegIndexes=resolved.results.filter(result=>result.status===settlement.status&&result.settledAt===settlement.settledAt).map(result=>result.index)}return record}
  function reset(){cache.clear()}
  window.ParlaySettlementService=Object.freeze({apply,resolve,reset,supportedLeague});
})();
