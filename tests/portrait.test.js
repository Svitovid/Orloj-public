'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../portrait-engine.js'),D=require('../day-profile.js'),A=require('../astronomy-engine.min.js');

test('the transcribed wheel yields its close natal aspects, including wraparound',()=>{
  const p=P.validate(P.DEMO),list=P.readings(p);
  assert.equal(list.length,6);
  const find=(a,b)=>list.find(x=>x.a.id===a&&x.b.id===b);
  assert.equal(find('mars','pluto').angle,0);
  assert.equal(find('mars','pluto').orb,1);
  assert.equal(find('mars','pluto').approx,true);
  const sun=find('sun','saturn');
  assert.equal(sun.angle,60);
  assert.ok(Math.abs(sun.orb-32/60)<1e-9);
  assert.equal(sun.approx,false);
  const mercury=find('mercury','saturn');
  assert.equal(mercury.angle,90);
  assert.ok(Math.abs(mercury.orb-(2+34/60))<1e-9);
  assert.equal(P.position(p.points[1]),'≈ 19°');
});

test('personal map sharing round-trips Unicode and never creates inferred birth data',()=>{
  const p=P.validate({...P.DEMO,name:'Žofie & Petra',date:'2001-03-16',time:'08:46',place:'Unknown'});
  assert.deepEqual(P.decode(P.encode(p)),p);
  assert.equal(p.date,undefined);assert.equal(p.time,undefined);assert.equal(p.place,undefined);
  assert.equal(P.decode('#n=Petra').name,'Petra');
  const changed=P.validate(p);changed.points[0].lon=275;
  assert.equal(P.triad(changed)[0].words,'Vytrvalost · konkrétní směr');
  assert.equal(P.DEMO.name,'');
});

test('malformed shared charts cannot introduce a body, longitude or executable SVG text',()=>{
  assert.throws(()=>P.decode('#map=%3Cscript%3E'));
  assert.throws(()=>P.decode('#map='+'a'.repeat(8193)));
  assert.throws(()=>P.validate({...P.DEMO,points:P.DEMO.points.map((x,i)=>i?x:{id:'sun',lon:Infinity})}));
  assert.throws(()=>P.validate({...P.DEMO,points:P.DEMO.points.map((x,i)=>i?x:{id:'moon',lon:20})}));
  const svg=P.poster(P.validate({...P.DEMO,name:'<script>alert(1)</script>'}));
  assert.doesNotMatch(svg,/<script>/);assert.match(svg,/&lt;script&gt;/);
});

test('the Chinese annual stem and branch are distinct from confirmed birth data',()=>{
  assert.deepEqual(P.cycle(2001),{animal:'Had',element:'kov',polarity:'jinový',name:'Xin-si'});
  assert.deepEqual(P.cycle(1999),{animal:'Králík',element:'země',polarity:'jinový',name:'Ji-mao'});
  const svg=P.poster(P.decode('#n=Petra'));
  assert.match(svg,/Had · jinový kov/);assert.match(svg,/orientačně z poloh planet/);
  assert.doesNotMatch(svg,/Živly|Kvality znamení|16\. března|datum narození/);
});

test('live context uses current ephemerides and keeps the source chart fixed',()=>{
  const p=P.validate(P.DEMO),before=JSON.stringify(p),at=new Date('2026-10-01T18:00:00Z'),r=P.liveHits(A,at,p);
  assert.equal(r.points.length,10);assert.equal(JSON.stringify(p),before);
  assert.ok(r.hits.every(h=>h.orb<=2));
  const pluto=r.points.find(x=>x.id==='pluto');
  assert.ok(Math.abs(pluto.lon-D.longitudeById(A,'pluto',at))<1e-8);
  assert.ok(r.moon.illumination>=0&&r.moon.illumination<=1);
});
