import {readFile,writeFile} from 'node:fs/promises';

const path='.visual-parity/apply.mjs';
let source=await readFile(path,'utf8');

const oldChecks='panel.querySelector(`input[name="dashboard-sort"][value="${this.state.sort}"]`)?.setAttribute(\'checked\',\'\');panel.querySelector(`input[name="dashboard-direction"][value="${this.state.direction}"]`)?.setAttribute(\'checked\',\'\');panel.querySelector(`input[name="dashboard-filter"][value="${this.state.filter}"]`)?.setAttribute(\'checked\',\'\');';
const newChecks='const sort=panel.querySelector(`input[name="dashboard-sort"][value="${this.state.sort}"]`),direction=panel.querySelector(`input[name="dashboard-direction"][value="${this.state.direction}"]`),filter=panel.querySelector(`input[name="dashboard-filter"][value="${this.state.filter}"]`);if(sort)sort.checked=true;if(direction)direction.checked=true;if(filter)filter.checked=true;';
if(!source.includes(oldChecks))throw new Error('Missing sort/filter initialization block');
source=source.replace(oldChecks,newChecks);

function escapeSegment(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error(`Missing segment ${start}`);
  const segment=source.slice(a,b).replaceAll('${','\\${');
  source=source.slice(0,a)+segment+source.slice(b);
}
escapeSegment('const oldCard=`',"dashboard=replaceOnce(dashboard,oldCard,newCard,'ticket card');");
escapeSegment('const newSort=`',"dashboard=replaceBetween(dashboard,oldSortStart,oldSortEnd,newSort,'sort/filter method');");

await writeFile(path,source);
