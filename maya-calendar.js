(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.OrlojMaya=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  var GMT_CORRELATION=584283;
  var TZOLKIN_LENGTH=260;
  var HAAB_LENGTH=365;
  var CALENDAR_ROUND=18980;
  var LONG_COUNT_CYCLE=1872000;
  var TZOLKIN=[
    {name:"Imix’",kiche:"Imox"},{name:"Ik’",kiche:"Iq’"},{name:"Ak’b’al",kiche:"Aq’ab’al"},{name:"K’an",kiche:"K’at"},
    {name:"Chikchan",kiche:"Kan"},{name:"Kimi",kiche:"Kame"},{name:"Manik’",kiche:"Kej"},{name:"Lamat",kiche:"Q’anil"},
    {name:"Muluk",kiche:"Toj"},{name:"Ok",kiche:"Tz’i’"},{name:"Chuwen",kiche:"B’atz’"},{name:"Eb’",kiche:"E"},
    {name:"B’en",kiche:"Aj"},{name:"Ix",kiche:"I’x"},{name:"Men",kiche:"Tz’ikin"},{name:"Kib’",kiche:"Ajmaq"},
    {name:"Kab’an",kiche:"No’j"},{name:"Etz’nab’",kiche:"Tijax"},{name:"Kawak",kiche:"Kawoq"},{name:"Ajaw",kiche:"Ajpu"}
  ];
  var HAAB=[
    {name:"Pop",days:20},{name:"Wo",days:20},{name:"Sip",days:20},{name:"Sotz’",days:20},{name:"Sek",days:20},
    {name:"Xul",days:20},{name:"Yaxk’in",days:20},{name:"Mol",days:20},{name:"Ch’en",days:20},{name:"Yax",days:20},
    {name:"Sak’",days:20},{name:"Keh",days:20},{name:"Mak",days:20},{name:"K’ank’in",days:20},{name:"Muwan",days:20},
    {name:"Pax",days:20},{name:"K’ayab",days:20},{name:"Kumk’u",days:20},{name:"Wayeb’",days:5}
  ];
  var LONG_COUNT_UNITS=[
    {id:"baktun",label:"b’ak’tun",days:144000},
    {id:"katun",label:"k’atun",days:7200},
    {id:"tun",label:"tun",days:360},
    {id:"uinal",label:"winal",days:20},
    {id:"kin",label:"k’in",days:1}
  ];

  function mod(n,m){return((n%m)+m)%m;}
  function pad(n,size){var s=String(Math.abs(n));while(s.length<(size||2))s="0"+s;return(n<0?"-":"")+s;}
  function isLeapYear(year){return mod(year,4)===0&&(mod(year,100)!==0||mod(year,400)===0);}
  function daysInMonth(year,month){return[31,isLeapYear(year)?29:28,31,30,31,30,31,31,30,31,30,31][month-1]||0;}
  function assertYmd(year,month,day){
    if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day))throw new TypeError("Gregorian date must contain integer year, month and day");
    if(month<1||month>12||day<1||day>daysInMonth(year,month))throw new RangeError("Invalid proleptic Gregorian date");
  }
  function gregorianToJdn(year,month,day){
    assertYmd(year,month,day);
    var a=Math.floor((14-month)/12),y=year+4800-a,m=month+12*a-3;
    return day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
  }
  function jdnToGregorian(jdn){
    if(!Number.isInteger(jdn))throw new TypeError("Julian day number must be an integer");
    var a=jdn+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4),d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
    return{year:100*b+d-4800+Math.floor(m/10),month:m+3-12*Math.floor(m/10),day:e-Math.floor((153*m+2)/5)+1};
  }
  function parseDateKey(value){
    var match=String(value||"").trim().match(/^(-?\d{1,6})-(\d{2})-(\d{2})$/);
    if(!match)return null;
    var ymd={year:Number(match[1]),month:Number(match[2]),day:Number(match[3])};
    try{assertYmd(ymd.year,ymd.month,ymd.day);}catch(e){return null;}
    return ymd;
  }
  function dateKey(ymd){return(ymd.year<0?"-"+pad(Math.abs(ymd.year),4):pad(ymd.year,4))+"-"+pad(ymd.month,2)+"-"+pad(ymd.day,2);}
  function normalizeDate(input){
    if(typeof input==="string"){var parsed=parseDateKey(input);if(!parsed)throw new RangeError("Invalid Gregorian date key");return parsed;}
    if(input instanceof Date&&!isNaN(input)){return{year:input.getFullYear(),month:input.getMonth()+1,day:input.getDate()};}
    if(input&&typeof input==="object"){var ymd={year:Number(input.year),month:Number(input.month),day:Number(input.day)};assertYmd(ymd.year,ymd.month,ymd.day);return ymd;}
    throw new TypeError("Expected a date key, Date, or {year, month, day}");
  }
  function shiftDate(input,days){var ymd=normalizeDate(input);if(!Number.isInteger(days))throw new TypeError("Day shift must be an integer");return jdnToGregorian(gregorianToJdn(ymd.year,ymd.month,ymd.day)+days);}
  function longCount(dayCount){
    if(!Number.isInteger(dayCount)||dayCount<0)throw new RangeError("Long Count requires a day on or after the GMT epoch");
    if(dayCount===0)return{baktun:13,katun:0,tun:0,uinal:0,kin:0,epochNotation:true,text:"13.0.0.0.0"};
    var rest=dayCount,baktun=Math.floor(rest/144000);rest=mod(rest,144000);var katun=Math.floor(rest/7200);rest=mod(rest,7200);var tun=Math.floor(rest/360);rest=mod(rest,360);var uinal=Math.floor(rest/20),kin=mod(rest,20);
    return{baktun:baktun,katun:katun,tun:tun,uinal:uinal,kin:kin,epochNotation:false,text:[baktun,katun,tun,uinal,kin].join(".")};
  }
  function numeralParts(value){
    if(!Number.isInteger(value)||value<0||value>19)throw new RangeError("Maya bar-and-dot helper accepts 0–19");
    return value===0?{value:0,zero:true,bars:0,dots:0}:{value:value,zero:false,bars:Math.floor(value/5),dots:value%5};
  }
  function calculate(input){
    var ymd=normalizeDate(input),jdn=gregorianToJdn(ymd.year,ymd.month,ymd.day),dayCount=jdn-GMT_CORRELATION;
    if(dayCount<0)throw new RangeError("Selected date precedes the adopted GMT Long Count epoch");
    var count=longCount(dayCount),tzolkinNumber=mod(dayCount+3,13)+1,tzolkinIndex=mod(dayCount+19,20),haabIndex=mod(dayCount+348,365),haabMonth=haabIndex<360?Math.floor(haabIndex/20):18,haabDay=haabIndex<360?haabIndex%20:haabIndex-360,roundIndex=mod(dayCount,CALENDAR_ROUND);
    return{
      gregorian:ymd,dateKey:dateKey(ymd),jdn:jdn,correlation:GMT_CORRELATION,dayCount:dayCount,
      longCount:count,
      tzolkin:{number:tzolkinNumber,index:tzolkinIndex,sign:TZOLKIN[tzolkinIndex],text:tzolkinNumber+" "+TZOLKIN[tzolkinIndex].name,cycleIndex:mod(dayCount,TZOLKIN_LENGTH)},
      haab:{index:haabIndex,day:haabDay,monthIndex:haabMonth,month:HAAB[haabMonth],text:haabDay+" "+HAAB[haabMonth].name,isWayeb:haabMonth===18},
      calendarRound:{index:roundIndex,position:roundIndex+1,length:CALENDAR_ROUND,remaining:CALENDAR_ROUND-roundIndex,text:tzolkinNumber+" "+TZOLKIN[tzolkinIndex].name+" · "+haabDay+" "+HAAB[haabMonth].name},
      cycle:{length:LONG_COUNT_CYCLE,index:mod(dayCount,LONG_COUNT_CYCLE),completed:Math.floor(dayCount/LONG_COUNT_CYCLE)}
    };
  }

  return{
    GMT_CORRELATION:GMT_CORRELATION,TZOLKIN_LENGTH:TZOLKIN_LENGTH,HAAB_LENGTH:HAAB_LENGTH,CALENDAR_ROUND:CALENDAR_ROUND,LONG_COUNT_CYCLE:LONG_COUNT_CYCLE,
    TZOLKIN:TZOLKIN,HAAB:HAAB,LONG_COUNT_UNITS:LONG_COUNT_UNITS,mod:mod,isLeapYear:isLeapYear,daysInMonth:daysInMonth,
    gregorianToJdn:gregorianToJdn,jdnToGregorian:jdnToGregorian,parseDateKey:parseDateKey,dateKey:dateKey,normalizeDate:normalizeDate,shiftDate:shiftDate,
    longCount:longCount,numeralParts:numeralParts,calculate:calculate
  };
});

(function(){
  "use strict";
  if(typeof window==="undefined"||!window.document||!window.OrlojMaya)return;
  var M=window.OrlojMaya,$=function(id){return document.getElementById(id);};
  var MONTHS_CZ=["ledna","února","března","dubna","května","června","července","srpna","září","října","listopadu","prosince"];
  var state={page:"gear",date:null};

  function esc(value){return String(value).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function todayYmd(){var d=new Date();return{year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()};}
  function formatGregorian(ymd){var year=ymd.year>0?ymd.year:(1-ymd.year)+" př. n. l.";return ymd.day+". "+MONTHS_CZ[ymd.month-1]+" "+year;}
  function polar(angle,r){var a=(angle-90)*Math.PI/180;return{x:210+Math.cos(a)*r,y:210+Math.sin(a)*r};}
  function arcPath(start,end,r){var a=polar(start,r),b=polar(end,r),large=end-start>180?1:0;return"M "+a.x.toFixed(2)+" "+a.y.toFixed(2)+" A "+r+" "+r+" 0 "+large+" 1 "+b.x.toFixed(2)+" "+b.y.toFixed(2);}
  function barDot(value,compact){
    var parts=M.numeralParts(value),cls="maya-numeral"+(compact?" compact":"");
    if(parts.zero)return'<span class="'+cls+' zero" aria-label="0"><i>◌</i></span>';
    var dots="",bars="",i;for(i=0;i<parts.dots;i++)dots+="<i></i>";for(i=0;i<parts.bars;i++)bars+="<b></b>";
    return'<span class="'+cls+'" aria-label="'+value+'"><span class="maya-dots">'+dots+'</span><span class="maya-bars">'+bars+'</span></span>';
  }
  function wheel(snapshot){
    var s='<svg viewBox="0 0 420 420" role="img" aria-label="Soukolí Tzolk’inu, Haabu a třinácti čísel pro '+esc(formatGregorian(snapshot.gregorian))+'">';
    s+='<defs><radialGradient id="maya-center"><stop offset="0" stop-color="rgba(102,204,169,.12)"/><stop offset="1" stop-color="rgba(102,204,169,0)"/></radialGradient><filter id="maya-glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    s+='<circle cx="210" cy="210" r="194" fill="rgba(255,255,255,.006)" stroke="rgba(225,191,112,.25)"/><circle cx="210" cy="210" r="163" fill="none" stroke="rgba(225,191,112,.09)"/><circle cx="210" cy="210" r="139" fill="none" stroke="rgba(102,204,169,.22)"/><circle cx="210" cy="210" r="106" fill="none" stroke="rgba(102,204,169,.08)"/><circle cx="210" cy="210" r="83" fill="none" stroke="rgba(215,126,91,.20)"/><circle cx="210" cy="210" r="57" fill="url(#maya-center)" stroke="rgba(245,240,229,.07)"/>';
    var cursor=0;
    M.HAAB.forEach(function(month,i){var span=month.days/365*360,start=cursor,end=cursor+span,mid=start+span/2,a=polar(start,163),b=polar(start,193),label=polar(mid,180),active=i===snapshot.haab.monthIndex;s+='<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="'+(active?'#e1bf70':'rgba(225,191,112,.22)')+'" stroke-width="'+(active?'1.5':'.65')+'"/>';if(active)s+='<path d="'+arcPath(start+0.6,end-0.6,190)+'" fill="none" stroke="#e1bf70" stroke-width="4" stroke-linecap="round" filter="url(#maya-glow)"/>';s+='<text x="'+label.x.toFixed(1)+'" y="'+(label.y+.4).toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" fill="'+(active?'#f3d994':'rgba(245,240,229,.42)')+'" font-size="'+(i===18?'6.5':'7.2')+'" font-weight="'+(active?'750':'560')+'">'+esc(month.name)+'</text>';cursor=end;});
    M.TZOLKIN.forEach(function(sign,i){var angle=i*18,a=polar(angle,107),b=polar(angle,139),label=polar(angle+9,123),active=i===snapshot.tzolkin.index;s+='<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="'+(active?'#66cca9':'rgba(102,204,169,.20)')+'" stroke-width="'+(active?'1.5':'.65')+'"/>';if(active){var hi=polar(angle+9,123);s+='<circle cx="'+hi.x.toFixed(1)+'" cy="'+hi.y.toFixed(1)+'" r="13" fill="rgba(102,204,169,.13)" stroke="rgba(102,204,169,.48)"/>';}s+='<text x="'+label.x.toFixed(1)+'" y="'+(label.y+.5).toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" fill="'+(active?'#a8eed6':'rgba(245,240,229,.38)')+'" font-size="5.8" font-weight="'+(active?'750':'560')+'">'+esc(sign.name)+'</text>';});
    for(var n=1;n<=13;n++){var angle=(n-1)*360/13,a=polar(angle,58),b=polar(angle,83),label=polar(angle+360/26,70),active=n===snapshot.tzolkin.number;s+='<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'" stroke="'+(active?'#d77e5b':'rgba(215,126,91,.22)')+'" stroke-width="'+(active?'1.4':'.65')+'"/>';if(active)s+='<circle cx="'+label.x.toFixed(1)+'" cy="'+label.y.toFixed(1)+'" r="9" fill="rgba(215,126,91,.16)" stroke="rgba(215,126,91,.48)"/>';s+='<text x="'+label.x.toFixed(1)+'" y="'+(label.y+.5).toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" fill="'+(active?'#f0b094':'rgba(245,240,229,.42)')+'" font-size="7.5" font-weight="'+(active?'800':'600')+'">'+n+'</text>';}
    s+='<text x="210" y="199" text-anchor="middle" fill="rgba(245,240,229,.42)" font-size="7.5" letter-spacing="1.2">DLOUHÝ POČET</text><text x="210" y="216" text-anchor="middle" fill="#f5f0e5" font-size="13" font-family="Georgia,serif">'+snapshot.longCount.text+'</text><text x="210" y="231" text-anchor="middle" fill="rgba(245,240,229,.35)" font-size="6.5">GMT 584 283</text></svg>';
    return s;
  }
  function renderOverview(snapshot){
    $("maya-wheel").innerHTML=wheel(snapshot);
    $("maya-date-label").textContent=formatGregorian(snapshot.gregorian);
    $("maya-overview-tzolkin").textContent=snapshot.tzolkin.text;
    $("maya-overview-tzolkin-meta").textContent="K’iche’ jméno "+snapshot.tzolkin.sign.kiche+" · číslo "+snapshot.tzolkin.number+" z 13";
    $("maya-overview-haab").textContent=snapshot.haab.text;
    $("maya-overview-haab-meta").textContent=(snapshot.haab.index+1)+". den z 365"+(snapshot.haab.isWayeb?" · závěrečný Wayeb’":"");
    $("maya-overview-count").textContent=snapshot.longCount.text;
    $("maya-overview-count-meta").textContent=snapshot.dayCount.toLocaleString("cs-CZ")+" dní od epochální kotvy";
    $("maya-overview-round").textContent=snapshot.calendarRound.text;
    $("maya-overview-round-meta").textContent=snapshot.calendarRound.position.toLocaleString("cs-CZ")+". den z 18 980";
    var progress=snapshot.calendarRound.index/snapshot.calendarRound.length*100;$("maya-round-bar").style.width=progress.toFixed(3)+"%";$("maya-round-position").textContent=snapshot.calendarRound.position.toLocaleString("cs-CZ")+" / "+snapshot.calendarRound.length.toLocaleString("cs-CZ");
    var anniversary=$("maya-anniversary");anniversary.hidden=!(snapshot.gregorian.month===8&&snapshot.gregorian.day===11);
    if(!anniversary.hidden)$("maya-anniversary-date").textContent=formatGregorian(snapshot.gregorian);
  }
  function renderTzolkin(snapshot){
    $("maya-tzolkin-current").innerHTML=barDot(snapshot.tzolkin.number)+"<div><span>Aktivní kombinace</span><b>"+esc(snapshot.tzolkin.text)+"</b><small>Yucatecké/epigrafické jméno · v živé k’iche’ tradici "+esc(snapshot.tzolkin.sign.kiche)+"</small></div>";
    $("maya-tzolkin-signs").innerHTML=M.TZOLKIN.map(function(sign,i){var on=i===snapshot.tzolkin.index;return'<article class="maya-sign'+(on?' on':'')+'"><span>'+(i+1).toString().padStart(2,"0")+'</span><b>'+esc(sign.name)+'</b><small>'+esc(sign.kiche)+'</small></article>';}).join("");
    $("maya-thirteen").innerHTML=Array.from({length:13},function(_,i){var n=i+1;return'<article class="maya-number-card'+(n===snapshot.tzolkin.number?' on':'')+'">'+barDot(n,true)+'<b>'+n+'</b></article>';}).join("");
  }
  function renderHaab(snapshot){
    $("maya-haab-current").innerHTML='<div class="maya-haab-day">'+snapshot.haab.day+'</div><div><span>Aktivní datum Haab</span><b>'+esc(snapshot.haab.text)+'</b><small>'+(snapshot.haab.isWayeb?"Wayeb’ má pouze pět dní.":"Měsíc "+(snapshot.haab.monthIndex+1)+" z 18 pravidelných dvacetidenních měsíců.")+'</small></div>';
    $("maya-haab-progress").style.width=((snapshot.haab.index+1)/365*100).toFixed(3)+"%";$("maya-haab-position").textContent=(snapshot.haab.index+1)+" / 365";
    $("maya-haab-months").innerHTML=M.HAAB.map(function(month,i){var on=i===snapshot.haab.monthIndex;return'<article class="maya-month'+(on?' on':'')+'"><span>'+(i+1).toString().padStart(2,"0")+'</span><b>'+esc(month.name)+'</b><small>'+month.days+' dní</small></article>';}).join("");
  }
  function renderLongCount(snapshot){
    var count=snapshot.longCount;
    $("maya-count-value").textContent=count.text;$("maya-count-date").textContent=formatGregorian(snapshot.gregorian)+" · JDN "+snapshot.jdn.toLocaleString("cs-CZ");
    $("maya-count-drums").innerHTML=M.LONG_COUNT_UNITS.map(function(unit){var value=count[unit.id];return'<article>'+barDot(value,true)+'<b>'+value+'</b><span>'+unit.label+'</span><small>'+unit.days.toLocaleString("cs-CZ")+' dní</small></article>';}).join("");
    $("maya-count-equation").innerHTML=M.LONG_COUNT_UNITS.map(function(unit){return'<span><b>'+count[unit.id]+'</b> × '+unit.days.toLocaleString("cs-CZ")+'</span>';}).join('<i>+</i>')+'<i>=</i><strong>'+snapshot.dayCount.toLocaleString("cs-CZ")+' dní</strong>';
    $("maya-selected-row-date").textContent=formatGregorian(snapshot.gregorian);$("maya-selected-row-count").textContent=count.text;$("maya-selected-row-round").textContent=snapshot.calendarRound.text;
  }
  function render(snapshot){
    $("maya-date").value=snapshot.dateKey;renderOverview(snapshot);renderTzolkin(snapshot);renderHaab(snapshot);renderLongCount(snapshot);document.title="Orloj · Mayské kalendárium · "+formatGregorian(snapshot.gregorian);updateUrl(snapshot);
  }
  function updateUrl(snapshot){try{var url=new URL(location.href);url.searchParams.set("view",state.page);url.searchParams.set("date",snapshot.dateKey);history.replaceState(null,"",url);}catch(e){}}
  function activate(page,update){
    if(["gear","tzolkin","haab","count","study"].indexOf(page)<0)page="gear";state.page=page;
    Array.prototype.forEach.call(document.querySelectorAll("[data-maya-page]"),function(button){var on=button.getAttribute("data-maya-page")===page;button.classList.toggle("on",on);button.setAttribute("aria-selected",on?"true":"false");});
    Array.prototype.forEach.call(document.querySelectorAll("[data-maya-panel]"),function(panel){panel.classList.toggle("on",panel.getAttribute("data-maya-panel")===page);});
    if(update)render(M.calculate(state.date));
  }
  function setDate(ymd){state.date=ymd;render(M.calculate(state.date));}
  function init(){
    var page,requestedDate;try{var params=new URL(location.href).searchParams;page=params.get("view");requestedDate=params.get("date");}catch(e){}
    state.date=M.parseDateKey(requestedDate)||todayYmd();
    Array.prototype.forEach.call(document.querySelectorAll("[data-maya-page]"),function(button){button.addEventListener("click",function(){activate(button.getAttribute("data-maya-page"),true);});});
    $("maya-date").addEventListener("change",function(){var parsed=M.parseDateKey($("maya-date").value);if(parsed)setDate(parsed);});
    $("maya-prev").addEventListener("click",function(){setDate(M.shiftDate(state.date,-1));});
    $("maya-next").addEventListener("click",function(){setDate(M.shiftDate(state.date,1));});
    $("maya-today").addEventListener("click",function(){setDate(todayYmd());});
    activate(page||"gear",false);render(M.calculate(state.date));
  }
  init();
})();
