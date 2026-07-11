const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

const marker = '/* NATIVE_DATE_WIDTH_FIX_V1 */';
const css = `
${marker}
.grid2>div{min-width:0;max-width:100%}
input[type="date"]{display:block;width:100%;max-width:100%;min-width:0;inline-size:100%;max-inline-size:100%;min-inline-size:0;box-sizing:border-box;padding-left:6px;padding-right:6px;font-size:12px}
input[type="date"]::-webkit-date-and-time-value{min-width:0;text-align:left}
`;

s = s.replace(/\/\* NATIVE_DATE_WIDTH_FIX_V1 \*\/[\s\S]*?(?=<\/style>)/g, '');
if (!s.includes('</style>')) throw new Error('closing style tag not found');
s = s.replace('</style>', css + '\n</style>');
fs.writeFileSync(path, s);