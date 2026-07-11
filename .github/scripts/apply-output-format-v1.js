const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

const oldGenerate = 'function generate(){let o=canonicalTicket();$("output").value="const ticket = "+jsVal(o)+";";preview()}';
const newGenerate = `function formatTicket(o){
  const q=v=>JSON.stringify(v);
  const lines=['{',\`  title: \${q(o.title)},\`,\`  date: \${q(o.date)},\`,\`  type: \${q(o.type)},\`];
  if(o.game)lines.push(\`  game: \${q(o.game)},\`);
  lines.push('  legs: [');
  o.legs.forEach((leg,i)=>{
    const body=Object.entries(leg).map(([k,v])=>\`\${k}: \${q(v)}\`).join(', ');
    lines.push(\`    { \${body} }\${i<o.legs.length-1?',':''}\`);
  });
  lines.push('  ]','}');
  return lines.join('\\n');
}
function generate(){let o=canonicalTicket();$("output").value=formatTicket(o);preview()}`;

if(!s.includes(oldGenerate)) throw new Error('generate function target not found');
s = s.replace(oldGenerate, newGenerate);
fs.writeFileSync(path, s);