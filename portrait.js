(function(){
  'use strict';
  var P=window.OrlojPortrait,D=window.OrlojDay,A=window.Astronomy,profile,active='map',liveTimer;
  function $(id){return document.getElementById('portrait-'+id);}
  function status(s){$('action-status').textContent=s;}
  function draw(){
    var ps=P.points(profile);$('title').textContent=profile.name?profile.name+' · osobní Orloj':'Osobní Orloj';document.title=$('title').textContent+' · Pansophia';
    $('subtitle').textContent='Mapa z nativu · polohy, symbolika a dnešní souvislosti.';
    $('wheel').innerHTML=P.wheel(profile);
    $('triad').innerHTML=P.triad(profile).map(function(t){return '<article><span>'+t.title+'</span><h2>'+(t.point?P.esc(D.signAt(t.point.lon).name):'—')+'</h2><b>'+(t.point?P.position(t.point):'')+'</b><p>'+t.words+'</p></article>';}).join('');
    var axes=[['ASC',profile.axes.asc],['DSC',profile.axes.asc&&{lon:D.rev(profile.axes.asc.lon+180),approx:profile.axes.asc.approx}],['MC',profile.axes.mc],['IC',profile.axes.mc&&{lon:D.rev(profile.axes.mc.lon+180),approx:profile.axes.mc.approx}]];
    $('axes').innerHTML=axes.filter(function(x){return x[1];}).map(function(x){return '<article class="axis"><span>'+x[0]+'</span><b>'+D.signAt(x[1].lon).name+'</b><small>'+P.position(x[1])+'</small></article>';}).join('');
    $('planets').innerHTML=ps.map(function(p){return '<article class="planet"><i>'+p.glyph+'</i><div><b>'+p.name+'</b><small>'+p.sign.name+'</small></div><em>'+P.position(p)+'</em></article>';}).join('');
    $('cycle').hidden=!profile.cycle;if(profile.cycle){var c=P.cycle(profile.cycle.year);$('cycle').innerHTML='<svg class="snake" viewBox="0 0 104 108" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" aria-hidden="true"><path d="M20 74C-4 45 24 22 54 32S94 76 62 91S17 72 40 61S92 43 80 18"/><path d="M74 21Q65 1 85 5Q103 16 86 30Z" fill="currentColor" stroke-width="1"/></svg><div><span>Čínský rok narození</span><h2>'+c.animal+' · '+c.polarity+' '+c.element+'</h2><small>'+c.name+(profile.cycle.inferred?' · orientačně z poloh planet':'')+'</small></div>';}
    $('extras').innerHTML=profile.extras.map(function(p){return '<p><b>'+P.EXTRAS[p.id]+'</b><small>'+P.signPosition(p)+'</small></p>';}).join('');
    $('readings').innerHTML=P.readings(profile).map(function(r){return '<article class="reading"><div class="reading-head"><span>'+r.a.name+' '+r.glyph+' '+r.b.name+'</span><small>orb '+P.orbLabel(r)+'</small></div><h3>'+r.title+'</h3><p>'+r.copy+'</p></article>';}).join('')||'<p>Pro tuto mapu se zde zobrazují všechny vypočítané aspekty níže.</p>';
    $('all-aspects').innerHTML=P.aspects(profile).map(function(a){return '<p><b>'+a.a.name+' '+a.glyph+' '+a.b.name+'</b><small>'+a.name+' · orb '+P.orbLabel(a)+'</small></p>';}).join('');
  }
  function drawNow(){
    var now=new Date(),r=P.liveHits(A,now,profile),moon=r.points.find(function(p){return p.id==='moon';});$('now-time').dateTime=now.toISOString();$('now-time').textContent=new Intl.DateTimeFormat('cs-CZ',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(now);
    $('now-moon').innerHTML='<b>'+P.esc(r.moon.name)+'</b>'+Math.round(r.moon.illumination*100)+' % osvětlení<span>Luna '+P.esc(moon.sign.name)+' · '+D.fmtDeg(moon.sign.degree)+'</span>';
    $('live-hits').innerHTML=r.hits.map(function(h){return '<article class="live-hit"><i>'+h.transit.glyph+' '+h.glyph+' '+h.natal.glyph+'</i><div><b>'+h.transit.name+' · '+h.name.toLowerCase()+' · nativní '+h.natal.name+'</b><small>orb '+P.orbLabel(h)+(h.approx?' · orientační nativní poloha':'')+'</small></div></article>';}).join('')||'<p>V orbu 2° právě není těsný aspekt sledovaných planet k této mapě.</p>';
  }
  function panel(name){if(['map','aspects','now'].indexOf(name)<0)return;active=name;['map','aspects','now'].forEach(function(k){$(k).hidden=k!==name;});document.querySelectorAll('[data-panel]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.panel===name));});if(name==='now')drawNow();}
  async function share(){var url=new URL(location.href);url.search='';url.hash=P.encode(profile);try{if(navigator.share){await navigator.share({title:document.title,url:url.href});status('Mapa je připravená ke sdílení.');}else if(navigator.clipboard){await navigator.clipboard.writeText(url.href);status('Odkaz na tuto mapu je zkopírovaný.');}else prompt('Odkaz na tuto mapu',url.href);}catch(e){if(e.name!=='AbortError')prompt('Odkaz na tuto mapu',url.href);}}
  async function exportImage(){
    var button=$('export');button.disabled=true;status('Připravuji obrázek…');var src,download;
    try{var svg=P.poster(profile);src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));var img=new Image();await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=reject;img.src=src;});var canvas=document.createElement('canvas');canvas.width=1600;canvas.height=2820;canvas.getContext('2d').drawImage(img,0,0);var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png');});if(!blob)throw Error('Export');var slug=(profile.name||'Osobni-mapa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]/g,'-').slice(0,40),file=new File([blob],'Orloj-'+slug+'.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:document.title});status('Obrázek je připravený ke sdílení.');}else{download=URL.createObjectURL(blob);var a=document.createElement('a');a.href=download;a.download=file.name;a.click();status('Obrázek je připravený ke stažení.');}}
    catch(e){status(e.name==='AbortError'?'Sdílení bylo zavřené.':'Obrázek se nepodařilo připravit. Zkuste to znovu.');}finally{button.disabled=false;if(src)URL.revokeObjectURL(src);if(download)setTimeout(function(){URL.revokeObjectURL(download);},60000);}
  }
  function load(){try{profile=P.decode(location.hash);$('notice').hidden=true;}catch(e){profile=P.validate(P.DEMO);$('notice').textContent='Odkaz se nepodařilo načíst. Zobrazuje se ukázková mapa.';$('notice').hidden=false;}draw();panel(active);}
  document.querySelectorAll('[data-panel]').forEach(function(b){b.addEventListener('click',function(){panel(b.dataset.panel);});});$('share').addEventListener('click',share);$('export').addEventListener('click',exportImage);window.addEventListener('hashchange',load);window.addEventListener('pagehide',function(){clearInterval(liveTimer);});load();liveTimer=setInterval(function(){if(active==='now'&&!document.hidden)drawNow();},60000);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=public-v11-13-portrait',{scope:'./'}).catch(function(){});
})();
