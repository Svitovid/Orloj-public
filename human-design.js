/*
 * Orloj Human Design engine · v2
 *
 * Pure calculation and SVG rendering module. It intentionally contains no
 * personal data and performs no network requests. The host application passes
 * its local planetary longitude functions into calculate().
 *
 * The 64-gate Rave Mandala, 36-channel topology and 88° solar-arc method are
 * implemented as structural rules of the Human Design system. See
 * THIRD_PARTY_NOTICES.md for the open-source calculation reference used during
 * independent verification.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OrlojHumanDesign = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var GATE_SIZE = 360 / 64;
  var LINE_SIZE = GATE_SIZE / 6;
  var MANDALA_START = 358.25; // Gate 25 begins at 28°15′ Pisces.
  var DAY = 86400000;

  var GATE_ORDER = [
    25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12,
    15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6,
    46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11,
    10, 58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55, 37, 63, 22, 36
  ];

  var PLANET_ORDER = [
    "sun", "earth", "northNode", "southNode", "moon", "mercury", "venus",
    "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"
  ];

  var PLANETS = {
    sun: { name: "Slunce", glyph: "☉" },
    earth: { name: "Země", glyph: "⊕" },
    northNode: { name: "Severní uzel", glyph: "☊" },
    southNode: { name: "Jižní uzel", glyph: "☋" },
    moon: { name: "Měsíc", glyph: "☽" },
    mercury: { name: "Merkur", glyph: "☿" },
    venus: { name: "Venuše", glyph: "♀" },
    mars: { name: "Mars", glyph: "♂" },
    jupiter: { name: "Jupiter", glyph: "♃" },
    saturn: { name: "Saturn", glyph: "♄" },
    uranus: { name: "Uran", glyph: "♅" },
    neptune: { name: "Neptun", glyph: "♆" },
    pluto: { name: "Pluto", glyph: "♇" }
  };

  var CENTERS = {
    head: {
      name: "Hlava", short: "Hlava", kind: "tlak",
      keys: "inspirace · otázky · mentální tlak",
      defined: "Inspirace a tlak klást otázky mají podle systému stálý vlastní rytmus.",
      undefined: "Citlivost k otázkám okolí; rizikem je řešit vše, co zrovna tlačí na mysl.",
      open: "Bez aktivované brány: velmi proměnlivý vztah k inspiraci a cizím otázkám.",
      question: "Je tato otázka opravdu moje?"
    },
    ajna: {
      name: "Ajna", short: "Ajna", kind: "vědomí",
      keys: "zpracování · pojmy · jistota",
      defined: "Způsob zpracování informací bývá podle systému konzistentní.",
      undefined: "Pružná mysl může vidět více perspektiv; stínem je potřeba působit jistě.",
      open: "Bez aktivované brány: maximální otevřenost různým způsobům myšlení.",
      question: "Potřebuji mít jistotu, nebo mohu zůstat u poctivé otázky?"
    },
    throat: {
      name: "Hrdlo", short: "Hrdlo", kind: "projev",
      keys: "řeč · jednání · zviditelnění",
      defined: "Projev má podle systému rozpoznatelný a opakovatelný způsob.",
      undefined: "Citlivost k hlasům okolí; tlak mluvit nebo jednat kvůli pozornosti.",
      open: "Bez aktivované brány: široká proměnlivost hlasu, projevu a načasování.",
      question: "Mluvím, protože je čas — nebo abych získal pozornost?"
    },
    g: {
      name: "G centrum", short: "G", kind: "identita",
      keys: "směr · identita · láska",
      defined: "Systém zde čte stabilnější pocit směru a identity.",
      undefined: "Identita se proměňuje podle lidí a místa; prostředí má velkou váhu.",
      open: "Bez aktivované brány: velmi otevřené pole pro různé směry a identity.",
      question: "Jsem na místě a mezi lidmi, kde mohu být sám sebou?"
    },
    heart: {
      name: "Srdce / Ego", short: "Ego", kind: "motor",
      keys: "vůle · hodnota · závazek",
      defined: "Vůle pracuje podle systému v opakovatelných dávkách, nikoli bez přestání.",
      undefined: "Citlivost na cizí vůli; stínem je dokazovat hodnotu přehnanými sliby.",
      open: "Bez aktivované brány: žádný pevný tlak dokazovat hodnotu výkonem.",
      question: "Slibuji z jasné vůle, nebo proto, abych něco dokázal?"
    },
    sacral: {
      name: "Sakrál", short: "Sakrál", kind: "motor",
      keys: "životní síla · práce · odpověď",
      defined: "Trvalejší životní motor; klíčem systému je tělesná odpověď na konkrétní podnět.",
      undefined: "Energie není stálá a může zesilovat tempo druhých; důležité je včas skončit.",
      open: "Bez aktivované brány: velmi otevřený vztah k práci, energii a rytmu druhých.",
      question: "Na co moje tělo skutečně odpovídá ano — a kdy už je dost?"
    },
    spleen: {
      name: "Slezina", short: "Slezina", kind: "vědomí",
      keys: "instinkt · zdraví · přítomnost",
      defined: "Instinktivní signál má být podle systému tichý, okamžitý a neopakuje se.",
      undefined: "Zesílení cizích obav; stínem je držet se nezdravého kvůli známému bezpečí.",
      open: "Bez aktivované brány: široká citlivost k instinktům a obavám prostředí.",
      question: "Co vím právě teď — a čeho se držím jen ze strachu?"
    },
    solar: {
      name: "Solar Plexus", short: "Solar", kind: "motor · vědomí",
      keys: "emoce · vlna · citová jasnost",
      defined: "Emoce se pohybují ve vlně; systém radí nerozhodovat na jejím prvním vrcholu.",
      undefined: "Citlivost k emocím druhých; stínem je vyhnout se pravdě kvůli okamžitému klidu.",
      open: "Bez aktivované brány: velmi otevřené přijímání a zesilování emocionálního pole.",
      question: "Je to už jasnost, nebo pouze současná poloha emoční vlny?"
    },
    root: {
      name: "Kořen", short: "Kořen", kind: "motor · tlak",
      keys: "stres · pohon · dokončení",
      defined: "Tlak a stres mají podle systému vlastní stabilnější způsob zpracování.",
      undefined: "Zesílení vnějšího tlaku; stínem je spěchat jen proto, aby napětí zmizelo.",
      open: "Bez aktivované brány: velmi otevřená citlivost ke spěchu a adrenalinu okolí.",
      question: "Je tento spěch nutný, nebo se jen snažím zbavit tlaku?"
    }
  };

  var CENTER_GATES = {
    head: [61, 63, 64],
    ajna: [4, 11, 17, 24, 43, 47],
    throat: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62],
    g: [1, 2, 7, 10, 13, 15, 25, 46],
    heart: [21, 26, 40, 51],
    sacral: [3, 5, 9, 14, 27, 29, 34, 42, 59],
    spleen: [18, 28, 32, 44, 48, 50, 57],
    solar: [6, 22, 30, 36, 37, 49, 55],
    root: [19, 38, 39, 41, 52, 53, 54, 58, 60]
  };

  var GATE_DATA = {
    1:["Tvořivost","sebevyjádření"],2:["Směr","receptivita"],3:["Uspořádání","nový začátek"],4:["Formulace","odpovědi"],
    5:["Pevný rytmus","čekání"],6:["Tření","hranice intimity"],7:["Role Já","vedení"],8:["Přínos","osobní styl"],
    9:["Soustředění","detail"],10:["Chování Já","sebeláska"],11:["Ideje","obrazy"],12:["Opatrnost","projev podle nálady"],
    13:["Naslouchání","paměť"],14:["Síla dovedností","zdroje"],15:["Extrémy","lidský rytmus"],16:["Dovednosti","cvičení a mistrovství"],
    17:["Názory","logické uspořádání"],18:["Náprava","korekce"],19:["Potřeby","citlivost"],20:["Přítomnost","teď"],
    21:["Kontrola","správa zdrojů"],22:["Otevřenost","půvab a nálada"],23:["Asimilace","zjednodušení"],24:["Návrat","racionalizace"],
    25:["Nevinnost","univerzální láska"],26:["Vliv","přesvědčování"],27:["Péče","výživa"],28:["Zápas","hledání smyslu"],
    29:["Závazek","vytrvalost"],30:["Touha","intenzita pocitu"],31:["Vliv","demokratické vedení"],32:["Trvání","kontinuita"],
    33:["Ústraní","soukromí a paměť"],34:["Síla","samostatná životní energie"],35:["Změna","zkušenost"],36:["Krize","vstup do neznámého"],
    37:["Rodina","dohoda"],38:["Bojovník","účel v odporu"],39:["Provokace","uvolnění ducha"],40:["Samota","práce a odpočinek"],
    41:["Kontrakce","počátek zkušenosti"],42:["Růst","dokončení"],43:["Průlom","vhled"],44:["Setkání","rozpoznání vzorců"],
    45:["Shromáždění","společné zdroje"],46:["Láska k tělu","správné místo a čas"],47:["Uvědomění","smysl minulosti"],48:["Hloubka","zdroje řešení"],
    49:["Principy","revoluce"],50:["Hodnoty","odpovědnost"],51:["Šok","iniciace"],52:["Klid","koncentrace"],
    53:["Začátky","rozvoj"],54:["Ambice","transformace"],55:["Duch","hojnost a nálada"],56:["Stimulace","příběh"],
    57:["Intuice","okamžitá jasnost"],58:["Vitalita","radost ze zlepšení"],59:["Intimita","prolomení bariér"],60:["Omezení","přijetí formy"],
    61:["Vnitřní pravda","tajemství"],62:["Detail","pojmenování"],63:["Pochybnost","testování"],64:["Zmatek","obrazy před jasností"]
  };

  function ch(a, b, name, centers, circuit) {
    return { gates: [a, b], key: a + "-" + b, name: name, centers: centers, circuit: circuit };
  }

  var CHANNELS = [
    ch(1,8,"Inspirace",["g","throat"],"individuální"),ch(2,14,"Tep",["g","sacral"],"individuální"),
    ch(3,60,"Mutace",["sacral","root"],"individuální"),ch(4,63,"Logika",["ajna","head"],"kolektivní"),
    ch(5,15,"Rytmus",["sacral","g"],"kolektivní"),ch(6,59,"Intimita",["solar","sacral"],"kmenový"),
    ch(7,31,"Alfa",["g","throat"],"kolektivní"),ch(9,52,"Koncentrace",["sacral","root"],"kolektivní"),
    ch(10,20,"Probuzení",["g","throat"],"integrační"),ch(10,34,"Průzkum",["g","sacral"],"integrační"),
    ch(10,57,"Dokonalá forma",["g","spleen"],"integrační"),ch(11,56,"Zvídavost",["ajna","throat"],"kolektivní"),
    ch(12,22,"Otevřenost",["throat","solar"],"individuální"),ch(13,33,"Svědek",["g","throat"],"kolektivní"),
    ch(16,48,"Vlnová délka",["throat","spleen"],"kolektivní"),ch(17,62,"Přijetí",["ajna","throat"],"kolektivní"),
    ch(18,58,"Posouzení",["spleen","root"],"kolektivní"),ch(19,49,"Syntéza",["root","solar"],"kmenový"),
    ch(20,34,"Charisma",["throat","sacral"],"integrační"),ch(20,57,"Mozková vlna",["throat","spleen"],"integrační"),
    ch(21,45,"Správa hmoty",["heart","throat"],"kmenový"),ch(23,43,"Strukturování",["throat","ajna"],"individuální"),
    ch(24,61,"Vědomí",["ajna","head"],"individuální"),ch(25,51,"Iniciace",["g","heart"],"individuální"),
    ch(26,44,"Předání",["heart","spleen"],"kmenový"),ch(27,50,"Zachování",["sacral","spleen"],"kmenový"),
    ch(28,38,"Zápas",["spleen","root"],"individuální"),ch(29,46,"Objev",["sacral","g"],"kolektivní"),
    ch(30,41,"Rozpoznání",["solar","root"],"kolektivní"),ch(32,54,"Transformace",["spleen","root"],"kmenový"),
    ch(34,57,"Síla",["sacral","spleen"],"integrační"),ch(35,36,"Proměnlivost",["throat","solar"],"kolektivní"),
    ch(37,40,"Společenství",["solar","heart"],"kmenový"),ch(39,55,"Emoce",["root","solar"],"individuální"),
    ch(42,53,"Dozrávání",["sacral","root"],"kolektivní"),ch(47,64,"Abstrakce",["ajna","head"],"kolektivní")
  ];

  var TYPES = {
    manifestingGenerator:{name:"Manifestující generátor",strategy:"Nejprve reagovat, potom informovat",signature:"Spokojenost",notSelf:"Frustrace · hněv",copy:"Definovaný Sakrál je spojen s Hrdlem přes síť aktivních kanálů. Systém proto spojuje generátorovou odpověď s rychlým převodem energie do projevu."},
    generator:{name:"Generátor",strategy:"Čekat na podnět a reagovat",signature:"Spokojenost",notSelf:"Frustrace",copy:"Sakrál je definovaný, ale motor není propojen s Hrdlem. Systém klade důraz na tělesnou odpověď a udržitelné použití životní síly."},
    manifestor:{name:"Manifestor",strategy:"Před jednáním informovat dotčené",signature:"Klid",notSelf:"Hněv",copy:"Motor je propojen s Hrdlem bez definovaného Sakrálu. Systém jej čte jako konfiguraci schopnou zahajovat pohyb."},
    projector:{name:"Projektor",strategy:"Pro zásadní kroky čekat na rozpoznání a pozvání",signature:"Úspěch",notSelf:"Hořkost",copy:"Sakrál není definovaný a žádný motor není spojen s Hrdlem. Systém zde čte citlivost k druhým a zaměření na vedení energie spíše než její stálou produkci."},
    reflector:{name:"Reflektor",strategy:"Dát zásadnímu rozhodnutí lunární cyklus",signature:"Překvapení",notSelf:"Zklamání",copy:"Žádné centrum není definované úplným kanálem. Systém zdůrazňuje proměnlivost, prostředí a čas."}
  };

  var AUTHORITIES = {
    emotional:{name:"Emoční · Solar Plexus",short:"Emoční",copy:"Rozhodnutí nemá být definitivní v prvním vrcholu ani propadu. Tradice doporučuje nechat proběhnout emoční vlnu a hledat jasnost v čase."},
    sacral:{name:"Sakrální",short:"Sakrální",copy:"Vodítkem má být okamžitá tělesná odpověď na konkrétní podnět, nikoli předem vytvořený mentální plán."},
    splenic:{name:"Slezinná",short:"Slezinná",copy:"Vodítkem má být tichý a okamžitý instinkt přítomného okamžiku; obvykle se neopakuje hlasitěji."},
    ego:{name:"Ego / vůle",short:"Ego",copy:"Rozhodnutí se v tomto systému opírá o skutečnou vůli, hodnotu závazku a schopnost slyšet, co je srdce ochotné nést."},
    self:{name:"Sebe-projektovaná",short:"Sebe-projektovaná",copy:"Jasnost se hledá slyšením vlastního hlasu v bezpečném prostoru, nikoli přijetím rady druhého jako verdiktu."},
    mental:{name:"Mentální / prostředí",short:"Mentální",copy:"Vnitřní autorita není definovaná; tradice pracuje se správným prostředím, časem a rozhovorem jako zvukovým zrcadlem."},
    lunar:{name:"Lunární",short:"Lunární",copy:"U reflektoru je vodítkem čas, proměna prostředí a celý lunární cyklus, nikoli okamžitá jistota."}
  };

  var LINES = {
    1:{name:"Badatel",copy:"Hledá pevný základ, zkoumá a potřebuje porozumět konstrukci věci."},
    2:{name:"Poustevník",copy:"Nese přirozený talent, který roste v soukromí a bývá rozpoznán zvenčí."},
    3:{name:"Experimentátor",copy:"Učí se přímou zkušeností, zkouškou, opravou a novým pokusem."},
    4:{name:"Oportunista",copy:"Příležitosti a vliv proudí přes důvěryhodné vztahy a vlastní síť."},
    5:{name:"Kacíř",copy:"Okolí na něj promítá očekávání praktického řešení; klíčové jsou hranice projekce."},
    6:{name:"Vzor",copy:"Zkušenost dozrává v odstup, nadhled a příklad, který nemusí nic vnucovat."}
  };

  var CROSS_NAMES = {
    1:["The Sphinx","Self-Expression","Defiance"],2:["The Sphinx","The Driver","Defiance"],3:["Laws","Mutation","Wishes"],4:["Explanation","Formulization","Revolution"],
    5:["Consciousness","Habits","Separation"],6:["Eden","Conflict","The Plane"],7:["The Sphinx","Interaction","The Masks"],8:["Contagion","Contribution","Uncertainty"],
    9:["Planning","Focus","Identification"],10:["The Vessel of Love","Behavior","Prevention"],11:["Eden","Ideas","Education"],12:["Eden","Articulation","Education"],
    13:["The Sphinx","Listening","The Masks"],14:["Contagion","Empowering","Uncertainty"],15:["The Vessel of Love","Extremes","Prevention"],16:["Planning","Experimentation","Identification"],
    17:["Service","Opinions","Upheaval"],18:["Service","Correction","Upheaval"],19:["The Four Ways","Need","Refinement"],20:["The Sleeping Phoenix","The Now","Duality"],
    21:["Tension","Control","Endeavor"],22:["Rulership","Grace","Informing"],23:["Explanation","Assimilation","Dedication"],24:["The Four Ways","Rationalization","Incarnation"],
    25:["The Vessel of Love","Innocence","Healing"],26:["Rulership","The Trickster","Confrontation"],27:["The Unexpected","Caring","Alignment"],28:["The Unexpected","Risks","Alignment"],
    29:["Contagion","Commitment","Industry"],30:["Contagion","Fates","Industry"],31:["The Unexpected","Influence","The Alpha"],32:["Maya","Conservation","Limitation"],
    33:["The Four Ways","Retreat","Refinement"],34:["The Sleeping Phoenix","Power","Duality"],35:["Consciousness","Experience","Separation"],36:["Eden","Crisis","The Plane"],
    37:["Planning","Bargains","Migration"],38:["Tension","Opposition","Individualism"],39:["Tension","Provocation","Individualism"],40:["Planning","Denial","Migration"],
    41:["The Unexpected","Fantasy","The Alpha"],42:["Maya","Completion","Limitation"],43:["Explanation","Insight","Dedication"],44:["The Four Ways","Alertness","Incarnation"],
    45:["Rulership","Possession","Confrontation"],46:["The Vessel of Love","Serendipity","Healing"],47:["Rulership","Oppression","Informing"],48:["Tension","Depth","Endeavor"],
    49:["Explanation","Principles","Revolution"],50:["Laws","Values","Wishes"],51:["Penetration","Shock","The Clarion"],52:["Service","Stillness","Demands"],
    53:["Penetration","Beginnings","Cycles"],54:["Penetration","Ambition","Cycles"],55:["The Sleeping Phoenix","Moods","Spirit"],56:["Laws","Stimulation","Distraction"],
    57:["Penetration","Intuition","The Clarion"],58:["Service","Vitality","Demands"],59:["The Sleeping Phoenix","Strategy","Spirit"],60:["Laws","Limitation","Distraction"],
    61:["Maya","Thinking","Obscuration"],62:["Maya","Details","Obscuration"],63:["Consciousness","Doubts","Dominion"],64:["Consciousness","Confusion","Dominion"]
  };

  function mod(n, d) { return ((n % d) + d) % d; }

  function gateAt(longitude) {
    var normalized = mod(Number(longitude), 360);
    var adjusted = mod(normalized - MANDALA_START, 360);
    var gateIndex = Math.floor((adjusted + 1e-10) / GATE_SIZE) % 64;
    var withinGate = adjusted - gateIndex * GATE_SIZE;
    if (withinGate < 0) withinGate += GATE_SIZE;
    var line = Math.min(6, Math.floor((withinGate + 1e-10) / LINE_SIZE) + 1);
    var withinLine = withinGate - (line - 1) * LINE_SIZE;
    var lowerDistance=withinLine,upperDistance=LINE_SIZE-withinLine,alternative=null;
    if(Math.min(lowerDistance,upperDistance)<0.03){
      if(lowerDistance<=upperDistance)alternative=line>1?{gate:GATE_ORDER[gateIndex],line:line-1}:{gate:GATE_ORDER[mod(gateIndex-1,64)],line:6};
      else alternative=line<6?{gate:GATE_ORDER[gateIndex],line:line+1}:{gate:GATE_ORDER[(gateIndex+1)%64],line:1};
    }
    return {
      gate: GATE_ORDER[gateIndex],
      line: line,
      withinGate: withinGate,
      gateBoundary: Math.min(withinGate, GATE_SIZE - withinGate),
      lineBoundary: Math.min(withinLine, LINE_SIZE - withinLine),
      boundaryAlternative: alternative
    };
  }

  function gateCenter(gate) {
    var keys = Object.keys(CENTER_GATES);
    for (var i = 0; i < keys.length; i++) if (CENTER_GATES[keys[i]].indexOf(gate) >= 0) return keys[i];
    return null;
  }

  function activation(planet, longitude) {
    var mapped = gateAt(longitude);
    var data = GATE_DATA[mapped.gate] || ["Brána " + mapped.gate, "—"];
    return {
      planet: planet,
      name: PLANETS[planet].name,
      glyph: PLANETS[planet].glyph,
      longitude: mod(longitude, 360),
      gate: mapped.gate,
      line: mapped.line,
      center: gateCenter(mapped.gate),
      gateName: data[0],
      gateTheme: data[1],
      gateBoundary: mapped.gateBoundary,
      lineBoundary: mapped.lineBoundary,
      nearBoundary: !!mapped.boundaryAlternative,
      boundaryAlternative: mapped.boundaryAlternative
    };
  }

  function angleForProfile(profile) {
    if (profile === "4/1") return "juxtaposition";
    if (["5/1", "5/2", "6/2", "6/3"].indexOf(profile) >= 0) return "left";
    return "right";
  }

  function crossFor(personality, design, profile) {
    var gates = [personality.sun.gate, personality.earth.gate, design.sun.gate, design.earth.gate];
    var angle = angleForProfile(profile);
    var names = CROSS_NAMES[gates[0]] || ["Unknown", "Unknown", "Unknown"];
    var index = angle === "right" ? 0 : angle === "juxtaposition" ? 1 : 2;
    var angleName = angle === "right" ? "Pravý úhlový" : angle === "left" ? "Levý úhlový" : "Juxtapozice";
    var translated = names[index] === "Service" ? "Služby" : names[index];
    return { angle: angle, angleName: angleName, name: names[index], displayName: translated, gates: gates };
  }

  function graphFromChannels(channels) {
    var graph = {};
    Object.keys(CENTERS).forEach(function (c) { graph[c] = []; });
    channels.forEach(function (channel) {
      var a = channel.centers[0], b = channel.centers[1];
      if (graph[a].indexOf(b) < 0) graph[a].push(b);
      if (graph[b].indexOf(a) < 0) graph[b].push(a);
    });
    return graph;
  }

  function connected(graph, start, targets) {
    if (!graph[start]) return false;
    var queue = [start], seen = {};
    while (queue.length) {
      var current = queue.shift();
      if (seen[current]) continue;
      seen[current] = true;
      if (targets.indexOf(current) >= 0) return true;
      (graph[current] || []).forEach(function (next) { if (!seen[next]) queue.push(next); });
    }
    return false;
  }

  function definitionFor(defined, channels) {
    if (!defined.length) return { key: "none", name: "Bez definice", components: 0 };
    var graph = graphFromChannels(channels), seen = {}, components = 0;
    defined.forEach(function (center) {
      if (seen[center]) return;
      components++;
      var queue = [center];
      while (queue.length) {
        var current = queue.shift();
        if (seen[current]) continue;
        seen[current] = true;
        (graph[current] || []).forEach(function (next) { if (!seen[next]) queue.push(next); });
      }
    });
    var names = { 1:"Single Definition", 2:"Split Definition", 3:"Triple Split", 4:"Quadruple Split" };
    return { key: components === 1 ? "single" : "split-" + components, name: names[components] || (components + " oddělené definice"), components: components };
  }

  function derive(personality, design) {
    var gateMap = {};
    function registerActivation(side, planet, activationData) {
      if (!activationData) return;
      var gate = activationData.gate, data = GATE_DATA[gate] || ["Brána " + gate, "—"];
      if (!gateMap[gate]) {
        gateMap[gate] = {
          gate: gate,
          name: data[0],
          theme: data[1],
          center: gateCenter(gate),
          layers: { personality: false, design: false },
          activations: []
        };
      }
      gateMap[gate].layers[side] = true;
      gateMap[gate].activations.push({
        side: side,
        planet: planet,
        name: PLANETS[planet].name,
        glyph: PLANETS[planet].glyph,
        activation: activationData
      });
    }
    PLANET_ORDER.forEach(function (planet) {
      registerActivation("personality", planet, personality[planet]);
      registerActivation("design", planet, design[planet]);
    });
    var activeGates = Object.keys(gateMap).map(Number).sort(function (a, b) { return a - b; });

    var channels = CHANNELS.filter(function (channel) {
      return activeGates.indexOf(channel.gates[0]) >= 0 && activeGates.indexOf(channel.gates[1]) >= 0;
    });
    var hangingChannels = CHANNELS.filter(function (channel) {
      var first = activeGates.indexOf(channel.gates[0]) >= 0, second = activeGates.indexOf(channel.gates[1]) >= 0;
      return first !== second;
    }).map(function (channel) {
      var activeGate = activeGates.indexOf(channel.gates[0]) >= 0 ? channel.gates[0] : channel.gates[1];
      var missingGate = activeGate === channel.gates[0] ? channel.gates[1] : channel.gates[0];
      return {
        key: channel.key,
        name: channel.name,
        centers: channel.centers,
        circuit: channel.circuit,
        activeGate: activeGate,
        missingGate: missingGate,
        layers: gateMap[activeGate].layers
      };
    });
    var defined = [];
    channels.forEach(function (channel) {
      channel.centers.forEach(function (center) { if (defined.indexOf(center) < 0) defined.push(center); });
    });
    var graph = graphFromChannels(channels);
    var hasSacral = defined.indexOf("sacral") >= 0;
    var motorToThroat = connected(graph, "throat", ["sacral", "heart", "solar", "root"]);
    var typeKey = !defined.length ? "reflector" : hasSacral ? (motorToThroat ? "manifestingGenerator" : "generator") : (motorToThroat ? "manifestor" : "projector");
    var authorityKey = defined.indexOf("solar") >= 0 ? "emotional" : hasSacral ? "sacral" : defined.indexOf("spleen") >= 0 ? "splenic" : defined.indexOf("heart") >= 0 ? "ego" : defined.indexOf("g") >= 0 ? "self" : !defined.length ? "lunar" : "mental";
    var profileKey = personality.sun.line + "/" + design.sun.line;
    var centerMap = {};
    Object.keys(CENTERS).forEach(function (center) {
      var gates = CENTER_GATES[center].filter(function (gate) { return activeGates.indexOf(gate) >= 0; });
      centerMap[center] = {
        id: center,
        status: defined.indexOf(center) >= 0 ? "defined" : gates.length ? "undefined" : "open",
        gates: gates,
        data: CENTERS[center]
      };
    });
    var near = [];
    PLANET_ORDER.forEach(function (planet) {
      if (personality[planet] && personality[planet].nearBoundary) near.push({ side:"personality", activation:personality[planet] });
      if (design[planet] && design[planet].nearBoundary) near.push({ side:"design", activation:design[planet] });
    });
    return {
      typeKey: typeKey,
      type: TYPES[typeKey],
      authorityKey: authorityKey,
      authority: AUTHORITIES[authorityKey],
      profile: { key:profileKey, conscious:LINES[personality.sun.line], design:LINES[design.sun.line], consciousLine:personality.sun.line, designLine:design.sun.line },
      cross: crossFor(personality, design, profileKey),
      definition: definitionFor(defined, channels),
      personality: personality,
      design: design,
      activeGates: activeGates,
      gateMap: gateMap,
      activeGateDetails: activeGates.map(function (gate) { return gateMap[gate]; }),
      channels: channels,
      hangingChannels: hangingChannels,
      definedCenters: defined,
      centerMap: centerMap,
      nearBoundaries: near
    };
  }

  function designMoment(birthMs, longitude) {
    var personalitySun = mod(longitude("sun", new Date(birthMs)), 360);
    var target = mod(personalitySun - 88, 360);
    var low = birthMs - 100 * DAY, high = birthMs - 80 * DAY, middle = (low + high) / 2;
    for (var i = 0; i < 52; i++) {
      middle = (low + high) / 2;
      var current = mod(longitude("sun", new Date(middle)), 360);
      var difference = mod(current - target + 180, 360) - 180;
      if (Math.abs(difference) < 0.000001) break;
      if (difference > 0) high = middle;
      else low = middle;
    }
    return middle;
  }

  function positionSet(at, longitude, nodeLongitude) {
    var date = new Date(at), result = {};
    var sun = mod(longitude("sun", date), 360), node = mod(nodeLongitude(date), 360);
    result.sun = activation("sun", sun);
    result.earth = activation("earth", sun + 180);
    result.northNode = activation("northNode", node);
    result.southNode = activation("southNode", node + 180);
    ["moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"].forEach(function (planet) {
      result[planet] = activation(planet, longitude(planet, date));
    });
    return result;
  }

  function calculate(options) {
    if (!options || !isFinite(options.birthMs)) throw new Error("Human Design vyžaduje platný okamžik narození.");
    if (typeof options.longitude !== "function" || typeof options.nodeLongitude !== "function") throw new Error("Chybí poskytovatel astronomických poloh.");
    var birthMs = Number(options.birthMs);
    var designAt = designMoment(birthMs, options.longitude);
    var chart = derive(
      positionSet(birthMs, options.longitude, options.nodeLongitude),
      positionSet(designAt, options.longitude, options.nodeLongitude)
    );
    chart.birthAt = birthMs;
    chart.designAt = designAt;
    chart.method = { designSolarArc:88, gateSize:GATE_SIZE, lineSize:LINE_SIZE };
    return chart;
  }

  var CENTER_POS = {
    head:{x:180,y:48},ajna:{x:180,y:126},throat:{x:180,y:216},g:{x:180,y:332},
    heart:{x:270,y:355},spleen:{x:62,y:414},solar:{x:298,y:414},sacral:{x:180,y:464},root:{x:180,y:560}
  };

  function channelGroups() {
    var groups = {};
    CHANNELS.forEach(function (channel) {
      var key = channel.centers.slice().sort().join("|");
      if (!groups[key]) groups[key] = [];
      groups[key].push(channel);
    });
    return groups;
  }

  var CHANNEL_GROUPS = channelGroups();

  function channelCurve(channel) {
    var a = CENTER_POS[channel.centers[0]], b = CENTER_POS[channel.centers[1]];
    var group = CHANNEL_GROUPS[channel.centers.slice().sort().join("|")];
    var index = group.indexOf(channel), offset = (index - (group.length - 1) / 2) * 7;
    var dx = b.x - a.x, dy = b.y - a.y, length = Math.sqrt(dx * dx + dy * dy) || 1;
    var px = -dy / length * offset, py = dx / length * offset;
    var c1x = a.x + dx * 0.34 + px, c1y = a.y + dy * 0.34 + py;
    var c2x = a.x + dx * 0.66 + px, c2y = a.y + dy * 0.66 + py;
    return { p0:{x:a.x,y:a.y},p1:{x:c1x,y:c1y},p2:{x:c2x,y:c2y},p3:{x:b.x,y:b.y} };
  }

  function midpoint(a, b) { return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }
  function curvePath(p0, p1, p2, p3) {
    return "M" + p0.x.toFixed(1) + "," + p0.y.toFixed(1) + " C" + p1.x.toFixed(1) + "," + p1.y.toFixed(1) + " " + p2.x.toFixed(1) + "," + p2.y.toFixed(1) + " " + p3.x.toFixed(1) + "," + p3.y.toFixed(1);
  }
  function channelPath(channel) {
    var c = channelCurve(channel);
    return curvePath(c.p0,c.p1,c.p2,c.p3);
  }
  function channelHalfPath(channel, first) {
    var c=channelCurve(channel),q0=midpoint(c.p0,c.p1),q1=midpoint(c.p1,c.p2),q2=midpoint(c.p2,c.p3),r0=midpoint(q0,q1),r1=midpoint(q1,q2),m=midpoint(r0,r1);
    return first?curvePath(c.p0,q0,r0,m):curvePath(m,r1,q2,c.p3);
  }

  function centerShape(id, status, count) {
    var cls = "hd-center " + status, p = CENTER_POS[id], label = CENTERS[id].short;
    var statusLabel = status === "defined" ? "definované" : status === "undefined" ? "nedefinované" : "otevřené";
    var shape;
    if (id === "head") shape = '<polygon points="180,16 137,77 223,77"/>';
    else if (id === "ajna") shape = '<polygon points="137,98 223,98 180,162"/>';
    else if (id === "g") shape = '<polygon points="180,276 236,332 180,388 124,332"/>';
    else if (id === "heart") shape = '<polygon points="242,328 303,355 242,382"/>';
    else if (id === "spleen") shape = '<polygon points="28,380 105,414 28,448"/>';
    else if (id === "solar") shape = '<polygon points="332,380 255,414 332,448"/>';
    else if (id === "throat") shape = '<rect x="137" y="181" width="86" height="70" rx="12"/>';
    else if (id === "sacral") shape = '<rect x="138" y="429" width="84" height="70" rx="12"/>';
    else shape = '<rect x="138" y="527" width="84" height="66" rx="12"/>';
    return '<g class="' + cls + '" data-hd-center="' + id + '" role="button" tabindex="0" aria-label="' + CENTERS[id].name + ': ' + statusLabel + '">' +
      shape + '<text class="hd-center-name" x="' + p.x + '" y="' + (p.y - 2) + '" text-anchor="middle">' + label + '</text>' +
      '<text class="hd-center-count" x="' + p.x + '" y="' + (p.y + 13) + '" text-anchor="middle">' + (count ? count + " aktiv." : "bez aktiv.") + '</text></g>';
  }

  function renderBodygraph(chart) {
    if (!chart) return "";
    var active = {}, gateLayers = chart.gateMap || {};
    chart.channels.forEach(function (channel) { active[channel.key] = true; });
    if (!Object.keys(gateLayers).length) {
      PLANET_ORDER.forEach(function (planet) {
        var personality=chart.personality[planet],design=chart.design[planet];
        if(personality){if(!gateLayers[personality.gate])gateLayers[personality.gate]={layers:{}};gateLayers[personality.gate].layers.personality=true;}
        if(design){if(!gateLayers[design.gate])gateLayers[design.gate]={layers:{}};gateLayers[design.gate].layers.design=true;}
      });
    }
    function gateLayer(gate){var entry=gateLayers[gate],layer=entry&&(entry.layers||entry);return !layer?null:(layer.personality&&layer.design?"both":layer.personality?"personality":"design");}
    var out = '<svg class="hd-bodygraph" viewBox="0 0 360 610" role="group" aria-labelledby="hd-svg-title hd-svg-desc">' +
      '<title id="hd-svg-title">Bodygraph Human Design</title><desc id="hd-svg-desc">Devět center a třicet šest kanálů. Segmenty rozlišují aktivace osobnosti a designu; barevná centra jsou definována úplnými kanály.</desc>';
    out += '<g class="hd-channel-layer">';
    CHANNELS.forEach(function (channel) {
      var on = !!active[channel.key],left=gateLayer(channel.gates[0]),right=gateLayer(channel.gates[1]),partial=!!(left||right),path = channelPath(channel), label = "Kanál " + channel.key + " · " + channel.name;
      out += '<g class="hd-channel ' + (on ? "defined" : partial?"hanging":"inactive") + '"'+(on?' data-hd-channel="'+channel.key+'" role="button" tabindex="0" aria-label="'+label+' · definovaný"':'')+'>' +
        '<path class="hd-channel-visible" d="' + path + '"/>'+
        (left?'<path class="hd-channel-segment '+left+'" d="'+channelHalfPath(channel,true)+'"/>':'')+
        (right?'<path class="hd-channel-segment '+right+'" d="'+channelHalfPath(channel,false)+'"/>':'')+
        (on?'<path class="hd-channel-hit" d="' + path + '"/>':'')+'</g>';
    });
    out += '</g><g class="hd-center-layer">';
    Object.keys(CENTERS).forEach(function (id) {
      var center = chart.centerMap[id];
      out += centerShape(id, center.status, center.gates.length);
    });
    out += '</g></svg>';
    return out;
  }

  function compareCharts(base, alternative) {
    var activationChanges = 0, gateChanges = 0;
    ["personality","design"].forEach(function (side) {
      PLANET_ORDER.forEach(function (planet) {
        var a = base[side][planet], b = alternative[side][planet];
        if (a.gate !== b.gate) gateChanges++;
        if (a.gate !== b.gate || a.line !== b.line) activationChanges++;
      });
    });
    var core = [];
    if (base.typeKey !== alternative.typeKey) core.push("typ");
    if (base.authorityKey !== alternative.authorityKey) core.push("autorita");
    if (base.profile.key !== alternative.profile.key) core.push("profil");
    if (base.definition.key !== alternative.definition.key) core.push("definice");
    if (base.cross.gates.join("-") !== alternative.cross.gates.join("-")) core.push("inkarnační kříž");
    return { coreChanges:core, activationChanges:activationChanges, gateChanges:gateChanges };
  }

  return {
    calculate: calculate,
    derive: derive,
    gateAt: gateAt,
    renderBodygraph: renderBodygraph,
    compareCharts: compareCharts,
    PLANET_ORDER: PLANET_ORDER,
    PLANETS: PLANETS,
    CENTERS: CENTERS,
    CENTER_GATES: CENTER_GATES,
    GATES: GATE_DATA,
    CHANNELS: CHANNELS,
    TYPES: TYPES,
    AUTHORITIES: AUTHORITIES,
    LINES: LINES,
    constants: { gateSize:GATE_SIZE, lineSize:LINE_SIZE, mandalaStart:MANDALA_START }
  };
});
