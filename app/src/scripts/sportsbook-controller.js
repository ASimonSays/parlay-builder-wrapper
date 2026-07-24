(() => {
  'use strict';
  class SportsbookController {
    constructor({storage,builder}){this.storage=storage;this.builder=builder;this.started=false;this.$=id=>document.getElementById(id);this.onChange=this.onChange.bind(this);this.onInput=this.onInput.bind(this);this.onBuilderShown=this.onBuilderShown.bind(this);this.onTicketSaved=this.onTicketSaved.bind(this)}
    start(){if(this.started)return this;this.started=true;this.$('sportsbook').addEventListener('change',this.onChange);this.$('sportsbookCustom').addEventListener('input',this.onInput);window.addEventListener('parlay:show-builder',this.onBuilderShown);window.addEventListener('parlay:ticket-saved',this.onTicketSaved);this.syncVisibility();return this}
    stop(){if(!this.started)return;this.$('sportsbook').removeEventListener('change',this.onChange);this.$('sportsbookCustom').removeEventListener('input',this.onInput);window.removeEventListener('parlay:show-builder',this.onBuilderShown);window.removeEventListener('parlay:ticket-saved',this.onTicketSaved);this.started=false}
    clean(value){return String(value??'').trim()}
    isListed(value){return [...this.$('sportsbook').options].some(option=>option.value===value&&option.value!=='Other')}
    syncVisibility(){const custom=this.$('sportsbookCustom'),active=this.$('sportsbook').value==='Other';custom.classList.toggle('hide',!active);if(!active)custom.value=''}
    onChange(){this.syncVisibility();this.builder.preview?.()}
    onInput(){this.builder.preview?.()}
    onBuilderShown(){const select=this.$('sportsbook'),custom=this.$('sportsbookCustom'),record=this.builder.editingId?this.storage.find(this.builder.editingId):null,name=this.clean(record?.sportsbook);if(name&&!this.isListed(name)){select.value='Other';custom.value=name;custom.classList.remove('hide')}else this.syncVisibility()}
    onTicketSaved(event){const id=event.detail?.id;if(!id)return;const select=this.$('sportsbook'),custom=this.$('sportsbookCustom'),value=select.value==='Other'?this.clean(custom.value):this.clean(select.value);this.storage.update(id,record=>{record.sportsbook=value;record.updatedAt=new Date().toISOString();return record})}
  }
  window.SportsbookController=SportsbookController;
})();