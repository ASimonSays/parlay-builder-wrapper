import {readFile,writeFile} from 'node:fs/promises';

const path='.visual-parity/apply.mjs';
let source=await readFile(path,'utf8');

function escapeSegment(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error(`Missing segment ${start}`);
  const segment=source.slice(a,b).replaceAll('${','\\${');
  source=source.slice(0,a)+segment+source.slice(b);
}
escapeSegment('const oldCard=`',"dashboard=replaceOnce(dashboard,oldCard,newCard,'ticket card');");
escapeSegment('const newSort=`',"dashboard=replaceBetween(dashboard,oldSortStart,oldSortEnd,newSort,'sort/filter method');");

await writeFile(path,source);
