# Orloj · Observatoř 3D v0.1

Trojrozměrný modul pro stávající Orloj. Vstupní stránka je `observatory-3d.html`; modul zachovává stávající Astronomy Engine a nevolá legacy `geo()` ani `dayNumber()` z hlavní stránky.

## Použití

Otevřít `observatory-3d.html` přes stejný webový server jako Orloj. Balíček používá lokální Three.js a lokální textury; při běžném použití nevolá žádné externí API. Současně je připraven export do jednoho samostatného HTML, který obsahuje všechny závislosti a textury.

- Soustava: prostorová vzájemná poloha Země a Měsíce, sluneční směr, ekliptika, skutečně vzorkovaná lunární dráha.
- Země: detail s časově správnou orientací pevnin a hranicí dne/noci.
- Luna: výchozí pohled od Země, který sleduje fáze při přehrávání. Ruční tažení přepne na volnou kameru; reset vrací sledování Země.
- Čas: UTC, datum a čas, kroky ±1 den, třicetidenní posuvník, návrat na skutečný čas, plynutí 1 hodina až 7 dní za sekundu, skok na následující hlavní fáze.
- Vrstvy: lunární dráha, ekliptika, zemská osa/rovník, tropický zvěrokruh.
- Vzhled: světlý/tmavý, fullscreen, touch rotate/pinch a klávesové ovládání.
- Měřítko: rozměry Země a Měsíce ve skutečném poměru; volitelně skutečný poměr jejich vzdálenosti.

## Výpočet a vědomá omezení

`observatory-data.js` je čistý adaptér nad Astronomy Engine, který již Orloj obsahuje. Souřadnice ECT se převádějí pravotočivě na svět `(x,z,−y)`. Zemská báze používá GAST a `Rotation_EQD_ECT`. Osvětlení v údajích je `Illumination('Moon').phase_fraction`; poloha na oběžné dráze není nahrazena kruhovou animací.

Rozsah této obrazovky je 1900–2100 včetně. Jde o zvolený rozsah aplikace, nikoli o obecnou deklaraci hranic přesnosti knihovny. Výchozí vzdálenost Měsíce je zkrácena lineárním faktorem `4.25 / 384400 km`, přičemž změny vzdálenosti zůstávají zachovány. Slunce se zobrazuje jako směrová značka, nikoli jako těleso ve společném měřítku. Směry světla pro Zemi a Měsíc se počítají ze skutečných vzdáleností před kompresí.

Povrchová orientace Měsíce je zjednodušená na přivrácenou stranu a sever; librace nejsou simulovány. Vzájemné stíny při zatmění se nesimulují. Hvězdné pozadí je dekorativní, nikoli hvězdný katalog. Zvěrokruh je tropické dělení ekliptiky, nikoli mapa souhvězdí. Zemská textura je historická povrchová mapa, nikoli aktuální počasí. Tato omezení jsou dostupná i v nápovědě obrazovky.

### Osvětlení a výkon

Three.js vybírá světla podle vrstev kamery. Proto renderer používá tři průchody: Země se svým světlem, Luna se svým světlem, poté doplňkové vrstvy. Hloubkový buffer se mezi průchody zachovává. Tím se světla nezapočítají dvakrát a směry zůstávají správné i pro detail Luny.

Pohyb kamery používá `requestAnimationFrame` a časový krok, nezávisí na obnovovací frekvenci monitoru. Polohy během plynutí aktualizuje každý vykreslený snímek; popisky se aktualizují 4×/s. V klidu renderer kreslí pouze změny. Skrytá karta nepočítá ani nekreslí scénu. Pixel ratio je omezeno na 2. Plynulost na konkrétním GPU, 60/120 Hz či 4K zde není změřena.

## Integrace

Samostatná obrazovka může být položkou Oblohy/Dne nebo může běžet ve stejnooriginovém iframe. Pro hostitelský Orloj je k dispozici:

```js
window.OrlojObservatory.setTime(new Date('2026-11-27T18:00:00Z'));
window.OrlojObservatory.setView('system'); // system | earth | moon
window.OrlojObservatory.pause();
window.OrlojObservatory.getState();
```

Čistá data lze používat také bez WebGL:

```js
OrlojObservatoryData.compute(Astronomy, new Date());
OrlojObservatoryData.nextPhases(Astronomy, new Date());
OrlojObservatoryData.lunarOrbit(Astronomy, new Date(), 128);
OrlojObservatoryData.seasons(Astronomy, 2026);
```

Tato dodávka přidává modul v samostatné větvi. Nenahrazuje hlavní `index.html` ani astronomické jádro. Před začleněním do hlavního PWA doplnit navigaci a explicitní cache/fallback pravidla `sw.js`.

## Ověření

`node --test tests/observatory-data.test.cjs` ověřuje normalizaci a orientaci vektorů, polokoule během slunovratů, astronomické sezony a lunární fáze proti nezávislým minutovým referencím USNO s tolerancí 120 s, kalendářní kontinuitu let 1900/2000/2100, proměnlivou lunární vzdálenost a zamítnutí neplatných vstupů.

Dne 27. 11. 2026 prošlo všech 108 testů repozitáře (včetně 9 nových astronomických testů). Kód prošel kontrolou syntaxe a samostatnou code review. Cloudový QA prohlížeč má WebGL vypnuté (`GL_RENDERER = Disabled`), proto není dokončeno vizuální ověření WebGL ani interakcí skutečné scény na desktopu a telefonu. Nejde o prokázanou chybu aplikace. Před sloučením je potřeba model otevřít v prohlížeči s WebGL a ověřit tři pohledy, přehrávání, pinch/drag, témata a obě měřítka. Dodat skutečný render ve Blenderu neznamená, že byl otestován WebGL renderer.

## Prameny

- Astronomy Engine: https://github.com/cosinekitty/astronomy/tree/master/source/js
- USNO sezony: https://aa.usno.navy.mil/calculated/seasons?dst=false&submit=Get+Data&tz=0&tz_label=true&tz_sign=1&year=2026
- USNO fáze: https://aa.usno.navy.mil/calculated/moon/phases?date=2026-11-01&format=p&nump=8
- NASA Earth Observatory / Blue Marble: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- NASA SVS / CGI Moon Kit: https://svs.gsfc.nasa.gov/4720/
- Detailní kredity, mirror a úpravy textur: `assets/observatory/SOURCES.md`.
- Licence Three.js je zachována ve `vendor/THREE-LICENSE.txt`; Astronomy Engine obsahuje vlastní licenční hlavičku.
