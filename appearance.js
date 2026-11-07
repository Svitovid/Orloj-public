/* Orloj visual preferences v1. No profile or calculation dependencies. */
(function(root){
'use strict';
const KEY='orloj.appearance.v1';
const DEFAULTS={mode:'system',preset:'observatory',accent:null,background:null,surface:null,foreground:null,autoForeground:true,font:'system',readerFont:'book',textSize:100,atmosphere:20};
const PALETTES={
 observatory:{light:['#f5f4f0','#ffffff','#202a32','#526474'],dark:['#111820','#1b2530','#edf0f2','#b8cbd8']},
 parchment:{light:['#f4efe4','#fffcf5','#342d24','#80572b'],dark:['#211e19','#2d2922','#f4ead7','#d7b67d']},
 forest:{light:['#eff4f0','#ffffff','#20362b','#326b50'],dark:['#121f1a','#1c2d25','#e6f0e9','#99ceb0']}
};
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Neplatné předvolby vzhledu.');
 const p={...DEFAULTS};
 for(const k of Object.keys(value)){if(!Object.hasOwn(DEFAULTS,k))throw Error('Import obsahuje nepovolenou položku: '+k);p[k]=value[k];}
 if(!['system','light','dark'].includes(p.mode)||!Object.hasOwn(PALETTES,p.preset)||!['system','humanist','mono'].includes(p.font)||!['book','system'].includes(p.readerFont))throw Error('Neznámá varianta vzhledu.');
 for(const k of ['accent','background','surface','foreground'])if(p[k]!==null&&!/^#[0-9a-f]{6}$/i.test(p[k]))throw Error('Barvy musí být ve formátu #RRGGBB.');
 if(typeof p.autoForeground!=='boolean'||!Number.isFinite(p.textSize)||p.textSize<100||p.textSize>150||!Number.isFinite(p.atmosphere)||p.atmosphere<0||p.atmosphere>100)throw Error('Hodnoty vzhledu jsou mimo povolený rozsah.');
 return p;
}
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=h=>rgb(h).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{let x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const best=(backgrounds)=>['#000000','#ffffff'].sort((a,b)=>Math.min(...backgrounds.map(c=>contrast(b,c)))-Math.min(...backgrounds.map(c=>contrast(a,c))))[0];
function resolve(p,light){const mode=p.mode==='system'?(light?'light':'dark'):p.mode;const base=PALETTES[p.preset][mode];const background=p.background||base[0],surface=p.surface||base[1],accent=p.accent||base[3];const foreground=p.autoForeground?best([background,surface]):p.foreground||base[2];return {mode,background,surface,foreground,accent,onAccent:best([accent])};}
function audit(c){return [['Text / pozadí',c.foreground,c.background],['Text / plocha',c.foreground,c.surface],['Text / zvýraznění',c.onAccent,c.accent]].map(([label,a,b])=>({label,ratio:contrast(a,b)}));}
function serialize(p){return JSON.stringify({format:'orloj-appearance',version:1,preferences:validate(p)},null,2);}
function parse(text){const v=JSON.parse(text);if(!v||v.format!=='orloj-appearance'||v.version!==1||Object.keys(v).some(k=>!['format','version','preferences'].includes(k)))throw Error('Nepodporovaný formát nebo verze vzhledu.');return validate(v.preferences);}
const api={KEY,DEFAULTS,PALETTES,validate,contrast,resolve,audit,serialize,parse};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.OrlojAppearance=api;
if(!root.document)return;
const media=matchMedia('(prefers-color-scheme: light)');let current;
try{current=validate(JSON.parse(localStorage.getItem(KEY))||DEFAULTS);}catch(e){current={...DEFAULTS};}
let draft=null;
function apply(p){const c=resolve(p,media.matches),s=document.documentElement.style;
 const vars={'bg':c.background,'surface':c.surface,'raised':c.surface,'text':c.foreground,'muted':c.foreground,'accent':c.accent,'on-accent':c.onAccent,'border':c.foreground,'focus':c.foreground,'personal':c.foreground,'universal':c.foreground};
 for(const [k,v] of Object.entries(vars))s.setProperty('--of-'+k,v);
 const fonts={system:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',humanist:'"Trebuchet MS", "Segoe UI", sans-serif',mono:'ui-monospace, "Cascadia Code", monospace'};
 s.setProperty('--of-font',fonts[p.font]);s.setProperty('--of-reader-font',p.readerFont==='book'?'Georgia, "Times New Roman", serif':fonts[p.font]);s.setProperty('--of-size',p.textSize/100+'rem');s.setProperty('--of-atmosphere',p.atmosphere/100);
 const aliases={'ink-rgb':rgb(c.foreground).join(','),'ink-soft-rgb':rgb(c.foreground).join(','),'line-rgb':rgb(c.foreground).join(','),'ink-primary':c.foreground,'ink-warm':c.foreground,'ink-soft':c.foreground,'ink':c.foreground,'paper':c.background,'paper-soft':c.surface,'paper-deep':c.background,'surface':c.surface,'gold':c.accent,'gold-light':c.accent};
 for(const [k,v] of Object.entries(aliases))s.setProperty('--'+k,v);
 document.documentElement.dataset.theme=c.mode;document.documentElement.dataset.themePreference=p.mode;document.documentElement.dataset.designFoundation='1';s.colorScheme=c.mode;
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=c.background;
 return c;
}
api.apply=apply;apply(current);media.addEventListener('change',()=>apply(draft||current));
addEventListener('storage',e=>{if(e.key===KEY&&!draft){try{current=e.newValue?parse(JSON.stringify({format:'orloj-appearance',version:1,preferences:JSON.parse(e.newValue)})):{...DEFAULTS};apply(current);}catch(_){}}});
api.mount=function(){
 const old=document.getElementById('theme-toggle');let trigger=old;
 if(!trigger){trigger=document.createElement('button');trigger.type='button';trigger.className='of-open';(document.querySelector('.topbar')||document.querySelector('main')||document.body).prepend(trigger);}
 trigger.textContent='◐ Vzhled';trigger.setAttribute('aria-label','Nastavení vzhledu');trigger.setAttribute('aria-haspopup','dialog');
 const dialog=document.createElement('dialog');dialog.className='of-dialog';dialog.setAttribute('aria-labelledby','of-title');
 dialog.innerHTML=`<form method="dialog"><header><div><small>ORLOJ · OSOBNÍ PROSTOR</small><h2 id="of-title">Vzhled a atmosféra</h2></div><button type="button" data-action="cancel" aria-label="Zavřít a zrušit změny">×</button></header><p>Živý náhled v celé aplikaci. Uložení se týká pouze tohoto zařízení.</p><div class="of-fields"><label>Režim<select name="mode"><option value="system">Systém</option><option value="light">Světlý</option><option value="dark">Tmavý</option></select></label><label>Varianta<select name="preset"><option value="observatory">Observatoř</option><option value="parchment">Pergamen</option><option value="forest">Lesní ticho</option></select></label><label>Zvýraznění<input type="color" name="accent"></label><label>Pozadí<input type="color" name="background"></label><label>Plochy<input type="color" name="surface"></label><label>Popředí<input type="color" name="foreground"></label><label class="of-wide of-check"><input type="checkbox" name="autoForeground"> Automatické popředí</label><label>Písmo<select name="font"><option value="system">Systémové</option><option value="humanist">Humanistické</option><option value="mono">Monospace</option></select></label><label>Reader<select name="readerFont"><option value="book">Knižní</option><option value="system">Stejné jako rozhraní</option></select></label><label>Velikost textu <output id="of-size-label"></output><input type="range" min="100" max="150" step="10" name="textSize"></label><label>Intenzita atmosféry <output id="of-atmosphere-label"></output><input type="range" min="0" max="100" step="10" name="atmosphere"></label></div><section class="of-specimen" aria-label="Náhled typografie"><strong>Příliš žluťoučký kůň</strong><span>Čas 21:08:09 · 27° 05′ · ☉ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇</span><p>Světlo, čas a pozornost. Obraz otevírá prostor ke čtení.</p><button type="button" class="of-accent">Ukázka zvýraznění</button></section><div id="of-contrast" role="status" aria-live="polite"></div><button type="button" data-action="repair">Opravit kontrast</button><details><summary>Přenos vzhledu</summary><p>Soubor obsahuje pouze vizuální předvolby.</p><button type="button" data-action="export">Exportovat JSON</button><label class="of-import">Importovat JSON<input type="file" accept="application/json,.json" name="import"></label></details><p id="of-message" role="status"></p><footer><button type="button" data-action="reset">Výchozí</button><span></span><button type="button" data-action="cancel">Zrušit</button><button type="button" data-action="save" class="of-accent">Uložit</button></footer></form>`;
 if(root.OrlojSymbols){const legend=document.createElement('details');legend.className='of-symbols';legend.innerHTML='<summary>Symboly Orloje</summary>'+root.OrlojSymbols.entries.map(e=>'<span><b aria-hidden="true">'+e.symbol+'</b> '+e.name.cs+'</span>').join('');dialog.querySelector('footer').before(legend);}
 document.body.append(dialog);const form=dialog.querySelector('form'),msg=dialog.querySelector('#of-message');
 function refresh(fill){const c=apply(draft);if(fill){for(const k of Object.keys(DEFAULTS)){const el=form.elements.namedItem(k);if(!el)continue;if(el.type==='checkbox')el.checked=draft[k];else el.value=draft[k]===null?c[k]:draft[k];}}
 form.elements.foreground.disabled=draft.autoForeground;
 dialog.querySelector('#of-size-label').textContent=draft.textSize+' %';dialog.querySelector('#of-atmosphere-label').textContent=draft.atmosphere+' %';
 const checks=audit(c),good=checks.every(x=>x.ratio>=4.5);dialog.querySelector('#of-contrast').textContent=(good?'Kontrast je čitelný. ':'Nízký kontrast — použij opravu. ')+checks.map(x=>x.label+' '+x.ratio.toFixed(1)+':1').join(' · ');dialog.querySelector('[data-action="save"]').disabled=!good;}
 function close(){draft=null;apply(current);dialog.close();trigger.focus();}
 trigger.addEventListener('click',()=>{draft={...current};msg.textContent='';refresh(true);dialog.showModal();});
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});form.addEventListener('submit',e=>e.preventDefault());
 form.addEventListener('input',e=>{const el=e.target,k=el.name;if(!Object.hasOwn(DEFAULTS,k))return;draft[k]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(k==='preset'||k==='mode'){for(const key of ['accent','background','surface','foreground'])draft[key]=null;}refresh(k==='preset'||k==='mode'||k==='autoForeground');});
 dialog.addEventListener('click',e=>{const action=e.target.dataset.action;if(!action)return;
 if(action==='cancel')close();
 if(action==='reset'){draft={...DEFAULTS};refresh(true);}
 if(action==='repair'){draft.autoForeground=true;let c=resolve(draft,media.matches);if(audit(c).some(x=>x.ratio<4.5)){draft.surface=c.background;}refresh(true);}
 if(action==='save'){try{localStorage.setItem(KEY,JSON.stringify(validate(draft)));current={...draft};close();}catch(_){msg.textContent='Vzhled se nepodařilo uložit. Úložiště zařízení není dostupné.';}}
 if(action==='export'){const url=URL.createObjectURL(new Blob([serialize(draft)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='orloj-vzhled-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 });
 form.elements.namedItem('import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>16384)throw Error('Soubor vzhledu je příliš velký.');draft=parse(await f.text());refresh(true);msg.textContent='Vzhled načten do náhledu. Potvrď Uložit, nebo změny zruš.';}catch(err){msg.textContent=err.message;}e.target.value='';});
};
})(typeof window!=='undefined'?window:globalThis);
