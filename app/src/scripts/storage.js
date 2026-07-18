(() => {
  'use strict';
  const KEY = 'parlayTracker.savedTickets.v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const makeId = () => globalThis.crypto?.randomUUID?.() || `ticket-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  function parse(raw) { try { const value=JSON.parse(raw||'[]'); return Array.isArray(value)?value:[]; } catch { return []; } }
  function normalize(records) {
    let changed=false;
    const seen=new Set();
    const out=[];
    for(const source of records){
      if(!source||typeof source!=='object'||Array.isArray(source)) continue;
      const record=source;
      let id=String(record.id||'').trim();
      if(!id||seen.has(id)){id=makeId();record.id=id;changed=true;}
      seen.add(id);
      if(!record.ticket&&record.canonical){record.ticket=clone(record.canonical);changed=true;}
      if(!record.canonical&&record.ticket){record.canonical=clone(record.ticket);changed=true;}
      if(!record.status){record.status='active';changed=true;}
      out.push(record);
    }
    return {records:out,changed};
  }
  function load(){
    const normalized=normalize(parse(localStorage.getItem(KEY)));
    if(normalized.changed)localStorage.setItem(KEY,JSON.stringify(normalized.records));
    return normalized.records;
  }
  function save(records){
    if(!Array.isArray(records))throw new TypeError('Ticket storage requires an array.');
    const normalized=normalize(clone(records)).records;
    localStorage.setItem(KEY,JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('parlay:storage-changed',{detail:{key:KEY}}));
    return normalized;
  }
  function find(id){return load().find(record=>String(record.id)===String(id))||null;}
  function update(id,updater){
    const records=load(),index=records.findIndex(record=>String(record.id)===String(id));
    if(index<0)return null;
    const originalId=records[index].id,current=clone(records[index]),next=updater(current)||current;
    next.id=originalId;records[index]=next;save(records);return clone(next);
  }
  function upsert(record){
    const records=load(),id=String(record?.id||'').trim()||makeId(),next=clone({...record,id});
    const index=records.findIndex(item=>String(item.id)===id);
    if(index<0)records.push(next);else records[index]=next;
    save(records);return clone(next);
  }
  function remove(ids){
    const wanted=new Set([...ids].map(String)),records=load(),remaining=records.filter(record=>!wanted.has(String(record.id)));
    if(remaining.length!==records.length)save(remaining);
    return records.length-remaining.length;
  }
  window.ParlayStorage=Object.freeze({KEY,clone,makeId,load,save,find,update,upsert,remove});
})();
