(function(root,factory){
  "use strict";
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.OrlojPRTemporal=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  var SCHEMA="orloj.temporal-context/1.0.0";
  var CATEGORIES=["macro","policy","network","treasury","machine-economy","other"];
  var MATURITY=["production","pilot","memorandum","announcement","unknown"];

  function asInstant(value,label){
    var d=value instanceof Date?new Date(value.getTime()):
      typeof value==="string"&&/(Z|[+-][0-9]{2}:[0-9]{2})$/i.test(value)?new Date(value):null;
    if(!d||!Number.isFinite(d.getTime()))throw new TypeError(label+" must be an ISO instant with timezone (or Date)");
    return d;
  }
  function round(value,places){
    var n=Number(value);
    return Number.isFinite(n)?Number(n.toFixed(places)):null;
  }
  function cleanUrl(raw){
    if(typeof raw!=="string"||!/^https:\/\/[^\s]+$/i.test(raw))return null;
    try{var u=new URL(raw);return u.protocol==="https:"?u.href:null;}
    catch(e){return null;}
  }
  function normalizeEvent(e,D,timeZone){
    if(!e||typeof e!=="object"||!e.id||!e.title)throw new TypeError("Every PR event requires id and title");
    var begins=asInstant(e.startsAt,"event.startsAt");
    var ends=e.endsAt==null?null:asInstant(e.endsAt,"event.endsAt");
    if(ends&&ends<begins)throw new RangeError("event.endsAt must not precede startsAt");
    var sourceUrl=cleanUrl(e.sourceUrl);
    return {
      id:String(e.id),title:String(e.title),startsAt:begins.toISOString(),
      endsAt:ends?ends.toISOString():null,
      dateKey:D.dateKeyAt(begins,timeZone),
      category:CATEGORIES.indexOf(e.category)>=0?e.category:"other",
      maturity:MATURITY.indexOf(e.maturity)>=0?e.maturity:"unknown",
      sourceUrl:sourceUrl,
      sourceState:sourceUrl?"linked":"review_required",
      sourcePublishedAt:e.sourcePublishedAt==null?null:asInstant(e.sourcePublishedAt,"event.sourcePublishedAt").toISOString(),
      description:typeof e.description==="string"?e.description:"",
      provenance:"pr-supplied"
    };
  }
  function createContext(options){
    var p=options||{},D=p.dayEngine,A=p.astronomy||null;
    if(!D||!D.validTimeZone||!D.dateKeyAt||!D.shiftDateKey||!D.moonPhase||!D.snapshot)
      throw new TypeError("A compatible OrlojDay engine is required");
    var zone=p.timeZone||"Europe/Prague";
    if(!D.validTimeZone(zone))throw new RangeError("Invalid IANA time zone");
    var at=asInstant(p.at,"at");
    var dateKey=D.dateKeyAt(at,zone);
    var phase=A?D.moonPhase(A,at):null;
    var positions=A?D.snapshot(A,at):null;
    var sun=positions&&positions.find(function(v){return v.id==="sun";});
    var moon=positions&&positions.find(function(v){return v.id==="moon";});
    var events=(p.events||[]).map(function(e){return normalizeEvent(e,D,zone);});
    events.sort(function(a,b){return a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id);});
    var lastDay=D.shiftDateKey(dateKey,6);
    var symbolic=p.includeSymbolic===true?{
      domain:"symbolic/non-empirical",optIn:true,
      weekdayRuler:D.dayRuler(dateKey).name,
      universalDay:D.numerology(dateKey,null).universal.label,
      warning:"Symbolic patterns are not validated predictors of market returns."
    }:null;
    return {
      schema:SCHEMA,generatedAt:at.toISOString(),timeZone:zone,dateKey:dateKey,
      calendar:{dayOfYear:D.dayOfYear(dateKey),isoWeek:D.isoWeek(dateKey)},
      astronomy:{
        available:!!A,
        provenance:A?"OrlojDay + Astronomy Engine":"unavailable",
        lunar:phase?{
          name:phase.name,angleDegrees:round(phase.angle,5),
          illuminationFraction:round(phase.illumination,6),
          zodiacSign:moon?moon.sign.name:null,longitudeDegrees:moon?round(moon.lon,5):null
        }:null,
        solar:sun?{zodiacSign:sun.sign.name,longitudeDegrees:round(sun.lon,5)}:null,
        note:"Astronomical measurements are context, not price forecasts."
      },
      events:{all:events,nextSevenCalendarDays:events.filter(function(e){
        return e.dateKey>=dateKey&&e.dateKey<=lastDay;
      })},
      symbolic:symbolic,
      financialSignals:null,
      boundaries:{
        decisionOwner:"Purple Rain",
        temporalOwner:"Orloj",
        empiricalMarketRegime:"not_computed",
        eventValidation:"PR must verify source and production/pilot/memorandum maturity before acting",
        marketPrediction:"none"
      }
    };
  }

  return {SCHEMA:SCHEMA,createContext:createContext};
});
