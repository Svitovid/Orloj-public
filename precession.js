/* Canvas renderer and controls for the Precese Obraz. Geometry: precession-core.js. */

  (function(){
    'use strict';
    const root=document.getElementById('orloj-precession');
    if (window.OrlojAppearance) window.OrlojAppearance.mount();
    const status=document.getElementById('op-status');
    function fail(message){status.textContent=message;status.hidden=false;root.querySelectorAll('button,input').forEach(x=>x.disabled=true);}
    if(!window.OrlojPrecessionData||!window.OrlojPrecession){fail('Model se nepodařilo načíst. Obnov stránku po připojení.');return;}
    const engine=window.OrlojPrecession.create(window.OrlojPrecessionData);
    const el=function(id){return root.querySelector('#'+id);};
    const D=window.OrlojPrecessionData;
    const canvas=el('op-canvas'),ctx=canvas.getContext('2d');
    if(!ctx){fail('Prohlížeč nemá dostupné vykreslení modelu.');return;}
    const tau=Math.PI*2,rad=Math.PI/180,deg=180/Math.PI;
    const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
    const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const norm=a=>mul(a,1/Math.hypot(a[0],a[1],a[2]));
    const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
    const wrap=x=>((x%360)+360)%360;
    const wrap180=x=>wrap(x+180)-180;
    const eqToWorld=v=>[v[0],D.cosE*v[1]+D.sinE*v[2],-D.sinE*v[1]+D.cosE*v[2]];
    const names={Psc:['Ryby','♓'],Aqr:['Vodnář','♒'],Ari:['Beran','♈'],Tau:['Býk','♉'],Gem:['Blíženci','♊'],Cnc:['Rak','♋'],Leo:['Lev','♌'],Vir:['Panna','♍'],Lib:['Váhy','♎'],Sco:['Štír','♏'],Oph:['Hadonoš','⛎'],Sgr:['Střelec','♐'],Cap:['Kozoroh','♑'],Cet:['Velryba',''],Ori:['Orion','']};
    const zodiac=['Ari','Tau','Gem','Cnc','Leo','Vir','Lib','Sco','Sgr','Cap','Aqr','Psc'];
    const nowEpoch=()=>clamp(window.OrlojPrecession.julianEpoch(new Date()),engine.minimum,engine.maximum);
    const S={year:nowEpoch(),mode:'iau',range:'detail',view:'space',offset:0,playing:false,yaw:55*rad,pitch:45*rad};
    const colors={gold:'#ffda8f',blue:'#78b8ff',purple:'#b0a0ff',text:'#edf3ff',muted:'#a6b6cf',teal:'#70dbc3',faint:'#38506a'};
    let W=700,H=440,scale=95,cx=350,cy=220,dpr=1,fontScale=1,canvasFont='system-ui,sans-serif',R,U,C,frame=null,lastTick=0,lastRender=0,announced=0;
    let sphereCanvas=document.createElement('canvas'),sphereCtx=sphereCanvas.getContext('2d'),sphereData=null,sphereNormals=[],tex=null;
    const image=new Image();
    image.onload=function(){const t=document.createElement('canvas');t.width=image.width;t.height=image.height;const c=t.getContext('2d');c.drawImage(image,0,0);tex={data:c.getImageData(0,0,t.width,t.height).data,w:t.width,h:t.height};requestDraw();};
    image.onerror=function(){status.textContent='Textura Země není dostupná; geometrie modelu zůstává funkční.';status.hidden=false;requestDraw();};
    image.src=D.earth;
    const sample=engine.sample, iauCode=engine.iauCode, angle=engine.angle, iauSegments=engine.iauSegments;
    const anchor=m=>engine.anchor(m,S.offset);
    const region=()=>engine.region(S.year,S.mode,S.offset);
    function segments(m){if(S.mode==='iau')return iauSegments(S.year);const start=anchor(m),r=[];for(let i=0;i<12;i++)r.push([wrap(start+i*30),zodiac[i]]);r.sort((a,b)=>a[0]-b[0]);if(r[0][0]>.00001)r.unshift([0,r[r.length-1][1]]);return r;}
    const boundary=()=>engine.boundary(S.mode,S.offset);
    function yearText(y){const n=Math.floor(y);return(n<=0?1-n:n).toLocaleString('cs-CZ');}
    function fullYear(y){return yearText(y)+(Math.floor(y)<=0?' př. n. l.':'');}
    function formatAngle(x,p){return x.toLocaleString('cs-CZ',{minimumFractionDigits:p,maximumFractionDigits:p})+'°';}
    function sync(announce){const m=sample(S.year),code=region(m),nm=names[code]||[code,''];el('op-year').textContent=yearText(S.year);el('op-year-era').textContent=(Math.floor(S.year)<=0?'př. n. l.':'n. l.')+' · jarní bod';el('op-region').textContent=(nm[1]?nm[1]+' ':'')+nm[0];el('op-obliquity').textContent=formatAngle(m.obl,2);el('op-time').value=String(Math.floor(S.year));el('op-time').setAttribute('aria-valuetext','Rok '+fullYear(S.year)+', '+(S.mode==='iau'?'souhvězdí ':'sektor ')+nm[0]);el('op-crossing-year').textContent='≈ '+Math.round(boundary()).toLocaleString('cs-CZ');el('op-boundary-label').textContent='Ryby → Vodnář · '+(S.mode==='iau'?'hranice IAU':'zvolená kotva');el('op-shift-wrap').hidden=S.mode!=='equal';el('op-shift-value').textContent=(S.offset>0?'+':'')+formatAngle(S.offset,1);if(announce)el('op-live').textContent='Rok '+fullYear(S.year)+'. Jarní bod: '+nm[0]+'. Sklon osy '+formatAngle(m.obl,2)+'.';canvas.setAttribute('aria-label','Model precese, rok '+fullYear(S.year)+'. Jarní bod: '+nm[0]+'. Sklon osy '+formatAngle(m.obl,2)+'.');requestDraw();}
    function setRange(r){S.range=r;const a=r==='detail'?1600:-12000,b=r==='detail'?3200:14000;el('op-time').min=String(a);el('op-time').max=String(b);S.year=clamp(S.year,a,b);el('op-range-min').textContent=fullYear(a);el('op-range-max').textContent=fullYear(b);el('op-rate').textContent=(r==='detail'?'40':'400')+' let / s při přehrávání';root.querySelectorAll('[data-range]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.range===r)));sync(true);}
    function stop(){S.playing=false;el('op-play').setAttribute('aria-pressed','false');el('op-play').textContent='Přehrát';el('op-play').setAttribute('aria-label','Přehrát pohyb precese');lastTick=0;requestDraw();}
    function requestDraw(){if(frame===null)frame=requestAnimationFrame(tick);}
    function tick(ts){frame=null;if(S.playing){if(lastTick){const dt=Math.min((ts-lastTick)/1000,.12);S.year+=dt*(S.range==='detail'?40:400);if(S.year>=Number(el('op-time').max)){S.year=Number(el('op-time').max);stop();}}lastTick=ts;if(ts-lastRender>45){sync(false);draw();lastRender=ts;}if(ts-announced>1500){el('op-live').textContent='Rok '+fullYear(S.year)+'.';announced=ts;}requestDraw();}else{draw();lastRender=ts;}}
    function camera(){C=[Math.cos(S.pitch)*Math.cos(S.yaw),Math.cos(S.pitch)*Math.sin(S.yaw),Math.sin(S.pitch)];R=[-Math.sin(S.yaw),Math.cos(S.yaw),0];U=cross(C,R);}
    function project(v){return{x:cx+dot(v,R)*scale,y:cy-dot(v,U)*scale,z:dot(v,C)};}
    function ringPoint(m,a,r){return eqToWorld(add(mul(m.bx,Math.cos(a)*r),mul(m.by,Math.sin(a)*r)));}
    function initSphere(){const n=Math.min(200,Math.max(108,Math.round(scale*1.64*dpr)));if(sphereCanvas.width===n&&sphereData)return;sphereCanvas.width=n;sphereCanvas.height=n;sphereData=sphereCtx.createImageData(n,n);sphereNormals=[];const mid=n/2;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const nx=(x+.5-mid)/mid,ny=(mid-y-.5)/mid,r2=nx*nx+ny*ny;if(r2<=1){const nz=Math.sqrt(1-r2);sphereNormals.push([4*(y*n+x),nx,ny,nz]);}}}
    function earth(m){const radius=scale*.79;const glow=ctx.createRadialGradient(cx,cy,radius*.93,cx,cy,radius*1.22);glow.addColorStop(0,'#559dff26');glow.addColorStop(.5,'#3d91ed14');glow.addColorStop(1,'#3d91ed00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,radius*1.22,0,tau);ctx.fill();if(!tex){const g=ctx.createRadialGradient(cx-radius*.3,cy-radius*.3,0,cx,cy,radius);g.addColorStop(0,'#6795b0');g.addColorStop(.8,'#24425c');g.addColorStop(1,'#0e1f31');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,radius,0,tau);ctx.fill();return;}initSphere();const z=eqToWorld(m.n),x=eqToWorld(m.q),y=cross(z,x);const rr=[dot(R,x),dot(R,y),dot(R,z)],uu=[dot(U,x),dot(U,y),dot(U,z)],cc=[dot(C,x),dot(C,y),dot(C,z)];const out=sphereData.data;for(const v of sphereNormals){const k=v[0],nx=v[1],ny=v[2],nz=v[3],ex=rr[0]*nx+uu[0]*ny+cc[0]*nz,ey=rr[1]*nx+uu[1]*ny+cc[1]*nz,ez=rr[2]*nx+uu[2]*ny+cc[2]*nz;const lon=Math.atan2(ey,ex)+.7,lat=Math.asin(clamp(ez,-1,1));const tx=((Math.floor((lon/tau+.5)*tex.w)%tex.w)+tex.w)%tex.w,ty=clamp(Math.floor((.5-lat/Math.PI)*tex.h),0,tex.h-1),j=4*(ty*tex.w+tx);const light=.2+.82*Math.max(0,-.38*nx+.35*ny+.85*nz),rim=Math.pow(1-nz,4)*.38;out[k]=Math.min(255,tex.data[j]*light+28*rim);out[k+1]=Math.min(255,tex.data[j+1]*light+98*rim);out[k+2]=Math.min(255,tex.data[j+2]*light+180*rim);out[k+3]=255;}sphereCtx.putImageData(sphereData,0,0);ctx.drawImage(sphereCanvas,cx-radius,cy-radius,radius*2,radius*2);}
    function draw(){camera();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);const m=sample(S.year),q=eqToWorld(m.q),n=eqToWorld(m.n),e=eqToWorld(m.e),code=region(m),segs=segments(m),labels=[];const narrow=W<500;const lineSegs=[];
      const label=function(text,x,y,color,align,size,priority){ctx.font=(priority?'500 ':'400 ')+((size||12)*fontScale)+'px '+canvasFont;const width=ctx.measureText(text).width,h=(size||12)*fontScale;let l=align==='center'?x-width/2:align==='right'?x-width:x;let top=y-h/2;if(priority){if(l<8){x+=8-l;l=8;}if(l+width>W-8){x-=l+width-(W-8);l=W-8-width;}}if(l<8||l+width>W-8||top<8||top+h>H-8)return false;if(labels.some(b=>l<b[2]+5&&l+width>b[0]-5&&top<b[3]+5&&top+h>b[1]-5))return false;labels.push([l,top,l+width,top+h]);ctx.fillStyle=color;ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillText(text,x,y);return true;};
      labels.push([15,8,165*fontScale,82*fontScale]);labels.push([W-190*fontScale,H-40*fontScale,W-8,H-7]);
      for(const st of D.stars){const v=mul(eqToWorld(st[0]),2.72),p=project(v),alpha=p.z<0?.2:.5;const s=clamp((3.8-st[1])*.37,.5,1.9);ctx.fillStyle=colors.muted;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(p.x,p.y,s,0,tau);ctx.fill();}
      ctx.globalAlpha=1;
      function addLine(a,b,color,width,opacity,dash){const p=project(a),r=project(b);lineSegs.push({a:p,b:r,color:color,width:width,opacity:opacity,z:(p.z+r.z)/2,dash:dash});}
      function path(points,color,width,opacity,dash){for(let i=1;i<points.length;i++)addLine(points[i-1],points[i],color,width,opacity,dash);}
      const ecl=[],equ=[];const eqy=norm(cross(n,q));for(let i=0;i<=180;i++){const a=tau*i/180;ecl.push(ringPoint(m,a,2.24));equ.push(add(mul(q,Math.cos(a)*2.24),mul(eqy,Math.sin(a)*2.24)));}
      const prePath=D.samples.filter((_,i)=>i%5===0).map(v=>mul(eqToWorld(v.slice(4,7)),2.72));path(prePath,colors.purple,1.7,.47,false);
      path(ecl,colors.gold,1.6,.62,false);path(equ,colors.blue,2,.72,false);
      for(let i=0;i<segs.length;i++){const a=segs[i][0],b=i+1<segs.length?segs[i+1][0]:360,co=segs[i][1],pts=[];for(let x=a;x<=b+.001;x+=Math.max(.45,(b-a)/32))pts.push(ringPoint(m,Math.min(x,b)*rad,2.42));pts.push(ringPoint(m,b*rad,2.42));const active=co===code;path(pts,active?colors.gold:co==='Aqr'?colors.teal:colors.faint,active?5:3,active?.95:.55,false);addLine(ringPoint(m,a*rad,2.36),ringPoint(m,a*rad,2.49),colors.muted,1,.7,false);}
      addLine(mul(e,.8),mul(e,2.85),colors.muted,1.1,.45,true);addLine(mul(n,.8),mul(n,2.72),colors.blue,2.4,.95,false);addLine(mul(n,-.8),mul(n,-1.35),colors.blue,1.8,.6,false);addLine(mul(q,.83),mul(q,2.24),colors.gold,2,.8,false);
      function paintLine(s){ctx.globalAlpha=s.opacity;ctx.strokeStyle=s.color;ctx.lineWidth=s.width;ctx.setLineDash(s.dash?[4,5]:[]);ctx.beginPath();ctx.moveTo(s.a.x,s.a.y);ctx.lineTo(s.b.x,s.b.y);ctx.stroke();}
      lineSegs.sort((a,b)=>a.z-b.z);for(const s of lineSegs)if(s.z<0)paintLine(s);ctx.setLineDash([]);ctx.globalAlpha=1;earth(m);for(const s of lineSegs)if(s.z>=0)paintLine(s);ctx.globalAlpha=1;ctx.setLineDash([]);
      const jp=project(mul(q,2.24));const halo=ctx.createRadialGradient(jp.x,jp.y,1,jp.x,jp.y,19);halo.addColorStop(0,'#ffda8f66');halo.addColorStop(1,'#ffda8f00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(jp.x,jp.y,19,0,tau);ctx.fill();ctx.fillStyle=colors.gold;ctx.beginPath();ctx.arc(jp.x,jp.y,5.5,0,tau);ctx.fill();ctx.strokeStyle=colors.background;ctx.lineWidth=2;ctx.stroke();
      label('Jarní bod',jp.x+(jp.x>cx?11:-11),jp.y-29,colors.gold,jp.x>cx?'left':'right',13,true);
      const np=project(mul(n,2.72));ctx.fillStyle=colors.blue;ctx.beginPath();ctx.arc(np.x,np.y,4.4,0,tau);ctx.fill();label('Nebeský pól',np.x+9,np.y-9,colors.blue,'left',12,true);
      for(let i=0;i<segs.length;i++){let a=segs[i][0],b=i+1<segs.length?segs[i+1][0]:360;const co=segs[i][1],wrapped=segs[0][1]===segs[segs.length-1][1];if(wrapped&&i===segs.length-1)continue;if(wrapped&&i===0){a=segs[segs.length-1][0]-360;}if(b-a<8)continue;const near=co===code||co==='Aqr'||co==='Psc';if(narrow&&!near)continue;const p=project(ringPoint(m,(a+b)/2*rad,2.66)),nm=names[co]||[co,''];const txt=(nm[1]?nm[1]+' ':'')+(near?nm[0]:co);if(!label(txt,p.x,p.y,near?colors.text:colors.muted,'center',near?13:11,near)&&near){for(const dy of [-22,22,-44,44])if(label(txt,p.x,p.y+dy*fontScale,colors.text,'center',13,true))break;}}
      for(const st of D.stars){if(!['Polaris','Thuban','Vega'].includes(st[2]))continue;const p=project(mul(eqToWorld(st[0]),2.72));ctx.fillStyle=colors.text;ctx.beginPath();ctx.arc(p.x,p.y,2.7,0,tau);ctx.fill();if(!narrow||st[2]==='Polaris')label(st[2]==='Polaris'?'Polárka':st[2],p.x+8,p.y+10,colors.muted,'left',11,false);}
      const eqp=project(mul(eqy,2.24)),ecp=project(ringPoint(m,(angle(m.q,m)+90)*rad,2.24));if(!narrow){label('Rovník',eqp.x,eqp.y-12,colors.blue,'center',12,false);label('Ekliptika',ecp.x,ecp.y+15,colors.gold,'center',12,false);}
    }
    function resize(){const rect=canvas.parentElement.getBoundingClientRect();W=Math.round(rect.width);H=Math.round(rect.height);if(!W||!H)return;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);cx=W/2;cy=H*.55;scale=Math.min((W-38)/5.9,(H-38)/4.7);requestDraw();}
    el('op-time').addEventListener('input',function(){stop();S.year=Number(this.value);sync(true);});
    el('op-now').addEventListener('click',function(){stop();S.year=nowEpoch();if(S.year<1600||S.year>3200)setRange('cycle');sync(true);});
    el('op-play').addEventListener('click',function(){if(S.playing){stop();sync(true);return;}if(S.year>=Number(el('op-time').max))S.year=Number(el('op-time').min);S.playing=true;this.setAttribute('aria-pressed','true');lastTick=0;this.textContent='Pozastavit';this.setAttribute('aria-label','Pozastavit pohyb precese');requestDraw();});
    el('op-jump').addEventListener('click',function(){stop();S.year=boundary()+.05;if(S.year<1600||S.year>3200)setRange('cycle');sync(true);});
    el('op-shift').addEventListener('input',function(){S.offset=Number(this.value);sync(true);});
    root.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',function(){S.mode=this.dataset.model;root.querySelectorAll('[data-model]').forEach(x=>x.setAttribute('aria-pressed',String(x===this)));sync(true);}));
    root.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',function(){stop();setRange(this.dataset.range);}));
    root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',function(){S.view=this.dataset.view;S.yaw=55*rad;S.pitch=(S.view==='top'?89.5:45)*rad;root.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===this)));requestDraw();}));
    let drag=null;canvas.addEventListener('pointerdown',function(ev){drag={x:ev.clientX,y:ev.clientY,yaw:S.yaw,pitch:S.pitch,moved:false};if(ev.isPrimary===false||ev.button>0){drag=null;return;}canvas.setPointerCapture(ev.pointerId);canvas.classList.add('is-dragging');});
    canvas.addEventListener('pointermove',function(ev){if(!drag)return;const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)<4&&!drag.moved)return;drag.moved=true;S.yaw=drag.yaw-dx*.007;S.pitch=clamp(drag.pitch+dy*.006,12*rad,89.5*rad);root.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed','false'));requestDraw();});
    function endDrag(){drag=null;canvas.classList.remove('is-dragging');}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
    document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas.parentElement);
    function refreshAppearance(){
      const cs=getComputedStyle(root),doc=getComputedStyle(document.documentElement);
      const bg=doc.getPropertyValue('--of-bg').trim()||'#111820';
      const palette={gold:['#ffda8f','#865013'],blue:['#78b8ff','#195a9b'],purple:['#b0a0ff','#6841a5'],teal:['#70dbc3','#156b58'],faint:['#5e7792','#59697b']};
      for(const [key,pair] of Object.entries(palette)){
        const color=window.OrlojAppearance&&/^#[0-9a-f]{6}$/i.test(bg)?pair.sort((a,b)=>window.OrlojAppearance.contrast(b,bg)-window.OrlojAppearance.contrast(a,bg))[0]:pair[0];
        root.style.setProperty('--o-'+key,color);colors[key]=color;
      }
      colors.text=colors.muted=cs.getPropertyValue('--of-text').trim()||'#edf0f2';colors.background=bg;
      fontScale=Math.max(1,parseFloat(cs.fontSize)/16||1);canvasFont=cs.fontFamily||'system-ui,sans-serif';
      resize();
    }
    new MutationObserver(refreshAppearance).observe(document.documentElement,{attributes:true,attributeFilter:['style','data-theme']});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    reduced.addEventListener('change',()=>{if(reduced.matches){stop();sync(true);}});
    window.addEventListener('pagehide',stop);
    const fullscreen=document.getElementById('op-fullscreen');
    if(document.fullscreenEnabled&&document.documentElement.requestFullscreen){
      fullscreen.hidden=false;
      fullscreen.addEventListener('click',async()=>{
        try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
        catch(_){status.textContent='Celá obrazovka není v tomto okně dostupná.';status.hidden=false;}
      });
      document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement?'Ukončit celou obrazovku':'Celá obrazovka';});
    }
    if(S.year<1600||S.year>3200)setRange('cycle');
    refreshAppearance();sync(false);status.hidden=true;
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=public-v11-13-obraz-1').catch(()=>{});
    root.dataset.ready='true';
    root.orlojState=()=>({year:S.year,mode:S.mode,region:region(sample(S.year)),crossing:boundary(),obliquity:sample(S.year).obl,playing:S.playing});
  })();
