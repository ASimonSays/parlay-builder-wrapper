const fs=require('fs');
const path='index.html';
let s=fs.readFileSync(path,'utf8');

s=s.replace(
"let editingTicketId='';",
"let editingTicketId='';\nlet builderMode='draft';\nlet builderDraftRecord=null;\nconst VIEWER_WINDOW_NAME='ParlayTrackerViewer';"
);

s=s.replace(
"function showDashboard(){document.querySelectorAll('.builderOnly').forEach(x=>x.classList.add('hide'));$('dashboardView').classList.remove('hide');$('standaloneView').classList.add('hide');$('ticketsTab').classList.add('active');$('builderTab').classList.remove('active');renderTicketDashboard();window.scrollTo({top:0,behavior:'smooth'})}",
"function captureBuilderDraft(){if(builderMode!=='draft')return;const list=loadSavedTickets(),existing=list.find(x=>x.id===editingTicketId)||null;builderDraftRecord=ticketRecordFromBuilder(existing)}\nfunction showDashboard(){captureBuilderDraft();document.querySelectorAll('.builderOnly').forEach(x=>x.classList.add('hide'));$('dashboardView').classList.remove('hide');$('standaloneView').classList.add('hide');$('ticketsTab').classList.add('active');$('builderTab').classList.remove('active');renderTicketDashboard();window.scrollTo({top:0,behavior:'smooth'})}"
);

s=s.replace(
"function resetBuilderForNew(){editingTicketId='';$('tracker').value='parlay';$('ticketType').value='sgp';$('ticketLeague').value='MLB';$('date').value=today();$('odds').value='';$('sportsbook').value='DraftKings';$('ticketStatus').value='active';$('ticketGameManual').value='';$('ticketGame').value='';$('legs').innerHTML='';straightActiveLegId='';addLeg();$('saveStatus').textContent='';loadGames();syncLegs();preview();showBuilder()}",
"function resetBuilderForNew(){builderMode='draft';builderDraftRecord=null;editingTicketId='';$('tracker').value='parlay';$('ticketType').value='sgp';$('ticketLeague').value='MLB';$('date').value=today();$('odds').value='';$('sportsbook').value='DraftKings';$('ticketStatus').value='active';$('ticketGameManual').value='';$('ticketGame').value='';$('legs').innerHTML='';legCount=0;straightActiveLegId='';addLeg();$('saveStatus').textContent='';loadGames();syncLegs();preview();showBuilder()}"
);

s=s.replace(
"function editSavedTicket(id){const r=loadSavedTickets().find(x=>x.id===id);if(!r)return;loadRecordIntoBuilder(r);showBuilder()}",
"function editSavedTicket(id){const r=loadSavedTickets().find(x=>x.id===id);if(!r)return;captureBuilderDraft();builderMode='edit';loadRecordIntoBuilder(r);showBuilder()}\nfunction returnToBuilderDraft(){if(builderMode==='edit'){if(builderDraftRecord){loadRecordIntoBuilder(builderDraftRecord);$('saveStatus').textContent='Builder restored.';$('saveStatus').className='status'}else{resetBuilderForNew();return}builderMode='draft'}showBuilder()}"
);

s=s.replace(
"function openSavedTicketView(id){window.open(location.href.split('#')[0]+'#ticket='+encodeURIComponent(id),'_blank')}\nfunction openActiveTicketsView(){window.open(location.href.split('#')[0]+'#view=active','_blank')}",
"function openViewer(hash){const viewer=window.open(location.href.split('#')[0]+hash,VIEWER_WINDOW_NAME);viewer?.focus?.()}\nfunction openSavedTicketView(id){openViewer('#ticket='+encodeURIComponent(id))}\nfunction openActiveTicketsView(){openViewer('#view=active')}\nfunction closeStandaloneViewer(){window.close();setTimeout(()=>{if(!window.closed){location.href=location.href.split('#')[0]}},120)}"
);

s=s.replace(
"<button class=\"ghost\" type=\"button\" onclick=\"location.hash='';location.reload()\">Back</button>",
"<button class=\"ghost\" type=\"button\" onclick=\"closeStandaloneViewer()\">Close</button>"
);

s=s.replace(
"$('ticketsTab').addEventListener('click',showDashboard);$('builderTab').addEventListener('click',showBuilder);",
"$('ticketsTab').addEventListener('click',showDashboard);$('builderTab').addEventListener('click',returnToBuilderDraft);"
);

for(const required of ["builderMode='draft'","legCount=0;straightActiveLegId=''","VIEWER_WINDOW_NAME","closeStandaloneViewer()","returnToBuilderDraft"]){
  if(!s.includes(required))throw new Error('Patch verification failed: '+required);
}
fs.writeFileSync(path,s);
console.log('Builder state, leg numbering, and viewer window behavior corrected.');
