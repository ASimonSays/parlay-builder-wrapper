const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

const marker = '/* NATIVE_DATE_WIDTH_FIX_V2 */';
const css = `
${marker}
.grid2,
.grid2 > * {
  min-width: 0;
}

input,
select,
textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

input[type="date"] {
  appearance: none;
  -webkit-appearance: none;
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
`;

s = s.replace(/\/\* NATIVE_DATE_WIDTH_FIX_V1 \*\/[\s\S]*?(?=<\/style>)/g, '');
s = s.replace(/\/\* NATIVE_DATE_WIDTH_FIX_V2 \*\/[\s\S]*?(?=<\/style>)/g, '');
if (!s.includes('</style>')) throw new Error('closing style tag not found');
s = s.replace('</style>', css + '\n</style>');
fs.writeFileSync(path, s);
