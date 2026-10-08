"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Day=require("../day-profile.js");
const Astronomy=require("../astronomy-engine.min.js");
const Bridge=require("../pr-temporal-context.js");

function build(extra){
  return Bridge.createContext(Object.assign({
    dayEngine:Day,astronomy:Astronomy,
    at:"2026-10-08T21:00:00Z",timeZone:"Europe/Prague",
    events:[]
  },extra||{}));
}

test("PR temporal bridge preserves the Orloj/PR boundary",()=>{
  const data=build();
  assert.equal(data.schema,"orloj.temporal-context/1.0.0");
  assert.equal(data.dateKey,"2026-10-08");
  assert.equal(data.calendar.isoWeek,Day.isoWeek(data.dateKey));
  assert.equal(data.calendar.dayOfYear,Day.dayOfYear(data.dateKey));
  assert.equal(data.boundaries.decisionOwner,"Purple Rain");
  assert.equal(data.boundaries.temporalOwner,"Orloj");
  assert.equal(data.boundaries.marketPrediction,"none");
  assert.equal(data.financialSignals,null);
});

test("snapshot reuses the existing astronomical engine",()=>{
  const data=build();
  const moment=new Date(data.generatedAt);
  const original=Day.moonPhase(Astronomy,moment);
  assert.equal(data.astronomy.lunar.name,original.name);
  assert.equal(data.astronomy.lunar.angleDegrees,Number(original.angle.toFixed(5)));
  assert.equal(data.astronomy.lunar.illuminationFraction,Number(original.illumination.toFixed(6)));
  const sun=Day.snapshot(Astronomy,moment).find(x=>x.id==="sun");
  assert.equal(data.astronomy.solar.zodiacSign,sun.sign.name);
});

test("astronomy stays explicitly unavailable when not supplied",()=>{
  const data=build({astronomy:null});
  assert.equal(data.astronomy.available,false);
  assert.equal(data.astronomy.lunar,null);
  assert.equal(data.astronomy.solar,null);
});

test("local civil days, not UTC days, determine event positions",()=>{
  const at="2026-10-08T23:30:00Z";
  const prague=build({at:at});
  const ny=build({at:at,timeZone:"America/New_York"});
  assert.equal(prague.dateKey,"2026-10-09");
  assert.equal(ny.dateKey,"2026-10-08");
});

test("civil dates survive the autumn DST transition",()=>{
  const before=build({at:"2026-10-25T00:30:00Z"});
  const after=build({at:"2026-10-25T01:30:00Z"});
  assert.equal(before.dateKey,"2026-10-25");
  assert.equal(after.dateKey,"2026-10-25");
  assert.equal(before.timeZone,after.timeZone);
});

test("events come only from PR inputs, and missing sources demand review",()=>{
  const events=[
    {id:"first",title:"Pilot test",startsAt:"2026-10-09T00:15:00+02:00",category:"network",maturity:"pilot",sourceUrl:"https://example.org/release"},
    {id:"second",title:"Claim without verification",startsAt:"2026-10-13T10:00:00Z",category:"macro",maturity:"production"},
    {id:"later",title:"Outside range",startsAt:"2026-10-17T10:00:00Z",category:"other",maturity:"unknown"}
  ];
  const data=build({events:events});
  assert.equal(data.events.all.length,3);
  assert.deepEqual(data.events.nextSevenCalendarDays.map(e=>e.id),["first","second"]);
  assert.equal(data.events.all[0].dateKey,"2026-10-09");
  assert.equal(data.events.all[0].maturity,"pilot");
  assert.equal(data.events.all[0].sourceState,"linked");
  assert.equal(data.events.all[1].sourceState,"review_required");
  assert.equal(data.events.all[1].sourceUrl,null);
  assert.equal(data.events.all[1].provenance,"pr-supplied");
});

test("symbolic interpretations require explicit opt-in",()=>{
  assert.equal(build().symbolic,null);
  const data=build({includeSymbolic:true});
  assert.equal(data.symbolic.domain,"symbolic/non-empirical");
  assert.equal(data.symbolic.universalDay,Day.numerology(data.dateKey,null).universal.label);
  assert.match(data.symbolic.warning,/not validated predictors/);
  assert.equal(data.financialSignals,null);
});

test("input validation prevents ambiguous dates and unsafe links",()=>{
  assert.throws(()=>build({at:"2026-10-08"}),/ISO instant/);
  assert.throws(()=>build({timeZone:"Fake/Nowhere"}),/Invalid IANA/);
  assert.throws(()=>build({events:[{title:"Missing ID",startsAt:"2026-10-09T00:00:00Z"}]}),/id and title/);
  assert.throws(()=>build({events:[{id:"x",title:"Range",startsAt:"2026-10-09T10:00:00Z",endsAt:"2026-10-08T10:00:00Z"}]}),/must not precede/);
  const data=build({events:[{id:"bad-link",title:"Unverified",startsAt:"2026-10-08T10:00:00Z",sourceUrl:"javascript:alert(1)"}]});
  assert.equal(data.events.all[0].sourceUrl,null);
  assert.equal(data.events.all[0].sourceState,"review_required");
});
