#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Hub{
  constructor(){this.listeners=new Map()}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list)}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn))}
  count(type){return (this.listeners.get(type)||[]).length}
}
const classList=()=>({add(){},remove(){},contains(){return false},toggle(){}});
const docHub=new Hub(),winHub=new Hub();
const bodyChildren=[];
const makePanel=()=>({className:'',dataset:{},innerHTML:'',style:{},offsetHeight:100,remove(){this.removed=true},querySelector(selector){return{value:selector.includes('sort')?'saved':selector.includes('direction')?'desc':'all'}},classList:classList()});
globalThis.window=globalThis;
globalThis.addEventListener=winHub.addEventListener.bind(winHub);globalThis.removeEventListener=winHub.removeEventListener.bind(winHub);
globalThis.document={
  hidden:false,
  body:{classList:classList(),append(...nodes){bodyChildren.push(...nodes)},appendChild(node){bodyChildren.push(node)}},
  addEventListener:docHub.addEventListener.bind(docHub),removeEventListener:docHub.removeEventListener.bind(docHub),
  createElement:()=>makePanel(),createDocumentFragment:()=>({appendChild(){}}),
  querySelector:()=>null,querySelectorAll:()=>[]
};
globalThis.confirm=()=>true;
const source=readFileSync(new URL('../app/src/scripts/dashboard-controller.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'dashboard-controller.js'});
const root={replaceChildren(){},appendChild(){},parentElement:{querySelector:()=>null},insertAdjacentElement(){}};
const status={textContent:''};

{
  const controller=new globalThis.DashboardController({storage:{KEY:'k',load:()=>[]},tracker:{},root,status});
  controller.render=()=>{};
  controller.start();controller.start();
  assert.equal(docHub.count('click'),1,'Dashboard startup must be idempotent');
  assert.equal(winHub.count('storage'),1,'Dashboard storage listener must be registered once');
  assert.equal(typeof controller.stop,'function','Dashboard controller must expose teardown');
  controller.stop();
  assert.equal(docHub.count('click'),0,'Dashboard teardown must remove document listeners');
  assert.equal(winHub.count('storage'),0,'Dashboard teardown must remove window listeners');
}

{
  const controller=new globalThis.DashboardController({storage:{load:()=>[],find:()=>null},tracker:{},root,status});
  controller.state.actionMenuId='old';
  controller.showActions('missing',{getBoundingClientRect:()=>({right:10,bottom:10}),setAttribute(){}});
  assert.equal(controller.state.actionMenuId,'','A missing ticket must not retain action-menu ownership');
}

{
  const controller=new globalThis.DashboardController({storage:{load:()=>[]},tracker:{},root,status});
  let closedActions=0;controller.closeActions=()=>{closedActions++;controller.state.actionMenuId=''};
  controller.closeSortFilter=()=>{};
  controller.showSortFilter();
  assert.equal(closedActions,1,'Opening Sort & Filter must destroy any Actions panel first');
}

{
  let controller;
  const renderStates=[];
  const storage={
    load:()=>[],
    remove(){controller.onStorage({});return 2}
  };
  controller=new globalThis.DashboardController({storage,tracker:{},root,status});
  controller.render=()=>renderStates.push({selectMode:controller.state.selectMode,selected:controller.state.selectedIds.size});
  controller.state.selectMode=true;controller.state.selectedIds=new Set(['a','b']);
  controller.deleteSelected();
  assert.equal(controller.state.selectMode,false,'Bulk deletion must exit Select mode');
  assert.equal(controller.state.selectedIds.size,0,'Bulk deletion must clear selection ownership');
  assert.deepEqual(renderStates.at(-1),{selectMode:false,selected:0},'Synchronous storage events must render the post-deletion state, not stale Select mode');
}

{
  const controller=new globalThis.DashboardController({storage:{load:()=>[]},tracker:{},root,status});
  let closed=0;controller.closeOverlays=()=>{closed++};document.hidden=true;
  controller.onVisibility();controller.onPageHide();
  assert.equal(closed,2,'Backgrounding or leaving the page must remove all dashboard overlays');
  document.hidden=false;
}

{
  const controller=new globalThis.DashboardController({storage:{load:()=>[]},tracker:{},root,status});
  const overlays=[{removed:false,remove(){this.removed=true}},{removed:false,remove(){this.removed=true}},{removed:false,remove(){this.removed=true}}];
  const originalAll=document.querySelectorAll,originalOne=document.querySelector;
  document.querySelectorAll=selector=>selector==='.sortFilterPanel,.sortFilterBackdrop'?overlays:[];document.querySelector=()=>null;
  controller.closeSortFilter();
  assert.ok(overlays.every(node=>node.removed),'Overlay cleanup must remove every stale Sort & Filter node, not only the first');
  document.querySelectorAll=originalAll;document.querySelector=originalOne;
}

console.log('Dashboard controller contract passed.');
