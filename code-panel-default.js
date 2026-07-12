/* CODE_PANEL_DEFAULT_HIDDEN_V41 */
(() => {
  'use strict';

  function hideCodePanel(){
    const panel=document.getElementById('codePanel');
    if(panel)panel.classList.add('hide');
  }

  function wrap(name){
    const original=window[name];
    if(typeof original!=='function'||original.__codePanelWrapped)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      hideCodePanel();
      return result;
    };
    wrapped.__codePanelWrapped=true;
    window[name]=wrapped;
  }

  function install(){
    hideCodePanel();
    wrap('showBuilder');
    wrap('resetBuilderForNew');
    wrap('loadRecordIntoBuilder');
    wrap('returnToBuilderDraft');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  window.addEventListener('load',install,{once:true});
})();