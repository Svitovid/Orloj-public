(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./day-profile.js'));
  else root.OrlojPortrait=factory(root.OrlojDay);
})(typeof self!=='undefined'?self:this,function(D){
  'use strict';
  var META=D.BODY_META,EXTRAS=['Severní uzel','Lilith','Chiron','Bod štěstí','Juno','Pallas','Vertex'];
  // A chart transcribed from a published wheel. No birth date, time or place is inferred.
  var DEMO={v:1,name:'',points:[
    {id:'sun',lon:355+47/60,approx:false},{id:'moon',lon:259,approx:true},
    {id:'mercury',lon:328+53/60,approx:false},{id:'venus',lon:16+34/60,approx:false},
    {id:'mars',lon:254,approx:true},{id:'jupiter',lon:65+6/60,approx:false},
    {id:'saturn',lon:56+19/60,approx:false},{id:'uranus',lon:322+45/60,approx:false},
    {id:'neptune',lon:307+58/60,approx:false},{id:'pluto',lon:255,approx:true}],
    axes:{asc:{lon:68+34/60,approx:true},mc:{lon:306+57/60,approx:false}},
    extras:[{id:0,lon:102+27/60,approx:false},{id:1,lon:312+15/60,approx:false},
      {id:2,lon:268,approx:true},{id:3,lon:332+33/60,approx:false},
      {id:4,lon:4,approx:true},{id:5,lon:254,approx:true},{id:6,lon:211+3/60,approx:false}],
    cycle:{year:2001,inferred:true}};
  var CUES=[
    {a:'mars',b:'pluto',angle:0,title:'Síla proměny',short:'Odhodlání jít do hloubky. Síla roste, když dostane vědomý směr.',copy:'Mars s Plutem symbolicky spojuje vůli a intenzitu. Potenciálem je vytrvalost a odvaha pustit se do náročné proměny; výzvou může být tlak mít vše pod kontrolou.'},
    {a:'mercury',b:'saturn',angle:90,title:'Slova s vahou',short:'Originální nápad hledá přesný tvar. Důslednost místo přísnosti k sobě.',copy:'Kvadratura Merkuru se Saturnem staví vedle sebe vlastní nápad a potřebu přesnosti. Může podporovat promyšlené vyjadřování; užitečné je dát prostor i myšlenkám, které ještě nejsou dokonalé.'},
    {a:'venus',b:'mars',angle:120,title:'Tvořivost v pohybu',short:'Spontánnost, chuť tvořit a odvaha proměnit zalíbení v čin.',copy:'Trigon Venuše a Marsu symbolicky propojuje to, co se líbí, s ochotou jednat. Nabízí přirozenou cestu od nápadu k tvorbě, od zájmu k vlastnímu kroku.'},
    {a:'moon',b:'pluto',angle:0,title:'Prožívání do hloubky',short:'Pod povrchem záleží na opravdovosti. Prostor pro cit i svobodný nádech.',copy:'Luna s Plutem je v astrologické symbolice obrazem intenzivního prožívání a zájmu o to, co je pod povrchem. Otázkou k zamyšlení je, kdy hloubka pomáhá a kdy je příjemné nechat věci volně plynout.'},
    {a:'sun',b:'saturn',angle:60,title:'Vize získává tvar',short:'Představivost má oporu ve vytrvalosti. Vize může dostat konkrétní podobu.',copy:'Sextil Slunce se Saturnem nabízí symbolické spojení osobního směru a trpělivosti. Osobní vize může získávat pevný tvar v dovednosti, řemesle nebo postupně budovaném díle.'},
    {a:'jupiter',b:'neptune',angle:120,title:'Velké vize',short:'Zvědavost a obrazotvornost se potkávají. Inspirace hledá ověřitelný krok.',copy:'Trigon Jupitera a Neptunu je symbolickým mostem mezi hledáním smyslu a obrazotvorností. Otevírá prostor pro inspiraci a široký rozhled; oporou je převést vizi do jednoho konkrétního kroku.'}
  ];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function point(p){if(!p||typeof p.lon!=='number'||!isFinite(p.lon)||p.lon<0||p.lon>=360)throw Error('Invalid longitude');return {lon:p.lon,approx:p.approx===true};}
  function validate(raw){
    if(!raw||raw.v!==1||!Array.isArray(raw.points)||raw.points.length!==10)throw Error('Invalid chart');
    var ids={},points=raw.points.map(function(p){if(!META.some(function(m){return m.id===p.id;})||ids[p.id])throw Error('Invalid body');ids[p.id]=true;return Object.assign({id:p.id},point(p));});
    points.sort(function(a,b){return META.findIndex(function(m){return m.id===a.id;})-META.findIndex(function(m){return m.id===b.id;});});
    var out={v:1,name:String(raw.name||'').trim().slice(0,48),points:points,axes:{},extras:[]};
    ['asc','mc'].forEach(function(key){if(raw.axes&&raw.axes[key])out.axes[key]=point(raw.axes[key]);});
    if(Array.isArray(raw.extras)){var seen={};raw.extras.slice(0,7).forEach(function(p){if(Number.isInteger(p.id)&&p.id>=0&&p.id<EXTRAS.length&&!seen[p.id]){seen[p.id]=true;out.extras.push(Object.assign({id:p.id},point(p)));}});}
    if(raw.cycle&&Number.isInteger(raw.cycle.year)&&raw.cycle.year>=1900&&raw.cycle.year<=2100)out.cycle={year:raw.cycle.year,inferred:raw.cycle.inferred!==false};
    return out;
  }
  function points(profile){return profile.points.map(function(p){return Object.assign({},META.find(function(m){return m.id===p.id;}),p,{sign:D.signAt(p.lon)});});}
  function triad(profile){var words=['Iniciativa · odvaha','Stálost · smyslovost','Zvídavost · komunikace','Péče · vnitřní svět','Tvořivost · sebevyjádření','Rozlišování · dovednost','Vztahy · rovnováha','Hloubka · proměna','Svoboda · hledání smyslu','Vytrvalost · konkrétní směr','Originalita · nové souvislosti','Citlivost · představivost'],ps=points(profile);return [['SLUNCE',ps[0]],['LUNA',ps[1]],['ASCENDENT',profile.axes.asc]].map(function(t){return {title:t[0],point:t[1],words:t[1]?words[Math.floor(t[1].lon/30)]:''};});}
  function position(p){var deg=p.lon%30;return (p.approx?'≈ '+Math.floor(deg)+'°':D.fmtDeg(deg));}
  function signPosition(p){return D.signAt(p.lon).name+' · '+position(p);}
  function aspects(profile){return D.aspects(points(profile)).map(function(a){return Object.assign({},a,{approx:a.a.approx||a.b.approx});});}
  function readings(profile){var list=aspects(profile);return CUES.map(function(c){var hit=list.find(function(a){return a.angle===c.angle&&((a.a.id===c.a&&a.b.id===c.b)||(a.a.id===c.b&&a.b.id===c.a));});return hit?Object.assign({},hit,c,{a:hit.a,b:hit.b}):null;}).filter(Boolean);}
  function orbLabel(a){return (a.approx?'≈ ':'')+a.orb.toFixed(1).replace('.',',')+'°';}
  function cycle(year){var animals=['Krysa','Buvol','Tygr','Králík','Drak','Had','Kůň','Koza','Opice','Kohout','Pes','Vepř'],stems=['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'],branches=['zi','chou','yin','mao','chen','si','wu','wei','shen','you','xu','hai'],elements=['dřevo','oheň','země','kov','voda'],offset=((year-1984)%60+60)%60,s=offset%10,b=offset%12;return {animal:animals[b],element:elements[Math.floor(s/2)],polarity:s%2?'jinový':'jangový',name:stems[s]+'-'+branches[b]};}
  function encode(profile){var p=validate(profile),raw={v:1,n:p.name,p:p.points.map(function(x){return [META.findIndex(function(m){return m.id===x.id;}),x.lon,x.approx?1:0];}),a:['asc','mc'].map(function(k){var x=p.axes[k];return x?[x.lon,x.approx?1:0]:null;}),e:p.extras.map(function(x){return [x.id,x.lon,x.approx?1:0];}),c:p.cycle?[p.cycle.year,p.cycle.inferred?1:0]:null},bytes=new TextEncoder().encode(JSON.stringify(raw)),s=typeof Buffer!=='undefined'?Buffer.from(bytes).toString('base64'):btoa(String.fromCharCode.apply(null,bytes));return '#map='+s.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(hash){
    var params=new URLSearchParams(String(hash||'').replace(/^#/,''));
    if(!params.has('map')){var sample=validate(DEMO);sample.name=String(params.get('n')||'').trim().slice(0,48);return sample;}
    var s=params.get('map');if(!s||s.length>8192||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid link');
    var b=s.replace(/-/g,'+').replace(/_/g,'/'),bytes=typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(b,'base64')):Uint8Array.from(atob(b),function(c){return c.charCodeAt(0);}),r=JSON.parse(new TextDecoder().decode(bytes));
    return validate({v:r.v,name:r.n,points:(r.p||[]).map(function(x){return {id:META[x[0]]&&META[x[0]].id,lon:x[1],approx:x[2]===1};}),axes:{asc:r.a&&r.a[0]?{lon:r.a[0][0],approx:r.a[0][1]===1}:null,mc:r.a&&r.a[1]?{lon:r.a[1][0],approx:r.a[1][1]===1}:null},extras:(r.e||[]).map(function(x){return {id:x[0],lon:x[1],approx:x[2]===1};}),cycle:r.c?{year:r.c[0],inferred:r.c[1]===1}:null});
  }
  function liveHits(A,at,profile){var live=D.snapshot(A,at),natal=points(profile),hits=[];live.filter(function(t){return ['mars','jupiter','saturn','uranus','neptune','pluto'].indexOf(t.id)>=0;}).forEach(function(t){natal.forEach(function(n){var d=D.angularSeparation(t.lon,n.lon);D.ASPECTS.forEach(function(a){var orb=Math.abs(d-a.angle);if(orb<=2)hits.push({transit:t,natal:n,glyph:a.glyph,name:a.name,orb:orb,approx:n.approx});});});});return {at:at,moon:D.moonPhase(A,at),points:live,hits:hits.sort(function(a,b){return a.orb-b.orb;}).slice(0,8)};}
  function star(x,y,r){var p=[];for(var i=0;i<16;i++){var a=(-90+i*22.5)*Math.PI/180,q=i%2?r*.34:r;p.push((x+q*Math.cos(a)).toFixed(2)+','+(y+q*Math.sin(a)).toFixed(2));}return p.join(' ');}
  function wheel(profile,size){
    var cx=400,cy=400,asc=profile.axes.asc?profile.axes.asc.lon:0,radii={sun:258,moon:263,mercury:262,venus:259,mars:166,jupiter:264,saturn:246,uranus:208,neptune:255,pluto:215},ps=points(profile),out=[];
    function at(lon,r){var a=(180+lon-asc)*Math.PI/180;return [cx+r*Math.cos(a),cy-r*Math.sin(a)];}
    function ln(a,b,col,opacity,w){out.push('<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+col+'" opacity="'+opacity+'" stroke-width="'+(w||1)+'"/>');}
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="'+(size||800)+'" height="'+(size||800)+'" role="img" aria-label="Planety ve znameních"><defs><radialGradient id="dial"><stop stop-color="#333044"/><stop offset="1" stop-color="#161e2d"/></radialGradient></defs><circle cx="400" cy="400" r="354" fill="url(#dial)" stroke="#d3b98a" stroke-width="1.6"/>');
    [343,299,287,235,179,125].forEach(function(r){out.push('<circle cx="400" cy="400" r="'+r+'" fill="none" stroke="#d3b98a" opacity="'+(r>287?'.35':'.12')+'"/>');});
    for(var d=0;d<360;d++)ln(at(d,344),at(d,d%30===0?331:d%5===0?336:341),'#d3b98a',.6,d%5===0?1:.6);
    for(var i=0;i<12;i++){ln(at(i*30,299),at(i*30,342),'#d3b98a',.35);var sg=at(i*30+15,321);out.push('<text x="'+sg[0]+'" y="'+(sg[1]+12)+'" text-anchor="middle" font-family="DejaVu Sans,sans-serif" font-size="34" fill="#d3b98a">'+D.SIGN_GLYPHS[i]+'</text>');}
    readings(profile).forEach(function(a){ln(at(a.a.lon,radii[a.a.id]),at(a.b.lon,radii[a.b.id]),a.color,.23,1.3);});
    ps.forEach(function(p){var v=at(p.lon,radii[p.id]);ln(v,at(p.lon,286),p.color,.28);out.push('<circle cx="'+v[0]+'" cy="'+v[1]+'" r="24" fill="#262736" stroke="'+p.color+'" stroke-width="1.3"/><text x="'+v[0]+'" y="'+(v[1]+10)+'" font-family="DejaVu Sans,sans-serif" font-size="30" fill="'+p.color+'" text-anchor="middle">'+p.glyph+'</text>');});
    ['asc','mc'].forEach(function(k){if(!profile.axes[k])return;var v=at(profile.axes[k].lon,377);ln(at(profile.axes[k].lon,355),v,'#d3b98a',.7,1.5);out.push('<text x="'+v[0]+'" y="'+(v[1]-8)+'" font-family="DejaVu Sans,sans-serif" font-size="15" fill="#d3b98a" text-anchor="middle">'+k.toUpperCase()+'</text>');});
    out.push('<polygon points="'+star(cx,cy-27,54)+'" fill="#d3b98a"/><text x="400" y="458" fill="#f1e6d3" font-family="Georgia,DejaVu Serif,serif" font-size="46" text-anchor="middle">Nativ</text><text x="400" y="494" fill="#b8a58e" font-family="DejaVu Sans,sans-serif" font-size="14" letter-spacing="3" text-anchor="middle">OSOBNÍ NEBE</text></svg>');return out.join('');
  }
  function snake(x,y){return '<g transform="translate('+x+' '+y+')" fill="none" stroke="#c4a276" stroke-width="6" stroke-linecap="round"><path d="M10 67C-18 42 28 12 52 30S93 72 61 87S9 67 34 56S92 39 80 13"/><path d="M74 16Q64 -5 85 1Q107 10 86 26Z" fill="#c4a276" stroke-width="1"/><circle cx="86" cy="9" r="2" fill="#32293b" stroke="none"/></g>';}
  function poster(profile){
    var p=validate(profile),ps=points(p),rs=readings(p).slice(0,6),h=2820,out=[],paper='#f4ede6',ink='#382e38',gold='#9e7b54',muted='#7b6e75';
    function tx(x,y,s,sz,col,extra){out.push('<text x="'+x+'" y="'+y+'" font-size="'+sz+'" fill="'+(col||ink)+'" '+(extra||'')+'>'+esc(s)+'</text>');}
    function sf(x,y,s,sz,col,extra){tx(x,y,s,sz,col,'style="font-family:Bitstream Charter,DejaVu Serif,serif" '+(extra||''));}
    function rc(x,y,w,hh,fill,stroke){out.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+hh+'" rx="18" fill="'+fill+'" stroke="'+(stroke||'none')+'"/>');}
    function wrap(s,n){var words=s.split(' '),rows=[''];words.forEach(function(w){var i=rows.length-1;if((rows[i]+' '+w).trim().length>n)rows.push(w);else rows[i]=(rows[i]+' '+w).trim();});return rows;}
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="'+h+'" viewBox="0 0 1600 '+h+'"><style>text{font-family:DejaVu Sans,sans-serif}</style><rect width="1600" height="'+h+'" fill="'+paper+'"/><rect x="30" y="30" width="1540" height="'+(h-60)+'" rx="16" fill="none" stroke="#d8cbbd"/>');
    out.push('<polygon points="'+star(110,100,29)+'" fill="'+gold+'"/>');sf(157,115,'ORLOJ',44);tx(1515,109,'PANSOPHIA',21,gold,'text-anchor="end" letter-spacing="3"');
    var title=p.name?p.name+' · osobní Orloj':'Osobní Orloj';sf(80,248,title,Math.min(102,2300/title.length));tx(85,302,'Čtení nativu · mapa podle předlohy',29,muted);tx(1515,297,'NA MÍRU',20,gold,'text-anchor="end" letter-spacing="3"');
    rc(80,344,1440,684,'#1c2231','#504654');out.push('<svg x="100" y="347" width="718" height="676" viewBox="0 0 800 800">'+wheel(p).replace(/^<svg[^>]+>/,'').replace(/<\/svg>$/,'')+'</svg>');
    triad(p).forEach(function(c,i){var y=371+i*208;rc(902,y,580,190,'#302c3e','#554859');tx(929,y+36,c.title,20,'#d3b98a','letter-spacing="3"');if(c.point){sf(929,y+97,D.signAt(c.point.lon).name,58,'#f1e6d3');tx(929,y+139,position(c.point),34,'#d3b98a');tx(929,y+171,c.words,25,'#c8bdc5');}});
    var axes=[['ASC',p.axes.asc],['DSC',p.axes.asc&&{lon:D.rev(p.axes.asc.lon+180),approx:p.axes.asc.approx}],['MC',p.axes.mc],['IC',p.axes.mc&&{lon:D.rev(p.axes.mc.lon+180),approx:p.axes.mc.approx}]];
    axes.forEach(function(a,i){if(!a[1])return;var x=80+i*366;rc(x,1052,342,92,'#eae0d8');tx(x+21,1083,a[0],18,gold,'letter-spacing="2"');sf(x+21,1123,D.signAt(a[1].lon).name,32);tx(x+320,1123,position(a[1]),27,muted,'text-anchor="end"');});
    sf(82,1223,'Planety osobní mapy',48);
    for(var col=0;col<2;col++){var x=80+col*734;rc(x,1252,706,422,'#faf6f0','#ddd0c3');for(var row=0;row<5;row++){var body=ps[col*5+row],y=1252+row*84;if(row)out.push('<path d="M'+(x+24)+' '+y+'H'+(x+682)+'" stroke="#ddd0c3"/>');tx(x+23,y+51,body.glyph,37,gold);tx(x+83,y+32,body.name,27,ink,'font-weight="600"');sf(x+83,y+68,body.sign.name,31);tx(x+680,y+58,position(body),29,gold,'text-anchor="end"');}}
    sf(82,1754,'Vaše hlavní vazby',50);tx(1515,1748,'Symbolické čtení',22,muted,'text-anchor="end"');
    rs.forEach(function(a,i){var x=80+(i%2)*734,y=1784+Math.floor(i/2)*182;rc(x,y,706,161,'#eae0d8');tx(x+23,y+31,a.a.name+' '+(a.angle===60?'✶':a.glyph)+' '+a.b.name,21,gold);tx(x+681,y+31,'orb '+orbLabel(a),20,muted,'text-anchor="end"');sf(x+23,y+75,a.title,36);wrap(a.short,48).slice(0,2).forEach(function(r,k){tx(x+24,y+113+k*30,r,24,muted);});});
    var yy=2340;if(p.cycle){var cc=cycle(p.cycle.year);rc(80,yy,1440,158,'#302b3b');out.push(snake(121,yy+37));tx(257,yy+38,'ČÍNSKÝ ROK NAROZENÍ',21,'#d3b98a','letter-spacing="3"');sf(256,yy+99,cc.animal+' · '+cc.polarity+' '+cc.element,55,'#f1e6d3');tx(1483,yy+61,cc.name,32,'#d3b98a','text-anchor="end"');tx(1483,yy+109,p.cycle.inferred?'orientačně z poloh planet':'čínský roční cyklus',22,'#c8bdc5','text-anchor="end"');}
    if(p.extras.length){tx(82,2534,'DALŠÍ BODY',20,gold,'letter-spacing="3"');rc(80,2550,1440,155,'#faf6f0','#ddd0c3');p.extras.forEach(function(e,i){var x=102+(i%4)*356,y=2577+Math.floor(i/4)*77;tx(x,y,EXTRAS[e.id].toLocaleUpperCase('cs'),17,gold,'letter-spacing="1"');sf(x,y+31,signPosition(e),26,ink);});}
    out.push('<path d="M82 2727H1518" stroke="#d8cbbd"/>');tx(83,2770,'ORLOJ · OSOBNÍ OBSERVATOŘ ČASU',20,gold,'letter-spacing="2"');tx(1516,2770,'≈ orientační údaj · astrologická symbolika',20,muted,'text-anchor="end"');out.push('</svg>');return out.join('');
  }
  return {DEMO:DEMO,EXTRAS:EXTRAS,validate:validate,points:points,triad:triad,position:position,signPosition:signPosition,aspects:aspects,readings:readings,orbLabel:orbLabel,cycle:cycle,encode:encode,decode:decode,liveHits:liveHits,wheel:wheel,poster:poster,esc:esc};
});
