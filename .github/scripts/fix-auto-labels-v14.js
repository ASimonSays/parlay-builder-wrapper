const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

const oldNeedsTeam = 'function isPlayer(t){return t.startsWith("player_")||t.startsWith("pitcher_")}function needsTarget(t){return !["ml","ml_et","to_qualify","draw","h1_draw","btts_yes","btts_no","manual","void","player_double_double","player_triple_double"].includes(t)}function needsTeam(t){return !isPlayer(t)&&!["manual","void","draw","h1_draw","btts_yes","btts_no","total_over","total_under","h1_total_over","h1_total_under","h2_total_over","h2_total_under","match_corners_over","match_corners_under","match_cards_over","match_cards_under","match_shots_over","match_shots_under","match_sot_over","match_sot_under"].includes(t)}';
const newNeedsTeam = 'function isPlayer(t){return t.startsWith("player_")||t.startsWith("pitcher_")}function needsTarget(t){return !["ml","ml_et","to_qualify","draw","h1_draw","btts_yes","btts_no","manual","void","player_double_double","player_triple_double"].includes(t)}function needsTeam(t){return !isPlayer(t)&&!["manual","void","draw","h1_draw","btts_yes","btts_no","f5_total_over","f5_total_under","total_over","total_under","h1_total_over","h1_total_under","h2_total_over","h2_total_under","match_corners_over","match_corners_under","match_cards_over","match_cards_under","match_shots_over","match_shots_under","match_sot_over","match_sot_under"].includes(t)}';
if (!s.includes(oldNeedsTeam)) throw new Error('needsTeam block not found');
s = s.replace(oldNeedsTeam, newNeedsTeam);

const oldLegChunk = '<div class="targetBox"><label>Target / Line</label><input class="target"></div><div class="labelBox">';
const newLegChunk = '<div class="targetBox"><label>Target / Line</label><input class="target"></div><div class="halfBox hide"><label>Half</label><select class="half"><option value="1">1st Half</option><option value="2">2nd Half</option></select></div><div class="labelBox">';
if (!s.includes(oldLegChunk)) throw new Error('leg target chunk not found');
s = s.replace(oldLegChunk, newLegChunk);

const oldTargetBind = 'div.querySelector(".target").addEventListener("input",()=>{autoFillLabel(div);preview()});div.querySelector(".lbl")';
const newTargetBind = 'div.querySelector(".target").addEventListener("input",()=>{autoFillLabel(div);preview()});div.querySelector(".half").addEventListener("change",()=>{autoFillLabel(div);preview()});div.querySelector(".lbl")';
if (!s.includes(oldTargetBind)) throw new Error('target binding not found');
s = s.replace(oldTargetBind, newTargetBind);

const oldRefresh = 'd.querySelector(".targetBox").classList.toggle("hide",!needsTarget(t));showManual';
const newRefresh = 'd.querySelector(".targetBox").classList.toggle("hide",!needsTarget(t));d.querySelector(".halfBox").classList.toggle("hide",!["team_sot_half_over","team_sot_half_under"].includes(t));showManual';
if (!s.includes(oldRefresh)) throw new Error('refresh leg target block not found');
s = s.replace(oldRefresh, newRefresh);

const start = s.indexOf('function autoLabel(d){');
const end = s.indexOf('\nfunction displayTitle()', start);
if (start < 0 || end < 0) throw new Error('autoLabel block not found');
const autoLabel = `function autoLabel(d){
  const t=d.querySelector(".ltype").value;
  const team=legTeam(d),player=legPlayer(d),target=clean(d.querySelector(".target").value);
  const half=d.querySelector(".half")?.value||"1";
  const ou=t.endsWith("_under")?"U":"O";
  if(t==="manual")return clean(d.querySelector(".lbl").value);
  if(t==="void")return "VOID";
  if(t==="draw")return "Draw";
  if(t==="h1_draw")return "H1 Draw";
  if(t==="btts_yes")return "BTTS Yes";
  if(t==="btts_no")return "BTTS No";
  if(t==="player_double_double")return [player,"Double Double"].filter(Boolean).join(" ");
  if(t==="player_triple_double")return [player,"Triple Double"].filter(Boolean).join(" ");
  if(t==="pitcher_ks_under")return [player,target?"U"+target:"","K"].filter(Boolean).join(" ");
  if(t==="pitcher_outs_under")return [player,target?"U"+target:"","Outs"].filter(Boolean).join(" ");
  if(isPlayer(t)){
    const suffix={
      pitcher_ks:"K",player_hits:"H",player_total_bases:"TB",player_runs:"R",player_hr:"HR",player_rbi:"RBI",player_walks:"BB",player_stolen_bases:"SB",player_hwsb:"H+BB+SB",player_hrrbi:"H+R+RBI",
      player_points:"PTS",player_rebounds:"REB",player_assists:"AST",player_points_rebounds:"P+R",player_pr:"P+R",player_points_assists:"P+A",player_pa:"P+A",player_rebounds_assists:"R+A",player_ra:"R+A",player_points_rebounds_assists:"PRA",player_pra:"PRA",player_blocks:"BLK",player_threes:"3PM",
      player_goal:"Goal",player_goal_et:"Goal incl. ET",player_assist:"Assist",player_goal_or_assist:"G/A",player_shots:"Shots",player_sot:"SOT",player_fouls:"Fouls",player_fouls_drawn:"Fouls Drawn",player_tackles:"Tackles",player_cards:"Cards"
    }[t]||label[t]||t;
    return [player,target?target+"+":"",suffix].filter(Boolean).join(" ");
  }
  if(t==="ml")return [team,"Moneyline"].filter(Boolean).join(" ");
  if(t==="ml_et")return [team,"Moneyline incl. ET"].filter(Boolean).join(" ");
  if(t==="to_qualify")return [team,"To Qualify"].filter(Boolean).join(" ");
  if(t==="spread")return [team,target].filter(Boolean).join(" ");
  if(t==="f5_ml")return [team,"F5 Moneyline"].filter(Boolean).join(" ");
  if(t==="f5_spread")return [team,"F5",target].filter(Boolean).join(" ");
  if(t==="h1_ml")return [team,"H1 Moneyline"].filter(Boolean).join(" ");
  if(t==="h1_spread")return [team,"H1",target].filter(Boolean).join(" ");
  if(t==="total_over"||t==="total_under")return target?ou+target:"";
  if(t==="f5_total_over"||t==="f5_total_under")return ["F5",target?ou+target:""].filter(Boolean).join(" ");
  if(t==="h1_total_over"||t==="h1_total_under")return ["H1",target?ou+target:""].filter(Boolean).join(" ");
  if(t==="h2_total_over"||t==="h2_total_under")return ["H2",target?ou+target:""].filter(Boolean).join(" ");
  const teamMarkets={team_total_over:"Team Total",team_total_under:"Team Total",team_corners_over:"Corners",team_corners_under:"Corners",team_cards_over:"Cards",team_cards_under:"Cards",team_shots_over:"Shots",team_shots_under:"Shots",team_sot_over:"SOT",team_sot_under:"SOT"};
  if(teamMarkets[t])return [team,target?ou+target:"",teamMarkets[t]].filter(Boolean).join(" ");
  if(t==="team_sot_half_over"||t==="team_sot_half_under")return [team,half+"H",target?ou+target:"","SOT"].filter(Boolean).join(" ");
  const matchMarkets={match_corners_over:"Corners",match_corners_under:"Corners",match_cards_over:"Cards",match_cards_under:"Cards",match_shots_over:"Shots",match_shots_under:"Shots",match_sot_over:"SOT",match_sot_under:"SOT"};
  if(matchMarkets[t])return [target?ou+target:"",matchMarkets[t]].filter(Boolean).join(" ");
  return label[t]||t;
}`;
s = s.slice(0,start)+autoLabel+s.slice(end);

const oldRaw = 'let team=legTeam(d),player=legPlayer(d),target=clean(d.querySelector(".target").value);if(team)leg.team=team;if(player)leg.player=player;if(target)leg.target=isNaN(Number(target))?target:Number(target);o.legs.push(leg)';
const newRaw = 'let team=legTeam(d),player=legPlayer(d),target=clean(d.querySelector(".target").value),half=d.querySelector(".half")?.value;if(team)leg.team=team;if(player)leg.player=player;if(target)leg.target=isNaN(Number(target))?target:Number(target);if(["team_sot_half_over","team_sot_half_under"].includes(t))leg.half=Number(half||1);o.legs.push(leg)';
if (!s.includes(oldRaw)) throw new Error('rawTicket leg fields not found');
s = s.replace(oldRaw,newRaw);

const oldCanonical = 'if(l.target!==undefined&&l.target!==null&&l.target!=="")leg.target=l.target;out.legs.push(leg)';
const newCanonical = 'if(l.target!==undefined&&l.target!==null&&l.target!=="")leg.target=l.target;if(l.half!==undefined)leg.half=l.half;out.legs.push(leg)';
if (!s.includes(oldCanonical)) throw new Error('canonical target block not found');
s = s.replace(oldCanonical,newCanonical);

fs.writeFileSync(path,s);
