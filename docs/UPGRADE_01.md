# Orloj — první obrazy a přesnější kalendář

Pracovní upgrade z 25. listopadu 2026. Navazuje na **Design Foundation, PR #23**
(`125e816c811ebf2aa4d11518282143aa2fc333ce`). Je určený ke kontrole na samostatné
větvi; produkční `main` ani nastavení hostingu nemění.

## Co se mění

### Profil dne

`day.html` přebírá jediný existující systém vzhledu. Úvod zvýrazňuje datum,
Lunu a denní číslo, pod nimi jsou stručné údaje. Mapa a události stojí na
desktopu vedle sebe; planety, aspekty, osobní tranzity a kalendáře se otevírají
v nativních rozbalovacích sekcích. Všechny původní datové vazby zůstávají.

Mapa je výslovně označená jako **Mapa místního poledne**. Nadále používá
stávající `day-profile.js` / Astronomy Engine a vybrané časové pásmo.
Nejde o živou mapu okamžiku. Numerologické metody ani osobní profil se nemění.

Vzhled sdílí barvy, fonty, velikost textu a registr symbolů s ostatními již
zapojenými plochami. `day-reader.css` je pouze prezentační vrstva. Na menších
šířkách se obsah skládá do jednoho sloupce; ovládání má klávesnicové cíle a
respektuje systémové omezení pohybu.

### Precese

Nový `precession.html` je samostatný astronomický obraz s texturovanou Zemí,
pohybem osy, rovníku, ekliptiky a jarního bodu. Vstup je z Profilu dne a
z navigace návrhu Design Foundation. Ovládání nabízí otočení pohledu,
přehrávání času, posuvník, návrat Nyní a celou obrazovku, pokud ji prohlížeč
podporuje.

Hranice IAU a ilustrační 30° sektory jsou dvě zřetelně pojmenované konvence.
Žádná hodnota není označená za obecně přijatý začátek věku Vodnáře.

| Soubor | Úloha |
| --- | --- |
| `precession-core.js` | Testovatelné souřadnice, interpolace a hranice |
| `precession-data.js` | Verzionované výstupy ERFA, hranice IAU a hvězdný výběr |
| `precession.js` | Canvas, ovládání, sdílený vzhled a životní cyklus |
| `precession.css` | Vzhled obrazu navázaný na `--of-*` |
| `scripts/precession/` | Reprodukovatelný vědecký generátor a připnuté závislosti |

Runtime nemá CDN ani síťové API. Textura Země je místní soubor. Přehrávání
začíná pouze na požádání a zastaví se při skrytí/opuštění stránky nebo změně
na omezený pohyb. Vynucená tmavá paleta byla odstraněna; rozhraní i barvy
diagramu reagují na sdílený vzhled včetně vlastního pozadí.

Metoda, zdroje a zjednodušení jsou přímo ve stránce a podrobněji v
`scripts/precession/README.md`. Roky jsou juliánské epochy, hvězdy fixované
na J2000, osvětlení Země ilustrační; model vynechává nutaci a vlastní pohyb
hvězd. Licence a úpravy podkladů jsou v `THIRD_PARTY_NOTICES.md`.

### Kalendářní oprava

Starý `dayNumber` v `index.html` se nahrazuje počtem skutečně uplynulých UTC
dnů při zachování epochy **1999-12-31 00:00 UTC = 0**. Odstraňuje chyby
nepřestupných století a uchovává milisekundy. Moderní výstupy s celými
sekundami odpovídají původnímu výrazu v jeho platném rozsahu.

Tím je vyřešený konkrétní kalendářní defekt z issue #22. Starší orbitální
aproximace a heuristiky zatmění nadále čekají na samostatný audit; tento
upgrade neuzavírá celé astronomy P0.

## Ověření

- Výchozí Design Foundation: **107/107** testů.
- Po integraci: `node --test tests/*.test.js` — **124/124** testů.
- Osm nových kalendářních testů: epocha, 1900/2000/2100/2200, přestupné dny,
  milisekundy, offsety, letní čas a neplatné datum.
- Devět nových testů precese: nezávislé reference ERFA, souřadnice, obě
  konvence, topologie prstenců a hranice platnosti.
- Regenerace 1 303 vzorků a 1 303 prstenců: nulový numerický rozdíl vůči
  uloženým vědeckým datům. Metadata generátoru jsou podrobnější.
- Skutečný renderer spuštěn s nativním Canvas a testovým DOM: obě konvence,
  posun hranic, přehrávání/zastavení, skrytí stránky, návrat Nyní, starověk,
  dva pohledy, úzké plátno, světlá paleta a 150% text. Nejde o browser QA.
- Skutečný service worker ověřen s neúspěšným síťovým fetch: precache i
  fallback pro nové stránky, skripty, styly, texturu a URL s query parametry.
- Zachováno všech 45 původních ID Profilu dne, žádné duplicity; všechny
  místní reference existují. `git diff --check` je čisté.

## Kontrola před vydáním

Chromium se v pracovním prostředí ukončil při startu. **Kompletní vizuální
kontrola v prohlížeči není potvrzená.** Je třeba ověřit desktopové rozložení,
vlastní barvy a 150% text, klávesnici/dialog, celoobrazovkový režim a skutečný
offline reload po první instalaci cache. Safari/iPhone čeká na vlastní kontrolu.

Pro místní kontrolu stačí statický server z kořene checkoutu:

```sh
python -m http.server 8000
```

Otevři `http://localhost:8000/day.html` a `http://localhost:8000/precession.html`.
Soukromý profil z produkčního originu se na localhost automaticky nepřenese.

Po schválení a sloučení základního PR #23 je potřeba zkontrolovat cílovou
větev navazujícího PR a teprve potom rozhodnout o vydání. Další ucelený krok:
přesná Luna v Readeru a pokračování sjednocování astronomických výpočtů na
jedné vybrané ploše. Purple Rain bridge zůstává samostatnou etapou.
