#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const dashboardSource=readFileSync(new URL('../app/src/scripts/dashboard-controller.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app/src/scripts/app-controller.js',import.meta.url),'utf8');
const menus=[{removed:false,remove(){this.removed=true}},{removed:false,remove(){this.removed=true}}];
const buttons=[{expanded:'true',setAttribute(name,value){if(name==='aria-expanded')this.expanded=value}},{expanded:'true',setAttribute(name,value){if(name==='aria-expanded')this.expanded=value}}];
const classList=()=>({add(){},remove(){},contains(){return false},toggle(){}});
const elements=new Map();
for(const id of ['builderView','standaloneView','dashboardView','appTabs','ticketsTab','builderTab'])elements.set(id,{classList:classList()});

globalThis.window=globalThis;
globalThis.scrollTo=()=>{};
globalThis.document={
  hidden:true,
  body:{classList:classList()},
  getElementById:id=>elements.get(id)||null,
  querySelector:()=>null,
  querySelectorAll:selector=>selector==='.savedActionsMenu'?menus:selector==='[data-ticket-action="menu"][aria-expanded="true"]'?buttons:[],
  addEventListener:()=>{}
};
vm.runInThisContext(dashboardSource,{filename:'app/src/scripts/dashboard-controller.js'});

const dashboard=new globalThis.DashboardController({storage:{load:()=>[]},tracker:{},root:{},status:{}});
dashboard.state.actionMenuId='ticket-1';
dashboard.closeActions();
assert.ok(menus.every(menu=>menu.removed),'Closing Actions must remove every extant dashboard action panel');
assert.ok(buttons.every(button=>button.expanded==='false'),'Closing Actions must reset every expanded menu button');
assert.equal(dashboard.state.actionMenuId,'','Closing Actions must clear controller ownership');

menus.forEach(menu=>{menu.removed=false});
dashboard.state.actionMenuId='ticket-2';
dashboard.onVisibility();
assert.ok(menus.every(menu=>menu.removed),'Backgrounding the page must destroy every dashboard action panel');
assert.equal(dashboard.state.actionMenuId,'','Backgrounding the page must clear action-menu ownership');
assert.match(dashboardSource,/showActions\(id,anchor\)\{\s*this\.closeActions\(\)/,'Opening an Actions panel must first destroy every previous panel');

vm.runInThisContext(appSource,{filename:'app/src/scripts/app-controller.js'});
let overlayClosures=0,renders=0;
const lifecycleDashboard={closeOverlays(){overlayClosures++},render(){renders++}};
const app=new globalThis.AppController({storage:{},builder:{captureDraft(){}},sharing:{},viewer:{},dashboard:lifecycleDashboard});
app.showDashboard(false);
app.showBuilder();
app.showStandalone();
assert.equal(overlayClosures,3,'Every application view transition must destroy dashboard-only overlays');
assert.equal(renders,1,'Returning to the dashboard must render it exactly once');

console.log('Canonical Actions-panel lifecycle regression passed.');
