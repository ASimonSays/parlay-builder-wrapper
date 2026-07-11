const fs=require('fs');
const path='index.html';
let s=fs.readFileSync(path,'utf8');
const old='function isPlayer(t){return t.startsWith("player_")||t.startsWith("pitcher_")}function needsTarget(t){return !["ml","ml_et","to_qualify","draw","h1_draw","btts_yes","btts_no","manual","void","player_double_double","player_triple_double"].includes(t)}';
const next='function isPlayer(t){return t.startsWith("player_")||t.startsWith("pitcher_")}function needsTarget(t){return !["ml","ml_et","to_qualify","f5_ml","h1_ml","draw","h1_draw","btts_yes","btts_no","manual","void","player_double_double","player_triple_double"].includes(t)}';
if(!s.includes(old)) throw new Error('needsTarget block not found');
s=s.replace(old,next);

const typesMatch=s.match(/const types=(\{.*?\});\nconst label=/s);
if(!typesMatch) throw new Error('types block not found');
const types=Function('return '+typesMatch[1])();
const mainTracker=new Set(['ml','spread','f5_ml','f5_spread','f5_total_over','f5_total_under','h1_ml','h1_spread','team_total_over','total_over','total_under','pitcher_outs_under','pitcher_ks','pitcher_ks_under','player_hits','player_total_bases','player_runs','player_hr','player_rbi','player_walks','player_stolen_bases','player_hwsb','player_hrrbi','player_points','player_rebounds','player_assists','player_points_rebounds','player_pr','player_points_assists','player_pa','player_rebounds_assists','player_ra','player_points_rebounds_assists','player_pra','player_double_double','player_triple_double','player_blocks','player_threes','manual','void']);
const wcTracker=new Set(['ml','ml_et','to_qualify','spread','draw','h1_ml','h1_spread','h1_draw','h1_total_over','h1_total_under','h2_total_over','h2_total_under','team_total_over','team_total_under','total_over','total_under','btts_yes','btts_no','player_goal','player_goal_et','player_assist','player_goal_or_assist','player_shots','player_sot','player_fouls','player_fouls_drawn','player_tackles','player_cards','team_corners_over','team_corners_under','team_cards_over','team_cards_under','match_corners_over','match_corners_under','match_cards_over','match_cards_under','team_shots_over','team_shots_under','match_shots_over','match_shots_under','team_sot_over','team_sot_under','match_sot_over','match_sot_under','team_sot_half_over','team_sot_half_under','manual','void']);
for(const league of ['MLB','NBA','WNBA']) for(const t of types[league]) if(!mainTracker.has(t)) throw new Error(`${league} unsupported tracker type: ${t}`);
for(const t of types.WC) if(!wcTracker.has(t)) throw new Error(`WC unsupported tracker type: ${t}`);
const noTarget=new Set(['ml','ml_et','to_qualify','f5_ml','h1_ml','draw','h1_draw','btts_yes','btts_no','manual','void','player_double_double','player_triple_double']);
for(const league of Object.keys(types)) for(const t of types[league]){
  const configuredNone=!s.includes(`if(t==='${t}')return{mode:`) && !s.includes(`${t}:numRange`) && !['spread','f5_spread','h1_spread','f5_total_over','f5_total_under','total_over','total_under','team_total_over','team_total_under','h1_total_over','h1_total_under','h2_total_over','h2_total_under','team_corners_over','team_corners_under','match_corners_over','match_corners_under','team_cards_over','team_cards_under','match_cards_over','match_cards_under','team_shots_over','team_shots_under','match_shots_over','match_shots_under','team_sot_over','team_sot_under','team_sot_half_over','team_sot_half_under','match_sot_over','match_sot_under','pitcher_ks_under','pitcher_outs_under'].includes(t);
  if(noTarget.has(t)!==configuredNone) throw new Error(`target configuration mismatch for ${t}`);
}
fs.writeFileSync(path,s);
console.log('Leg-type parity and target validation checks passed.');
