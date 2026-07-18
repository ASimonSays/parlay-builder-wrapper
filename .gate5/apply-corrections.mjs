import { access, readFile, writeFile } from 'node:fs/promises';

async function replaceOnce(path,search,replacement){
  const source=await readFile(path,'utf8');
  const first=source.indexOf(search);
  if(first<0)throw new Error(`${path}: expected source fragment was not found`);
  if(source.indexOf(search,first+search.length)>=0)throw new Error(`${path}: expected source fragment was not unique`);
  await writeFile(path,source.slice(0,first)+replacement+source.slice(first+search.length));
}

async function replaceBetween(path,start,end,replacement){
  const source=await readFile(path,'utf8');
  const from=source.indexOf(start);
  if(from<0)throw new Error(`${path}: method start was not found`);
  const to=source.indexOf(end,from+start.length);
  if(to<0)throw new Error(`${path}: method end was not found`);
  await writeFile(path,source.slice(0,from)+replacement+source.slice(to));
}

await replaceOnce(
  'app/src/index.template.html',
  '<a id="viewActiveBtn" class="button ghost" href="#view=active" target="_blank" rel="noopener">View Active</a>',
  '<a id="viewActiveBtn" class="button ghost" href="#view=active">View Active</a>'
);

await replaceOnce(
  'app/src/scripts/dashboard-controller.js',
  'href="#ticket=${encodeURIComponent(id)}" target="_blank" rel="noopener">View</a>',
  'href="#ticket=${encodeURIComponent(id)}">View</a>'
);

await replaceOnce(
  'app/src/scripts/ticket-view-controller.js',
  "this.onClick=this.onClick.bind(this);this.onUpdated=this.onUpdated.bind(this)",
  "this.onClick=this.onClick.bind(this);this.onUpdated=this.onUpdated.bind(this);this.onStorage=this.onStorage.bind(this)"
);
await replaceOnce(
  'app/src/scripts/ticket-view-controller.js',
  "window.addEventListener('parlay:tracker-updated',this.onUpdated);return this",
  "window.addEventListener('parlay:tracker-updated',this.onUpdated);window.addEventListener('storage',this.onStorage);window.addEventListener('parlay:storage-changed',this.onStorage);return this"
);
await replaceOnce(
  'app/src/scripts/ticket-view-controller.js',
  "window.removeEventListener('parlay:tracker-updated',this.onUpdated);this.deactivate();this.started=false",
  "window.removeEventListener('parlay:tracker-updated',this.onUpdated);window.removeEventListener('storage',this.onStorage);window.removeEventListener('parlay:storage-changed',this.onStorage);this.deactivate();this.started=false"
);
await replaceOnce(
  'app/src/scripts/ticket-view-controller.js',
  "    onUpdated(event){if(!this.mode)return;const ids=Array.isArray(event?.detail?.ids)?new Set(event.detail.ids.map(String)):null;if(ids&&this.mode.kind==='ticket'&&!ids.has(String(this.mode.id)))return;this.render()}\n",
  "    onUpdated(event){if(!this.mode)return;const ids=Array.isArray(event?.detail?.ids)?new Set(event.detail.ids.map(String)):null;if(ids&&this.mode.kind==='ticket'&&!ids.has(String(this.mode.id)))return;this.render()}\n    onStorage(event){if(!this.mode)return;const key=event?.key||event?.detail?.key;if(key&&key!==this.storage.KEY)return;this.render()}\n"
);

await replaceOnce(
  'app/src/scripts/sharing-controller.js',
  "this.storage=storage;this.pending=null;this.started=false;this.$=id=>document.getElementById(id);this.close=this.close.bind(this);this.primary=this.primary.bind(this);this.onKeyDown=this.onKeyDown.bind(this)",
  "this.storage=storage;this.pending=null;this.started=false;this.returnFocus=null;this.focusFrame=0;this.$=id=>document.getElementById(id);this.close=this.close.bind(this);this.primary=this.primary.bind(this);this.onKeyDown=this.onKeyDown.bind(this)"
);
await replaceBetween(
  'app/src/scripts/sharing-controller.js',
  '    openImport(ticket=null){',
  '\n    close(){',
  `    openImport(ticket=null){this.returnFocus=document.activeElement&&typeof document.activeElement.focus==='function'?document.activeElement:null;this.pending=ticket?{ticket:this.clone(ticket),sportsbook:''}:null;this.$('ticketShareTitle').textContent=ticket?'SHARED TICKET':'IMPORT TICKET CODE';this.$('ticketShareHelp').textContent=ticket?'Review the shared ticket before saving it to this device.':'Paste the same ticket object used by the Scriptable trackers.';this.$('ticketShareInput').value='';this.$('ticketShareInput').classList.toggle('hide',Boolean(ticket));this.$('ticketImportSportsbook').value='';this.$('ticketShareStatus').textContent='';this.$('ticketSharePrimary').textContent=ticket?'Save Ticket':'Preview Ticket';this.$('ticketSharePreview').classList.add('hide');if(ticket)this.renderPreview(this.pending);this.$('ticketShareBackdrop').classList.remove('hide');this.$('ticketShareModal').classList.remove('hide');document.body.classList.add('modalOpen');this.focusSoon(ticket?this.$('ticketSharePrimary'):this.$('ticketShareInput'))}\n    focusSoon(target){if(this.focusFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.focusFrame);const focus=()=>{this.focusFrame=0;target?.focus?.({preventScroll:true})};if(typeof requestAnimationFrame==='function')this.focusFrame=requestAnimationFrame(focus);else focus()}`
);
await replaceBetween(
  'app/src/scripts/sharing-controller.js',
  '    close(){',
  '\n    parseInput(){',
  `    close(){if(this.focusFrame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.focusFrame);this.focusFrame=0;this.$('ticketShareBackdrop')?.classList.add('hide');this.$('ticketShareModal')?.classList.add('hide');document.body?.classList.remove('modalOpen');this.pending=null;const target=this.returnFocus;this.returnFocus=null;if(target?.isConnected&&typeof target.focus==='function'){const restore=()=>target.focus({preventScroll:true});if(typeof requestAnimationFrame==='function')requestAnimationFrame(restore);else restore()}}`
);

await replaceOnce(
  'app/src/styles/app.css',
  'body{margin:0;padding:12px;',
  'body{margin:0;padding:calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));'
);
await replaceOnce(
  'app/src/styles/app.css',
  '@media(max-width:620px){body{padding:10px}',
  '@supports (-webkit-touch-callout:none){body{background-attachment:scroll}}\n@media(max-width:620px){body{padding:calc(10px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left))}'
);

const packagePath='package.json';
const packageData=JSON.parse(await readFile(packagePath,'utf8'));
packageData.scripts['test:mobile-platform']='node scripts/test-mobile-platform-contract.mjs';
packageData.scripts['test:browser']='playwright test';
packageData.scripts.test=`${packageData.scripts.test} && npm run test:mobile-platform && npm run test:browser`;
packageData.devDependencies={'@playwright/test':'1.61.1'};
await writeFile(packagePath,`${JSON.stringify(packageData,null,2)}\n`);

try{await access('.gitignore');throw new Error('.gitignore already exists; refusing to overwrite it')}catch(error){if(error?.code!=='ENOENT')throw error}
await writeFile('.gitignore',`node_modules/\nbuild/\ntest-results/\nplaywright-report/\ngate5-*.log\ngate5-*.status\ngate5-*.txt\ngate5-playwright-results.json\n`);

console.log('Gate 5 corrections applied.');
