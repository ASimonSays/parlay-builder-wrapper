const fs=require('fs');
const path='index.html';
let s=fs.readFileSync(path,'utf8');

const oldSpread=`  if(t==="spread")return [team,target].filter(Boolean).join(" ");\n  if(t==="f5_ml")return [team,"F5 Moneyline"].filter(Boolean).join(" ");\n  if(t==="f5_spread")return [team,"F5",target].filter(Boolean).join(" ");\n  if(t==="h1_ml")return [team,"H1 Moneyline"].filter(Boolean).join(" ");\n  if(t==="h1_spread")return [team,"H1",target].filter(Boolean).join(" ");`;
const newSpread=`  const signedTarget=target&&Number(target)>0?"+"+target:target;\n  if(t==="spread")return [team,signedTarget].filter(Boolean).join(" ");\n  if(t==="f5_ml")return [team,"F5 Moneyline"].filter(Boolean).join(" ");\n  if(t==="f5_spread")return [team,"F5",signedTarget].filter(Boolean).join(" ");\n  if(t==="h1_ml")return [team,"H1 Moneyline"].filter(Boolean).join(" ");\n  if(t==="h1_spread")return [team,"H1",signedTarget].filter(Boolean).join(" ");`;
if(!s.includes(oldSpread))throw new Error('spread label block not found');
s=s.replace(oldSpread,newSpread);

const oldTitle='function displayTitle(){return clean($("odds").value)||"Untitled"}function codeTitle(){let s=clean($("odds").value);return s.startsWith("+")?"＋"+s.slice(1):s||"Untitled"}';
const newTitle='function displayTitle(){return clean($("odds").value)||"Untitled"}function codeTitle(){let s=clean($("odds").value);if(!s)return"Untitled";return $("tracker").value==="worldcup"&&s.startsWith("+")?"＋"+s.slice(1):s}';
if(!s.includes(oldTitle))throw new Error('codeTitle block not found');
s=s.replace(oldTitle,newTitle);

fs.writeFileSync(path,s);
console.log('Phase 1 regression corrections applied.');
