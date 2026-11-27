/* Orloj Observatoř 3D · renderer only. Astronomical values come from observatory-data.js. */
(function () {
  'use strict';
  var root = document.getElementById('observatory');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var T = window.THREE, A = window.Astronomy, Data = window.OrlojObservatoryData;
  var DAY = 86400000, EARTH_KM = 6371, AU_KM = 149597870.7;
  var minTime = Date.UTC(1900, 0, 1), maxTime = Date.UTC(2100, 11, 31, 23, 59, 59);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var now = Math.max(minTime, Math.min(maxTime, Date.now()));
  var state = { time: now, anchor: now, live: true, playing: false, speed: 21600, view: 'system', realScale: false, theme: 'dark', dirty: true, followEarth: true };
  var frameId = 0, lastFrame = 0, lastDataFrame = 0, lastTextFrame = 0, lastOrbitDay = null, nextPhases = [], orbitPoints = [], frameCounter = 0;
  var scene, renderer, camera, earth, moon, earthAxis, earthGrid, ecliptic, zodiac, orbit, stars, sunMark, earthLight, moonLight, atmosphere, data;
  var cameraState = { theta: -.72, phi: 1.05, distance: 11.4, desiredTheta: -.72, desiredPhi: 1.05, desiredDistance: 11.4, target: null };
  var mouse = { pointers: new Map(), moved: false, lastPinch: 0 };
  var labels = {};
  var signNames = ['Beran','Býk','Blíženci','Rak','Lev','Panna','Váhy','Štír','Střelec','Kozoroh','Vodnář','Ryby'];
  var assets = window.ORLOJ_OBSERVATORY_ASSETS || { earth: 'assets/observatory/earth.jpg', moon: 'assets/observatory/moon.jpg', moonHeight: 'assets/observatory/moon-height.jpg' };
  function fail(message) { $('loading').hidden = true; $('error').textContent = message; $('error').hidden = false; }
  function announce(message) { $('announcement').textContent = message; }
  function clampTime(t) { return Math.max(minTime, Math.min(maxTime, t)); }
  function vector(values) { return new T.Vector3(values[0], values[1], values[2]); }
  function radius() { return state.realScale ? data.moon.distanceKm / EARTH_KM : 4.25 * data.moon.distanceKm / 384400; }
  function markDirty() { state.dirty = true; }
  function dateText(ms) { return new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ms)); }
  function setPlaying(value) {
    state.playing = value; if (value) state.live = false;
    $('play').setAttribute('aria-pressed', String(value)); $('play').setAttribute('aria-label', value ? 'Pozastavit čas' : 'Spustit plynutí času');
    $('play-symbol').textContent = value ? 'Ⅱ' : '▶'; updateReadout(); markDirty();
  }
  function setTime(t, recenter, keepPlaying) {
    if (!Number.isFinite(t)) return;
    state.time = clampTime(t); state.live = false; nextPhases = [];
    if (!keepPlaying) setPlaying(false);
    if (recenter) state.anchor = state.time;
    updateData(true); updateReadout(); markDirty();
    announce('Čas modelu: ' + new Date(state.time).toLocaleString('cs-CZ', { timeZone: 'UTC' }) + ' UTC. ' + data.moon.phaseName + '.');
  }
  function sceneSize() { var rect = $('scene').getBoundingClientRect(); return { w: Math.max(rect.width, 1), h: Math.max(rect.height, 1) }; }
  function fitDistance() {
    var size = sceneSize(), narrow = Math.max(1, .96 / (size.w / size.h));
    if (state.view === 'moon') return 1.92 * Math.max(1, .68 / (size.w / size.h));
    if (state.view === 'earth') return 5.3 * Math.max(1, .78 / (size.w / size.h));
    return (state.realScale ? radius() * 2.65 : 11.8) * narrow;
  }
  function resetCamera(instant) {
    if (!data) return;
    if (state.view === 'moon') {
      state.followEarth = true;
      $('scene-caption').textContent = 'Pohled od Země. Tažením prozkoumej povrch.';
      var fromEarth = vector(data.moon.vector).negate().normalize();
      cameraState.desiredTheta = Math.atan2(fromEarth.x, fromEarth.z);
      cameraState.desiredPhi = Math.acos(Math.max(-.999, Math.min(.999, fromEarth.y)));
    } else if (state.view === 'earth') {
      var north = vector(data.earth.basis.y), prime = vector(data.earth.basis.x), west = vector(data.earth.basis.z);
      var earthSide = prime.multiplyScalar(.63).add(west.multiplyScalar(-.15)).add(north.multiplyScalar(.76)).normalize();
      cameraState.desiredTheta = Math.atan2(earthSide.x, earthSide.z); cameraState.desiredPhi = Math.acos(earthSide.y);
    } else { cameraState.desiredTheta = -.72; cameraState.desiredPhi = 1.05; }
    cameraState.desiredDistance = fitDistance();
    if (instant || reduced) { cameraState.theta = cameraState.desiredTheta; cameraState.phi = cameraState.desiredPhi; cameraState.distance = cameraState.desiredDistance; }
    markDirty();
  }
  function selectView(view) {
    state.view = view;
    root.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
    var text = { system: ['Země a Luna','Jeden okamžik. Dvě perspektivy.'], earth: ['Naše Země','Hranice dne a noci v pohybu.'], moon: ['Tvář Luny','Pohled od Země. Tažením prozkoumej povrch.'] }[view];
    $('scene-title').textContent = text[0]; $('scene-caption').textContent = text[1];
    resetCamera(false); updateVisibility(); announce(text[0]);
  }
  function makeCircle(r, segments) {
    var p = []; for (var i=0;i<segments;i++) { var a=i/segments*Math.PI*2; p.push(new T.Vector3(Math.cos(a)*r,0,-Math.sin(a)*r)); }
    return new T.BufferGeometry().setFromPoints(p);
  }
  function textSprite(text, color, scale) {
    var c=document.createElement('canvas'); c.width=128;c.height=128;var ctx=c.getContext('2d');
    ctx.fillStyle=color;ctx.font='52px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,66);
    var texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    var sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,opacity:.7}));sprite.scale.set(scale,scale,1);return sprite;
  }
  function buildScene() {
    scene=new T.Scene(); camera=new T.PerspectiveCamera(32,1,.01,1000); camera.layers.enable(1);camera.layers.enable(2);
    cameraState.target=new T.Vector3();
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.autoClear=false;
    $('scene').appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost',function(e){e.preventDefault();cancelAnimationFrame(frameId);fail('Grafický kontext byl přerušen. Pro obnovení modelu znovu načti stránku.');});
    var sphere=new T.SphereGeometry(1,128,80);
    earth=new T.Mesh(sphere,new T.MeshStandardMaterial({color:0xffffff,roughness:.82,metalness:.04}));earth.layers.set(1);scene.add(earth);
    moon=new T.Mesh(new T.SphereGeometry(.2724,96,64),new T.MeshStandardMaterial({color:0xe7e7e7,roughness:1,metalness:0,bumpScale:.003}));moon.layers.set(2);scene.add(moon);
    var ambient=new T.AmbientLight(0xaabbd2,.09);ambient.layers.enableAll();scene.add(ambient);
    earthLight=new T.DirectionalLight(0xfff6e8,2.7);earthLight.layers.set(1);scene.add(earthLight);scene.add(earthLight.target);
    moonLight=new T.DirectionalLight(0xffffff,2.4);moonLight.layers.set(2);scene.add(moonLight);scene.add(moonLight.target);
    atmosphere=new T.Mesh(new T.SphereGeometry(1.025,96,64),new T.ShaderMaterial({
      uniforms:{sunDir:{value:new T.Vector3(1,0,0)},tint:{value:new T.Color(0x3c9ddd)}},
      vertexShader:'varying vec3 n;varying vec3 p;void main(){vec4 wp=modelMatrix*vec4(position,1.0);p=wp.xyz;n=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}',
      fragmentShader:'uniform vec3 sunDir;uniform vec3 tint;varying vec3 n;varying vec3 p;void main(){vec3 normal=normalize(n);float rim=pow(1.0-abs(dot(normal,normalize(cameraPosition-p))),3.0);float light=smoothstep(-0.3,0.6,dot(normal,sunDir));gl_FragColor=vec4(tint,rim*(0.1+0.54*light));}',
      side:T.BackSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending
    }));scene.add(atmosphere);
    earthAxis=new T.Group();var axisMaterial=new T.LineBasicMaterial({color:0x91b8c3,transparent:true,opacity:.6});
    earthAxis.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,-1.65,0),new T.Vector3(0,1.65,0)]),axisMaterial));
    var northLabel=textSprite('N','#a5c4d0',.22);northLabel.position.y=1.82;earthAxis.add(northLabel);scene.add(earthAxis);
    earthGrid=new T.Group();var equator=new T.LineLoop(makeCircle(1.006,180),new T.LineBasicMaterial({color:0xa0c8d4,transparent:true,opacity:.3}));earthGrid.add(equator);scene.add(earthGrid);
    ecliptic=new T.Group();var ringMaterial=new T.LineBasicMaterial({color:0x8da5b5,transparent:true,opacity:.18});
    ecliptic.add(new T.LineLoop(makeCircle(5.35,240),ringMaterial));
    var plane=new T.Mesh(new T.RingGeometry(1.45,5.35,160),new T.MeshBasicMaterial({color:0x78939f,transparent:true,opacity:.018,side:T.DoubleSide,depthWrite:false}));plane.rotation.x=-Math.PI/2;ecliptic.add(plane);
    var tickPoints=[];for(var i=0;i<120;i++){var angle=i*Math.PI/60;var r=i%10===0?5.12:5.25;tickPoints.push(new T.Vector3(Math.cos(angle)*r,0,-Math.sin(angle)*r),new T.Vector3(Math.cos(angle)*5.35,0,-Math.sin(angle)*5.35));}
    ecliptic.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(tickPoints),new T.LineBasicMaterial({color:0x9ab0be,transparent:true,opacity:.22})));scene.add(ecliptic);
    zodiac=new T.Group();var zodiacGlyphs=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    zodiacGlyphs.forEach(function(g,i){var a=(i*30+15)*Math.PI/180,s=textSprite(g,'#c4b18e',.36);s.position.set(Math.cos(a)*5.75,0,-Math.sin(a)*5.75);zodiac.add(s);});scene.add(zodiac);
    orbit=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xccb88f,transparent:true,opacity:.42}));scene.add(orbit);
    var glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;var gc=glowCanvas.getContext('2d'),gradient=gc.createRadialGradient(64,64,0,64,64,64);
    gradient.addColorStop(0,'rgba(255,242,211,1)');gradient.addColorStop(.04,'rgba(255,222,163,.95)');gradient.addColorStop(.14,'rgba(244,180,82,.35)');gradient.addColorStop(.4,'rgba(226,142,54,.06)');gradient.addColorStop(1,'rgba(226,142,54,0)');gc.fillStyle=gradient;gc.fillRect(0,0,128,128);
    var glowTexture=new T.CanvasTexture(glowCanvas);glowTexture.colorSpace=T.SRGBColorSpace;
    sunMark=new T.Sprite(new T.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sunMark.scale.set(2.4,2.4,1);scene.add(sunMark);
    var seed=6741;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
    var starPositions=[],starColors=[];for(var k=0;k<1700;k++){var yy=random()*2-1,az=random()*Math.PI*2,rr=160,cosLat=Math.sqrt(1-yy*yy);starPositions.push(rr*cosLat*Math.cos(az),rr*yy,rr*cosLat*Math.sin(az));var luminosity=.2+Math.pow(random(),4)*.6;starColors.push(luminosity*.82,luminosity*.91,luminosity);}
    var sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));sg.setAttribute('color',new T.Float32BufferAttribute(starColors,3));stars=new T.Points(sg,new T.PointsMaterial({size:.15,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.65,depthWrite:false}));scene.add(stars);
    labels={earth:$('earth-label'),moon:$('moon-label'),sun:$('sun-label')};
    new ResizeObserver(resize).observe($('scene'));resize();
  }
  function loadTextures() {
    var loader=new T.TextureLoader(),loaded=0,total=3;
    function load(url,apply,isColor){loader.load(url,function(texture){if(isColor)texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());apply(texture);loaded++;markDirty();if(loaded===total)$('loading').classList.add('loaded');},undefined,function(){loaded++;fail('Mapu povrchu se nepodařilo načíst. Obnov stránku, aby se model zobrazil se všemi texturami.');});}
    load(assets.earth,function(t){earth.material.map=t;earth.material.needsUpdate=true;},true);
    load(assets.moon,function(t){moon.material.map=t;moon.material.needsUpdate=true;},true);
    load(assets.moonHeight,function(t){moon.material.bumpMap=t;moon.material.needsUpdate=true;},false);
  }
  function resize() {
    if(!renderer)return;var size=sceneSize();renderer.setSize(size.w,size.h,false);camera.aspect=size.w/size.h;camera.updateProjectionMatrix();
    if(cameraState.target){cameraState.desiredDistance=fitDistance();if(reduced)cameraState.distance=cameraState.desiredDistance;}markDirty();
  }
  function updateOrbit(force) {
    var dayKey=Math.floor(state.time/DAY);
    if(!force&&lastOrbitDay===dayKey)return;lastOrbitDay=dayKey;
    orbitPoints=Data.lunarOrbit(A,new Date(state.time),128);
    var points=orbitPoints.map(function(p){return vector(p).multiplyScalar(radius());});
    orbit.geometry.dispose();orbit.geometry=new T.BufferGeometry().setFromPoints(points);
    var span=state.realScale?384400/EARTH_KM/4.25:1;ecliptic.scale.setScalar(span);zodiac.scale.setScalar(span);
  }
  function updateData(force) {
    data=Data.compute(A,new Date(state.time));
    var basis=data.earth.basis,matrix=new T.Matrix4().makeBasis(vector(basis.x),vector(basis.y),vector(basis.z));earth.quaternion.setFromRotationMatrix(matrix);earthAxis.quaternion.copy(earth.quaternion);earthGrid.quaternion.copy(earth.quaternion);
    var moonDir=vector(data.moon.vector),moonPosition=moonDir.clone().multiplyScalar(radius());moon.position.copy(moonPosition);
    if(state.view==='moon'&&state.followEarth){cameraState.desiredTheta=Math.atan2(-moonDir.x,-moonDir.z);cameraState.desiredPhi=Math.acos(Math.max(-.999,Math.min(.999,-moonDir.y)));}
    var nearSide=moonDir.clone().negate(),north=new T.Vector3(0,1,0);north.addScaledVector(nearSide,-north.dot(nearSide)).normalize();var west=new T.Vector3().crossVectors(nearSide,north).normalize();
    moon.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(nearSide,north,west));
    var sunDir=vector(data.sun.vector);earthLight.position.copy(sunDir).multiplyScalar(100);earthLight.target.position.set(0,0,0);
    var moonToSun=sunDir.clone().multiplyScalar(data.sun.distanceAU*AU_KM).addScaledVector(moonDir,-data.moon.distanceKm).normalize();
    moonLight.position.copy(moon.position).addScaledVector(moonToSun,100);moonLight.target.position.copy(moon.position);
    atmosphere.material.uniforms.sunDir.value.copy(sunDir);
    sunMark.position.copy(sunDir).multiplyScalar(state.realScale?radius()*1.5:7.2);
    updateOrbit(force);markDirty();
  }
  function updateReadout() {
    if(!data)return;
    $('phase-name').textContent=data.moon.phaseName;
    $('illumination').textContent=new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:1}).format(data.moon.illumination*100)+' %';
    $('moon-distance').textContent=new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(data.moon.distanceKm)+' km';
    var si=Math.floor(data.sun.longitude/30),sd=data.sun.longitude%30;$('sun-sign').textContent=signNames[si]+' '+Math.floor(sd)+'°';
    if(document.activeElement!==$('datetime'))$('datetime').value=new Date(state.time).toISOString().slice(0,16);
    $('clock-mode').textContent=state.live?'TEĎ':state.playing?'PLYNUTÍ':'ZVOLENÝ ČAS';
    var range=(state.time-state.anchor)/DAY;if(Math.abs(range)>15){state.anchor=state.time;range=0;}$('time-range').value=String(range);
    $('range-start').textContent=dateText(clampTime(state.anchor-15*DAY));$('range-end').textContent=dateText(clampTime(state.anchor+15*DAY));
    if(!nextPhases.length||nextPhases[0].at<=state.time||Math.abs(nextPhases[0].at-state.time)>40*DAY){nextPhases=Data.nextPhases(A,new Date(state.time));}
    $('next-phase').textContent=nextPhases.length?nextPhases[0].name+' · '+dateText(nextPhases[0].at):'Astronomy Engine · NASA';
  }
  function updateVisibility() {
    orbit.visible=$('layer-orbit').checked&&state.view==='system';ecliptic.visible=$('layer-ecliptic').checked&&state.view==='system';zodiac.visible=$('layer-zodiac').checked&&state.view==='system';
    earthAxis.visible=$('layer-axis').checked&&state.view!=='moon';earthGrid.visible=$('layer-axis').checked&&state.view!=='moon';
    // Close-up Moon must not be occulted by the enlarged schematic Earth.
    earth.visible=state.view!=='moon';atmosphere.visible=earth.visible;sunMark.visible=state.view==='system';
    $('scale-note').textContent=state.realScale?'Velikosti a odstup Země–Měsíc v jednom měřítku · Slunce je směrová značka':'Vzdálenosti zkrácené · Slunce znázorněné směrem světla';markDirty();
  }
  function applyTheme(theme) {
    state.theme=theme;document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('orloj-observatory-theme',theme);}catch(e){}
    if(stars)stars.visible=theme==='dark';if(atmosphere)atmosphere.material.uniforms.tint.value.set(theme==='dark'?0x3c9ddd:0x2b7ca6);markDirty();
  }
  function positionLabel(el,position,offset,visible) {
    if(!visible){el.hidden=true;return;}var p=position.clone().project(camera),size=sceneSize();
    var x=(p.x*.5+.5)*size.w,y=(-p.y*.5+.5)*size.h+(offset||0);
    var nearEdge=x<65||x>size.w-65||y<65||y>size.h-66;
    el.hidden=p.z>1||p.z<-1||nearEdge;
    if(!el.hidden){el.style.left=x.toFixed(1)+'px';el.style.top=y.toFixed(1)+'px';}
  }
  function drawLabels() {
    var size=sceneSize(),earthPx=size.h/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.length());
    var moonDistance=camera.position.distanceTo(moon.position),moonPx=.2724*size.h/(2*Math.tan(camera.fov*Math.PI/360)*moonDistance);
    positionLabel(labels.earth,new T.Vector3(),Math.min(earthPx+16,140),state.view==='system');
    positionLabel(labels.moon,moon.position,Math.min(moonPx+13,90),state.view==='system');
    positionLabel(labels.sun,sunMark.position,22,state.view==='system');
  }
  function updateCamera(dt) {
    var amount=reduced?1:1-Math.exp(-dt*10),target=state.view==='moon'?moon.position:new T.Vector3();
    if(state.view==='moon'&&state.followEarth&&state.playing){cameraState.theta=cameraState.desiredTheta;cameraState.phi=cameraState.desiredPhi;}
    // Follow the moving body exactly; smooth only the user-controlled camera orientation.
    cameraState.target.copy(target);
    var delta=cameraState.desiredTheta-cameraState.theta;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;
    cameraState.theta+=delta*amount;cameraState.phi+=(cameraState.desiredPhi-cameraState.phi)*amount;cameraState.distance+=(cameraState.desiredDistance-cameraState.distance)*amount;
    var sin=Math.sin(cameraState.phi),r=cameraState.distance;
    camera.position.set(r*sin*Math.sin(cameraState.theta),r*Math.cos(cameraState.phi),r*sin*Math.cos(cameraState.theta)).add(cameraState.target);
    camera.near=state.view==='moon'?.003:.01;camera.far=1000;camera.updateProjectionMatrix();camera.lookAt(cameraState.target);camera.updateMatrixWorld();
    return Math.abs(delta)>.0001||Math.abs(cameraState.phi-cameraState.desiredPhi)>.0001||Math.abs(cameraState.distance-cameraState.desiredDistance)>.0001;
  }
  function frame(stamp) {
    frameId=requestAnimationFrame(frame);if(document.hidden){lastFrame=stamp;return;}
    var dt=lastFrame?Math.min((stamp-lastFrame)/1000,.12):1/60;lastFrame=stamp;
    if(state.playing){var next=state.time+dt*state.speed*1000;state.time=clampTime(next);if(next>=maxTime){setPlaying(false);updateData(true);updateReadout();announce('Dosažena hranice modelu: rok 2100.');}}
    else if(state.live)state.time=clampTime(Date.now());
    var moving=state.playing,updateInterval=moving?0:1000;
    if((moving||state.live)&&stamp-lastDataFrame>updateInterval){updateData(false);lastDataFrame=stamp;}
    if(stamp-lastTextFrame>250&&(moving||state.live)){updateReadout();lastTextFrame=stamp;}
    var eased=updateCamera(dt);
    if(state.dirty||moving||eased){
      // Three.js chooses lights per camera, not per mesh. Separate passes isolate
      // the true Earth-to-Sun and Moon-to-Sun light directions without double lighting.
      renderer.clear();camera.layers.set(1);renderer.render(scene,camera);
      camera.layers.set(2);renderer.render(scene,camera);
      camera.layers.set(0);renderer.render(scene,camera);camera.layers.enable(1);camera.layers.enable(2);
      drawLabels();state.dirty=false;frameCounter++;
    }
  }
  function zoom(factor) {
    var min=state.view==='moon'?.46:state.view==='earth'?1.4:2.4,max=state.realScale?450:60;
    cameraState.desiredDistance=Math.max(min,Math.min(max,cameraState.desiredDistance*factor));markDirty();
  }
  function bind() {
    root.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){selectView(b.dataset.view);});});
    ['orbit','ecliptic','axis','zodiac'].forEach(function(id){$('layer-'+id).addEventListener('change',updateVisibility);});
    $('play').addEventListener('click',function(){setPlaying(!state.playing);});
    $('speed').addEventListener('change',function(){state.speed=Number(this.value);});
    $('prev-day').addEventListener('click',function(){setTime(state.time-DAY,false);});$('next-day').addEventListener('click',function(){setTime(state.time+DAY,false);});
    $('now').addEventListener('click',function(){state.time=clampTime(Date.now());state.anchor=state.time;setPlaying(false);state.live=true;nextPhases=[];updateData(true);updateReadout();announce('Zobrazen aktuální okamžik.');});
    $('time-range').addEventListener('input',function(){setTime(state.anchor+Number(this.value)*DAY,false);});
    $('datetime').addEventListener('change',function(){var value=this.value;if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||!this.validity.valid){this.value=new Date(state.time).toISOString().slice(0,16);announce('Vyber platný čas v letech 1900 až 2100.');return;}nextPhases=[];setTime(Date.parse(value+':00Z'),true);});
    root.querySelectorAll('[data-phase]').forEach(function(b){b.addEventListener('click',function(){var phase=Number(b.dataset.phase),found=A.SearchMoonPhase(phase,new Date(state.time+60000),40);if(found&&found.date.getTime()<=maxTime){setTime(found.date.getTime(),true);if(state.view==='moon')resetCamera(false);}else announce('Další fáze je mimo časový rozsah modelu.');});});
    $('scale-toggle').addEventListener('click',function(){state.realScale=!state.realScale;this.setAttribute('aria-pressed',String(state.realScale));updateData(true);updateVisibility();resetCamera(false);announce(state.realScale?'Skutečný poměr vzdálenosti Země a Měsíce.':'Přehledné zkrácené vzdálenosti.');});
    $('theme').addEventListener('click',function(){applyTheme(state.theme==='dark'?'light':'dark');});
    $('info').addEventListener('click',function(){$('about').showModal();});$('close-about').addEventListener('click',function(){$('about').close();});
    $('about').addEventListener('click',function(e){if(e.target===this){var r=this.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.close();}});
    $('fullscreen').addEventListener('click',function(){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});else if(root.requestFullscreen)root.requestFullscreen().catch(function(){announce('Použij celoobrazovkový režim svého prohlížeče.');});else announce('Použij celoobrazovkový režim svého prohlížeče.');});
    $('zoom-in').addEventListener('click',function(){zoom(.8);});$('zoom-out').addEventListener('click',function(){zoom(1.25);});$('reset-view').addEventListener('click',function(){resetCamera(false);});
    var surface=$('scene');
    surface.addEventListener('pointerdown',function(e){surface.setPointerCapture(e.pointerId);mouse.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});mouse.lastPinch=0;mouse.moved=false;surface.classList.add('dragging');});
    surface.addEventListener('pointermove',function(e){var prev=mouse.pointers.get(e.pointerId);if(!prev)return;var dx=e.clientX-prev.x,dy=e.clientY-prev.y;mouse.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(mouse.pointers.size===2){var points=Array.from(mouse.pointers.values()),distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);if(mouse.lastPinch>0)zoom(mouse.lastPinch/distance);mouse.lastPinch=distance;}
      else{state.followEarth=false;if(state.view==='moon')$('scene-caption').textContent='Volný pohled. Tlačítko ↺ vrátí pohled od Země.';cameraState.desiredTheta-=dx*.006;cameraState.desiredPhi=Math.max(.12,Math.min(Math.PI-.12,cameraState.desiredPhi+dy*.006));}
      if(Math.abs(dx)+Math.abs(dy)>2)mouse.moved=true;markDirty();
    });
    function endPointer(e){mouse.pointers.delete(e.pointerId);mouse.lastPinch=0;if(!mouse.pointers.size)surface.classList.remove('dragging');}
    surface.addEventListener('pointerup',endPointer);surface.addEventListener('pointercancel',endPointer);surface.addEventListener('lostpointercapture',endPointer);
    surface.addEventListener('wheel',function(e){e.preventDefault();zoom(Math.exp(Math.max(-150,Math.min(150,e.deltaY))*.002));},{passive:false});
    document.addEventListener('keydown',function(e){if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)||$('about').open)return;if(/^Arrow/.test(e.key)){state.followEarth=false;if(state.view==='moon')$('scene-caption').textContent='Volný pohled. Tlačítko ↺ vrátí pohled od Země.';}if(e.key===' '){e.preventDefault();setPlaying(!state.playing);}else if(e.key==='+')zoom(.8);else if(e.key==='-')zoom(1.25);else if(e.key==='ArrowLeft'){e.preventDefault();cameraState.desiredTheta-=.15;markDirty();}else if(e.key==='ArrowRight'){e.preventDefault();cameraState.desiredTheta+=.15;markDirty();}else if(e.key==='ArrowUp'){e.preventDefault();cameraState.desiredPhi=Math.max(.12,cameraState.desiredPhi-.15);markDirty();}else if(e.key==='ArrowDown'){e.preventDefault();cameraState.desiredPhi=Math.min(Math.PI-.12,cameraState.desiredPhi+.15);markDirty();}});
    document.addEventListener('visibilitychange',function(){lastFrame=0;markDirty();});
  }
  if(!T||!A||!Data){fail('Výpočtové nebo zobrazovací soubory se nenačetly. Otevři kompletní model a obnov stránku.');return;}
  try{
    data=Data.compute(A,new Date(state.time));buildScene();bind();updateData(true);updateReadout();updateVisibility();resetCamera(true);
    var savedTheme='dark';try{savedTheme=localStorage.getItem('orloj-observatory-theme')||document.documentElement.dataset.theme||'dark';}catch(e){}applyTheme(savedTheme==='light'?'light':'dark');
    loadTextures();frameId=requestAnimationFrame(frame);
    // Small public integration surface: host Orloj can drive the exact same scene time.
    window.OrlojObservatory={setTime:function(date){setTime(new Date(date).getTime(),true);},setView:selectView,pause:function(){state.live=false;setPlaying(false);},getState:function(){return{time:new Date(state.time).toISOString(),view:state.view,playing:state.playing,live:state.live,realScale:state.realScale,illumination:data.moon.illumination,renderedFrames:frameCounter};},dispose:function(){cancelAnimationFrame(frameId);scene.traverse(function(object){if(object.geometry)object.geometry.dispose();if(object.material){var materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(function(m){if(m.map)m.map.dispose();if(m.bumpMap)m.bumpMap.dispose();m.dispose();});}});renderer.dispose();}};
  }catch(error){console.error('Orloj observatory:',error);fail('Model se nepodařilo spustit. Potřebuje prohlížeč se zapnutým WebGL.');}
})();
