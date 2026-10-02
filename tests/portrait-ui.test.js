'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../portrait-engine.js'),D=require('../day-profile.js'),A=require('../astronomy-engine.min.js');
const root=path.resolve(__dirname,'..');
function app(navigator={}){
  const elements={},events={},timers=new Map();let next=0;
  const element=id=>elements[id]||(elements[id]={hidden:true,value:'',handlers:{},addEventListener(k,f){this.handlers[k]=f;},select(){this.selected=true;}});
  const buttons=['map','aspects','now'].map(k=>({dataset:{panel:k},handlers:{},addEventListener(k,f){this.handlers[k]=f;},setAttribute(){}}));
  const document={title:'',hidden:false,getElementById:element,querySelectorAll:()=>buttons,addEventListener(k,f){events[k]=f;}};
  const window={OrlojPortrait:P,OrlojDay:D,Astronomy:A,addEventListener(k,f){events[k]=f;}};
  const location={href:'https://example.org/portrait.html?preview=1#n=Petra',hash:'#n=Petra'};
  vm.runInNewContext(fs.readFileSync(path.join(root,'portrait.js'),'utf8'),{window,document,navigator,location,URL,Intl,Date,Blob,Image:function(){},setInterval:f=>{timers.set(++next,f);return next;},clearInterval:id=>timers.delete(id)});
  return{element,events,timers,buttons,location};
}
test('manual share fallback keeps the exact chart accessible without dialogs',async()=>{
  const a=app({clipboard:{writeText:async()=>{throw Error('Denied');}}});
  await a.element('portrait-share').handlers.click();
  assert.equal(a.element('portrait-share-link').hidden,false);
  const url=new URL(a.element('portrait-share-url').value);
  assert.equal(url.search,'');assert.equal(P.decode(url.hash).name,'Petra');
  assert.match(a.element('portrait-action-status').textContent,/pole níže/);
  a.element('portrait-share-url').handlers.click.call(a.element('portrait-share-url'));
  assert.equal(a.element('portrait-share-url').selected,true);
});
test('cancelled native sharing preserves the link and profile changes clear it',async()=>{
  const a=app({share:async()=>{throw Object.assign(Error('Cancelled'),{name:'AbortError'});}});
  await a.element('portrait-share').handlers.click();
  assert.match(a.element('portrait-action-status').textContent,/Sdílení bylo zavřené/);
  assert.equal(a.element('portrait-share-link').hidden,false);
  a.location.hash='#n=Žofie';a.events.hashchange();
  assert.equal(a.element('portrait-share-link').hidden,true);
  assert.equal(a.element('portrait-share-url').value,'');
  assert.equal(a.element('portrait-title').textContent,'Žofie · osobní Orloj');
});
test('the live panel resumes after browser back-cache restore without duplicate timers',()=>{
  const a=app();a.buttons[2].handlers.click();
  assert.match(a.element('portrait-now-time').textContent,/ · Praha$/);
  assert.equal(a.timers.size,1);a.events.pagehide({persisted:true});assert.equal(a.timers.size,0);
  a.events.pageshow({persisted:true});assert.equal(a.timers.size,1);
  a.events.pageshow({persisted:true});assert.equal(a.timers.size,1);
  a.events.visibilitychange();assert.ok(a.element('portrait-live-hits').innerHTML);
});
test('the compact aspect guide and share field have labels and uncertainty explanations',()=>{
  const html=fs.readFileSync(path.join(root,'portrait.html'),'utf8');
  assert.match(html,/<label for="portrait-share-url">/);
  assert.match(html,/readonly spellcheck="false" aria-describedby="portrait-share-hint"/);
  assert.match(html,/Jak číst symboly a orb/);
  assert.match(html,/nikoli jistější výklad/);
  assert.match(html,/přesnost orbu je tím omezená/);
});
