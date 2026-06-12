let factions = [];
let enhancements = {};
let detachmentRules = {};
let detachmentStratagems = {};
let unitDetails = {};
let unitEnhancements = {};
let unitRuleReference = {};
let unitInstanceCounter = 0;
let unitFeatureCache = new Map();
const dataVersion = "20260610-data-pack-updater";
const savedListsKey = "forgelist40k.savedLists.v1";
const matchHistoryKey = "forgelist40k.matchHistory.v1";
const rulesEditionKey = "forgelist40k.rulesEdition.v1";
const userProfilesKey = "forgelist40k.userProfiles.v1";
const activeUserProfileKey = "forgelist40k.activeUserProfile.v1";
const betaTesterModeKey = "forgelist40k.betaTesterMode.v1";
const betaFeedbackKey = "forgelist40k.betaFeedback.v1";
const betaFeedbackSettingsKey = "forgelist40k.betaFeedbackSettings.v1";
const defaultBetaFeedbackGoogleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSe4KQyR25Pb6o9XayzOm_tkyup3bqw-TzprFUwJp4CkrQXZBg/viewform?usp=pp_url&entry.375539772=Error/bug&entry.816245796=Media&entry.741737959=TITLE&entry.1857125252=BODY&entry.1282817054=STEPS&entry.1812007493=EXPECTED&entry.1855082438=CONTACT&entry.490747431=CONTEXT_JSON";
const dataPackSettingsKey = "forgelist40k.dataPacks.v1";
const dataPackDbName = "forgelist40k-data-packs";
const dataPackDbStore = "files";
const dataPackFiles = ["factions.json", "detachment-rules.json", "detachment-stratagems.json", "unit-details.json"];
const defaultListName = "Lista sin nombre";
const editionProfiles = {
  "10e": {
    label: "10ma edicion",
    summary: "Usa el sistema actual de la app: codex/datasheets 10ma, Chapter Approved, OC, battleshock, misiones y layouts ya modelados.",
    scoring: {
      mobility: 1,
      scoring: 1,
      durability: 1,
      melee: 1,
      shooting: 1,
      antiTank: 1,
      control: 1,
    },
    analysis: {
      mission: 1,
      deployment: 1,
      layout: 1,
      secondary: 1,
      turns: 1,
      matchup: 1,
      memory: 1,
    },
    features: {
      hidden: 0,
      terrainObjectives: 0,
      noStratStacking: 0,
      chargeFlex: 0,
      disembarkTempo: 0,
      forceDisposition: 0,
    },
  },
  "11e": {
    label: "11va edicion",
    summary: "Modo 11va: conserva codex compatibles cuando no exista datasheet nuevo y cambia el analisis hacia objetivos/terreno, Hidden, cargas mas flexibles, menos stacking de estratagemas y planes de mision mas asimetricos.",
    scoring: {
      mobility: 1.12,
      scoring: 1.14,
      durability: 1.05,
      melee: 1.1,
      shooting: 0.94,
      antiTank: 0.98,
      control: 1.18,
    },
    analysis: {
      mission: 1.18,
      deployment: 1.08,
      layout: 1.16,
      secondary: 1.06,
      turns: 1.12,
      matchup: 1.04,
      memory: 0.9,
    },
    features: {
      hidden: 1,
      terrainObjectives: 1,
      noStratStacking: 1,
      chargeFlex: 1,
      disembarkTempo: 1,
      forceDisposition: 1,
    },
  },
};

const state = {
  savedLists: [],
  matchHistory: [],
  userProfiles: [],
  activeUserProfileId: "",
  betaTesterMode: false,
  betaFeedbackOpen: false,
  betaFeedbackReports: [],
  betaFeedbackSettings: {
    sendMethod: "googleForm",
    googleFormUrl: defaultBetaFeedbackGoogleFormUrl,
    email: "",
    endpoint: "",
  },
  editingMatchId: null,
  reviewingMatchId: null,
  pendingMatchImageData: null,
  pendingMatchDraft: null,
  pendingMatchEnemyList: null,
  activeListId: null,
  rulesEdition: "10e",
  profile: "competitive",
  gameSize: 2000,
  faction: null,
  detachment: null,
  roster: [],
  enemyFaction: null,
  enemyDetachment: null,
  enemyRoster: [],
  detachmentLoadouts: {
    player: [],
    enemy: [],
  },
  factionRulesExpanded: false,
  detachmentRulesExpanded: {
    player: false,
    enemy: false,
  },
  stratagemView: {
    open: false,
    side: "player",
  },
  unitDetailView: {
    open: false,
    side: "player",
    mode: "catalog",
    index: null,
    unit: null,
    draft: null,
  },
  catalogSections: {
    player: new Set(),
    enemy: new Set(),
  },
  dataAudit: {
    factionId: "all",
    severity: "all",
    query: "",
  },
  dataPackSettings: {
    manifestUrl: "",
    channel: "11e-beta",
    autoCheck: false,
    activePacks: {},
    lastCheckedAt: "",
  },
  dataPackStatus: "",
  guidedTour: {
    open: false,
    index: 0,
  },
};

const metrics = [
  ["mobility", "Movilidad", ["mobility", "deep strike", "infiltrate", "scout"]],
  ["scoring", "Scoring", ["scoring", "objectives", "battleline"]],
  ["durability", "Durabilidad", ["durable", "anchor", "vehicle", "monster", "elite"]],
  ["melee", "Melee", ["melee", "threat", "trading"]],
  ["shooting", "Disparo", ["shooting", "fire support", "indirect"]],
  ["antiTank", "Anti-tank", ["anti-tank"]],
  ["control", "Control", ["screen", "move block", "infiltrate", "control"]],
];

const $ = (selector) => document.querySelector(selector);
const sectionOrder = ["Epic Hero", "Character", "Battleline", "Dedicated Transport", "Fortification", "Infantry", "Mounted", "Monster", "Vehicle", "Allied Units", "Legends", "Other"];
const chapterApprovedMissionPool = [
  { letter: "A", mission: "takeHold", missionName: "Take and Hold", deployment: "tippingPoint", deploymentName: "Tipping Point", layouts: [1, 2, 4, 6, 7, 8] },
  { letter: "B", mission: "supplyDrop", missionName: "Supply Drop", deployment: "tippingPoint", deploymentName: "Tipping Point", layouts: [1, 2, 4, 6, 7, 8] },
  { letter: "C", mission: "linchpin", missionName: "Linchpin", deployment: "tippingPoint", deploymentName: "Tipping Point", layouts: [1, 2, 4, 6, 7, 8] },
  { letter: "D", mission: "scorchedEarth", missionName: "Scorched Earth", deployment: "tippingPoint", deploymentName: "Tipping Point", layouts: [1, 2, 4, 6, 7, 8] },
  { letter: "E", mission: "takeHold", missionName: "Take and Hold", deployment: "hammer", deploymentName: "Hammer and Anvil", layouts: [1, 7, 8] },
  { letter: "F", mission: "hiddenSupplies", missionName: "Hidden Supplies", deployment: "hammer", deploymentName: "Hammer and Anvil", layouts: [1, 7, 8] },
  { letter: "G", mission: "purgeFoe", missionName: "Purge the Foe", deployment: "hammer", deploymentName: "Hammer and Anvil", layouts: [1, 7, 8] },
  { letter: "H", mission: "supplyDrop", missionName: "Supply Drop", deployment: "hammer", deploymentName: "Hammer and Anvil", layouts: [1, 7, 8] },
  { letter: "I", mission: "hiddenSupplies", missionName: "Hidden Supplies", deployment: "search", deploymentName: "Search and Destroy", layouts: [1, 2, 3, 4, 6] },
  { letter: "J", mission: "linchpin", missionName: "Linchpin", deployment: "search", deploymentName: "Search and Destroy", layouts: [1, 2, 3, 4, 6] },
  { letter: "K", mission: "scorchedEarth", missionName: "Scorched Earth", deployment: "search", deploymentName: "Search and Destroy", layouts: [1, 2, 3, 4, 6] },
  { letter: "L", mission: "takeHold", missionName: "Take and Hold", deployment: "search", deploymentName: "Search and Destroy", layouts: [1, 2, 3, 4, 6] },
  { letter: "M", mission: "purgeFoe", missionName: "Purge the Foe", deployment: "crucible", deploymentName: "Crucible of Battle", layouts: [1, 2, 4, 6, 8] },
  { letter: "N", mission: "hiddenSupplies", missionName: "Hidden Supplies", deployment: "crucible", deploymentName: "Crucible of Battle", layouts: [1, 2, 4, 6, 8] },
  { letter: "O", mission: "terraform", missionName: "Terraform", deployment: "crucible", deploymentName: "Crucible of Battle", layouts: [1, 2, 4, 6, 8] },
  { letter: "P", mission: "scorchedEarth", missionName: "Scorched Earth", deployment: "crucible", deploymentName: "Crucible of Battle", layouts: [1, 2, 4, 6, 8] },
  { letter: "Q", mission: "supplyDrop", missionName: "Supply Drop", deployment: "sweeping", deploymentName: "Sweeping Engagement", layouts: [3, 5] },
  { letter: "R", mission: "terraform", missionName: "Terraform", deployment: "sweeping", deploymentName: "Sweeping Engagement", layouts: [3, 5] },
  { letter: "S", mission: "linchpin", missionName: "Linchpin", deployment: "dawn", deploymentName: "Dawn of War", layouts: [5] },
  { letter: "T", mission: "purgeFoe", missionName: "Purge the Foe", deployment: "dawn", deploymentName: "Dawn of War", layouts: [5] },
];
const coreRuleReferences = {
  hazardous: {
    name: "Hazardous",
    description: "Weapons with [HAZARDOUS] require a Hazardous test after the unit has resolved its attacks. For each failed test, the firing unit suffers the relevant mortal wounds or model loss described by the core rules.",
  },
  pistol: {
    name: "Pistol",
    description: "A unit with Pistols can shoot those Pistols while within Engagement Range of enemy units. If it does, it can only target one of the enemy units it is within Engagement Range of, and it cannot shoot non-Pistol weapons at the same time.",
  },
  "devastating wounds": {
    name: "Devastating Wounds",
    description: "Each time an attack with [DEVASTATING WOUNDS] scores a Critical Wound, no saving throw can be made against that attack and it inflicts mortal wounds instead of normal damage.",
  },
  "rapid fire": {
    name: "Rapid Fire",
    description: "Weapons with [RAPID FIRE x] add x attacks when the target is within half range.",
  },
  torrent: {
    name: "Torrent",
    description: "Weapons with [TORRENT] automatically hit their target.",
  },
  "ignores cover": {
    name: "Ignores Cover",
    description: "Attacks made with [IGNORES COVER] ignore the Benefit of Cover when resolving saving throws.",
  },
  "twin linked": {
    name: "Twin-linked",
    description: "Weapons with [TWIN-LINKED] can re-roll the Wound roll.",
  },
  assault: {
    name: "Assault",
    description: "A unit that Advanced this turn is still eligible to shoot weapons with [ASSAULT].",
  },
  heavy: {
    name: "Heavy",
    description: "Each time an attack is made with a [HEAVY] weapon by a model whose unit Remained Stationary this turn, add 1 to the Hit roll.",
  },
  blast: {
    name: "Blast",
    description: "Weapons with [BLAST] gain extra attacks against larger target units and cannot be used to attack units within Engagement Range of the attacking model's unit.",
  },
  melta: {
    name: "Melta",
    description: "Weapons with [MELTA x] add x to the Damage characteristic when targeting units within half range.",
  },
  lance: {
    name: "Lance",
    description: "If the bearer's unit made a Charge move this turn, add 1 to the Wound roll for attacks with [LANCE].",
  },
  precision: {
    name: "Precision",
    description: "Attacks with [PRECISION] can be allocated to visible Character models in an Attached unit.",
  },
  "lethal hits": {
    name: "Lethal Hits",
    description: "Each Critical Hit with [LETHAL HITS] automatically wounds the target.",
  },
  "sustained hits": {
    name: "Sustained Hits",
    description: "Each Critical Hit with [SUSTAINED HITS x] scores x additional hits.",
  },
  "extra attacks": {
    name: "Extra Attacks",
    description: "Weapons with [EXTRA ATTACKS] can be used in addition to the bearer's other melee weapons.",
  },
  "one shot": {
    name: "One Shot",
    description: "Weapons with [ONE SHOT] can only be shot once per battle.",
  },
  "indirect fire": {
    name: "Indirect Fire",
    description: "Weapons with [INDIRECT FIRE] can target units that are not visible, with the core rules penalties for doing so.",
  },
  anti: {
    name: "Anti",
    description: "Weapons with [ANTI-keyword x+] score a Critical Wound against targets with the listed keyword on unmodified Wound rolls of x+.",
  },
};
const archetypes = {
  meleeRush: {
    legacy: ["pressure", "melee"],
    weights: { charge: 3, speed: 3, melee: 3, trading: 1.6, durability: 1.1, shooting: -0.8, scoring: 0.8, pressure: 2 },
    minimums: { scoring: 2, trading: 3, antiTank: 1, antiHorde: 1, screens: 1, midboard: 2 },
  },
  trading: {
    legacy: ["pressure", "mission"],
    weights: { speed: 2.4, trading: 3, cheap: 2.2, scoring: 1.6, melee: 1, shooting: 1, durability: 0.8, pressure: 1.3 },
    minimums: { scoring: 3, trading: 3, antiTank: 1, screens: 1, midboard: 1 },
  },
  gunline: {
    legacy: ["shooting", "durable"],
    weights: { shooting: 3, antiTank: 2.4, durability: 2.2, anchor: 2.3, screens: 2, indirect: 1.4, speed: -0.5, melee: -0.5 },
    minimums: { scoring: 2, antiTank: 2, antiHorde: 1, screens: 2, home: 1 },
  },
  skew: {
    legacy: ["durable", "shooting"],
    weights: { durability: 2.2, anchor: 1.6, monsterVehicle: 2.8, elite: 2.4, pressure: 1.2, cheap: -1.1 },
    minimums: { scoring: 2, antiTank: 1, midboard: 1 },
  },
  horde: {
    legacy: ["mission", "pressure"],
    weights: { cheap: 3, scoring: 3, screens: 3, boardControl: 2.6, speed: 1.3, durability: 0.7, elite: -1.3 },
    minimums: { scoring: 4, trading: 2, screens: 3, antiTank: 1, home: 1 },
  },
  alphaStrike: {
    legacy: ["shooting", "pressure"],
    weights: { shooting: 2.6, antiTank: 2.6, speed: 2.2, deepStrike: 1.7, pressure: 2.3, trading: 1.2, durability: -0.4 },
    minimums: { scoring: 2, antiTank: 2, trading: 2, screens: 1 },
  },
  midrange: {
    legacy: ["mission", "shooting", "pressure", "durable"],
    weights: { scoring: 1.7, trading: 1.5, shooting: 1.5, melee: 1.2, antiTank: 1.5, durability: 1.4, speed: 1.2, screens: 1.2 },
    minimums: { scoring: 3, trading: 2, antiTank: 1, antiHorde: 1, screens: 1, home: 1, midboard: 1 },
  },
  attrition: {
    legacy: ["durable", "mission"],
    weights: { durability: 3, anchor: 2.4, scoring: 1.5, recovery: 1.4, trading: 0.8, speed: -0.4, elite: 1.2 },
    minimums: { scoring: 2, antiTank: 1, screens: 1, home: 1, midboard: 1 },
  },
  mobilityTempo: {
    legacy: ["mission", "pressure"],
    weights: { speed: 3, scoring: 2.4, deepStrike: 2.2, screens: 1.6, trading: 1.4, shooting: 0.8, durability: -0.5 },
    minimums: { scoring: 3, trading: 2, screens: 2, midboard: 2 },
  },
  combo: {
    legacy: ["shooting", "durable", "mission"],
    weights: { synergy: 3, buff: 2.8, anchor: 1.4, elite: 1.2, shooting: 1.2, melee: 1.2, cheap: -0.4 },
    minimums: { scoring: 2, antiTank: 1, screens: 1, home: 1 },
  },
};

const legacyFactionRuleSummaries = {
  spaceMarines: {
    rule: "Oath-style focus fire",
    plan: "Marcan una pieza clave, concentran dano fiable y usan unidades flexibles para jugar primarias y secundarias.",
    list: "Necesitan redundancia de mision, anti-tank real y personajes que potencien bricks o unidades de trading.",
  },
  tyranids: {
    rule: "Synapse, Shadow pressure y control biologico",
    plan: "Ganan por capas de presencia: pantallas, monstruos, sinapsis y presion de mesa que fuerza errores.",
    list: "Mezcla scoring barato, nodos de sinapsis, amenazas duras y alguna respuesta clara a tanques.",
  },
  aeldari: {
    rule: "Manipulacion de dados y activaciones precisas",
    plan: "Pegan primero, reposicionan y convierten recursos limitados en intercambios muy favorables.",
    list: "Necesitan piezas moviles, dano concentrado y suficientes unidades pequenas para no regalar tempo.",
  },
  orks: {
    rule: "Waaagh y masa de presion",
    plan: "Aceleran el combate, saturan objetivos y ganan por tempo cuando el rival no puede limpiar todo.",
    list: "Quiere cuerpos, amenazas melee redundantes, pantallas y algunos golpes anti-vehiculo.",
  },
  necrons: {
    rule: "Reanimation y resistencia incremental",
    plan: "Ganan desgastando: piezas dificiles de retirar, recursion y amenazas que castigan mala priorizacion.",
    list: "Necesitan anclas, scoring resistente y dano suficiente para no solo sobrevivir.",
  },
  adeptaSororitas: {
    rule: "Acts of Faith y eficiencia por sacrificio",
    plan: "Usan recursos de dados, trading barato y golpes de alta calidad para ganar intercambios clave.",
    list: "Necesitan varias piezas prescindibles, anti-tank fiable y personajes que conviertan recursos en dano.",
  },
  chaosSpaceMarines: {
    rule: "Dark Pacts y picos ofensivos",
    plan: "Cambian riesgo por dano explosivo, combinando elites, cultistas, vehiculos y personajes de alto impacto.",
    list: "Necesitan pantallas, buenos portadores de marks/enhancements y redundancia para no depender de una sola tirada.",
  },
  tAuEmpire: {
    rule: "Coordinacion de disparo y spotters",
    plan: "Controlan lineas, eliminan amenazas a distancia y usan movilidad para negar contraataques.",
    list: "Necesitan observers, unidades de disparo principales, pantallas y alguna herramienta para misiones moviles.",
  },
  astraMilitarum: {
    rule: "Orders, volumen y fuego indirecto/directo",
    plan: "Ganan por economia: muchas unidades, tanques eficientes y control de mesa por capas.",
    list: "Balancea ordenes, cuerpos baratos, artilleria/tanques y unidades que puedan puntuar lejos.",
  },
  adeptusCustodes: {
    rule: "Elite durable y control de calidad",
    plan: "Pocas unidades, pero cada una pelea muy por encima de su tamano y castiga trading malo.",
    list: "Necesita movilidad, acciones/secondaries y no sobreinvertir en demasiadas piezas lentas.",
  },
  adeptusMechanicus: {
    rule: "Doctrinas y sinergias tecnicas",
    plan: "Escalan por buffs, disparo especializado y piezas que funcionan mejor en paquetes.",
    list: "Necesitan motores de sinergia, pantallas y dano especializado que cubra horda y tanques.",
  },
  greyKnights: {
    rule: "Teleportacion y presion psiquica",
    plan: "Juegan mas rapido que el rival: reposicionan, amenazan flancos y puntuan donde el rival no llega.",
    list: "Necesita unidades duras, movilidad, anti-tank suficiente y evitar quedarse sin cuerpos.",
  },
  imperialKnights: {
    rule: "Honor, armigers y grandes chasis",
    plan: "Amenazan toda la mesa con perfiles enormes y obligan al rival a tener respuestas anti-tank.",
    list: "Necesita suficientes cuerpos pequenos/armigers para mision y no depender de dos modelos grandes.",
  },
  chaosKnights: {
    rule: "Terror, battleshock y skew de chasis",
    plan: "Presionan por amenaza, perfiles duros y efectos que deterioran el plan enemigo.",
    list: "Necesita mezcla de wardogs, amenaza pesada y presencia para puntuar sin regalar primarias.",
  },
  drukhari: {
    rule: "Power from Pain y trading movil",
    plan: "Atacan con precision, tradean barato y usan transportes/movilidad para dictar tempo.",
    list: "Necesitan MSU, transportes utiles, anti-tank quirurgico y piezas que puedan puntuar sin morir gratis.",
  },
  genestealerCults: {
    rule: "Cult Ambush y recursion de mesa",
    plan: "Ganan por amenaza difusa: aparecen, comercian, vuelven y saturan objetivos.",
    list: "Necesitan muchas unidades, herramientas anti-tank y redundancia para que el plan sobreviva a mala recursion.",
  },
  worldEaters: {
    rule: "Blessings of Khorne y melee explosivo",
    plan: "Buscan contacto rapido, presionan turno 1-2 y convierten charges en ventaja de tempo.",
    list: "Necesita amenazas redundantes, pantallas, movilidad y alguna respuesta a unidades que no quieren pelear.",
  },
  deathGuard: {
    rule: "Contagio, resistencia y attrition",
    plan: "Aguantan, reducen eficiencia enemiga y ganan al quedarse con recursos cuando el rival se agota.",
    list: "Necesita movilidad suficiente, scoring barato y dano que compense su ritmo lento.",
  },
  thousandSons: {
    rule: "Cabal points y magia de precision",
    plan: "Convierten personajes y unidades psiquicas en herramientas exactas para dano, control y movilidad.",
    list: "Necesita suficientes generadores de cabal, pantallas y amenazas que aprovechen buffs.",
  },
  leaguesOfVotann: {
    rule: "Judgement tokens y eficiencia compacta",
    plan: "Castigan objetivos marcados, juegan en bloques resistentes y hacen trading de alta calidad.",
    list: "Necesita movilidad, unidades de mision y balance entre hearthguard/thunderkyn/transportes.",
  },
  bloodAngels: {
    rule: "Astartes con sesgo de asalto",
    plan: "Usan movilidad, personajes agresivos y melee eficiente para tomar mesa temprano.",
    list: "Necesita amenazas jump/melee, pantallas, scoring y anti-tank que no dependa solo del combate.",
  },
  darkAngels: {
    rule: "Astartes resistentes y elite disciplinada",
    plan: "Juegan bricks duros, personajes potentes y control del centro con alta resistencia.",
    list: "Necesita evitar sobreinvertir en terminators y mantener unidades baratas para acciones.",
  },
  spaceWolves: {
    rule: "Astartes de sagas y contra-carga",
    plan: "Combinan presion melee, personajes y amenazas moviles que castigan acercarse.",
    list: "Necesita tempo, pantallas, trading y suficiente disparo para abrir transportes.",
  },
  blackTemplars: {
    rule: "Vows, presion y durabilidad de cruzada",
    plan: "Avanzan al medio, aguantan mejor de lo esperado y convierten melee en control de mesa.",
    list: "Necesita bricks, personajes de soporte, cuerpos y alguna herramienta de largo alcance.",
  },
  chaosDaemons: {
    rule: "Shadow of Chaos y amenazas invulnerables",
    plan: "Presionan con monstruos, deep strike y control psicologico de zonas clave.",
    list: "Necesita scoring barato, monstruos que definan matchups y no depender solo de invulnerables.",
  },
  imperialAgents: {
    rule: "Herramientas imperiales flexibles",
    plan: "Aportan piezas tecnicas, assassins, inquisidores y unidades de mision para cubrir huecos.",
    list: "Necesita claridad: cada unidad debe resolver una tarea concreta, no solo ser tematica.",
  },
  deathwatch: {
    rule: "Kill teams y adaptacion anti-xenos",
    plan: "Usan unidades mixtas, disparo especializado y personajes para resolver objetivos concretos.",
    list: "Necesita evitar bricks demasiado caros y conservar movilidad para puntuar.",
  },
  imperialFists: {
    rule: "Astartes de fuego disciplinado y asedio",
    plan: "Castigan desde posiciones fuertes y premian disparo sostenido sobre objetivos clave.",
    list: "Necesita anclas, lineas de tiro, pantallas y unidades moviles que no se queden atras.",
  },
  ironHands: {
    rule: "Astartes mecanizados y resistencia vehicular",
    plan: "Construyen alrededor de dreadnoughts/vehiculos, reparaciones y fuego resistente.",
    list: "Necesita Techmarines, chasis redundantes y piezas de mision que no sean vehiculos.",
  },
  ravenGuard: {
    rule: "Sigilo, infiltracion y presion lateral",
    plan: "Ganan posicion antes de que empiece el intercambio y fuerzan al rival a desplegar incomodo.",
    list: "Necesita infiltradores, movilidad, lone operatives y dano suficiente para capitalizar posicion.",
  },
  salamanders: {
    rule: "Fuego cercano, melta/flamer y resistencia",
    plan: "Presionan media mesa con dano de corto alcance y unidades que pelean bien en objetivos.",
    list: "Necesita transportes utiles, anti-tank cercano, overwatch/anti-horda y control del centro.",
  },
  ultramarines: {
    rule: "Flexibilidad tactica y personajes de mando",
    plan: "Adaptan el plan por turnos, usan heroes eficientes y juegan midrange muy estable.",
    list: "Necesita buenas piezas de trading, portadores de enhancement y no saturarse de personajes.",
  },
  whiteScars: {
    rule: "Velocidad, flancos y asalto movil",
    plan: "Ganan por tempo: llegan antes, fuerzan respuestas y cambian de flanco rapido.",
    list: "Necesita unidades veloces, presion melee, secondaries y dano para abrir objetivos.",
  },
  emperorsChildren: {
    rule: "Exceso, precision melee y presion de elite",
    plan: "Combinan personajes, unidades de ruido/melee y picos de dano para dominar intercambios.",
    list: "Necesita cuerpos de mision, transportes utiles y no depender de una sola pieza cara.",
  },
};

const factionRuleSummaries = {
  spaceMarines: {
    name: "Oath of Moment",
    effect: "Enfoca al ejercito contra una unidad enemiga prioritaria para que los ataques Astartes sean mas fiables contra ese objetivo.",
  },
  bloodAngels: {
    name: "Oath of Moment",
    effect: "Mantiene el foco Astartes sobre una unidad clave; el capitulo suele aprovecharlo rematando objetivos con presion melee.",
  },
  darkAngels: {
    name: "Oath of Moment",
    effect: "Marca una amenaza enemiga como prioridad y mejora la consistencia de las unidades Adeptus Astartes contra ella.",
  },
  spaceWolves: {
    name: "Oath of Moment",
    effect: "Permite concentrar dano sobre una pieza enemiga importante, normalmente para abrir cargas o controlar el centro.",
  },
  blackTemplars: {
    name: "Oath of Moment",
    effect: "Da foco contra una unidad enemiga prioritaria; los votos y detachments del capitulo se suman encima de esa base Astartes.",
  },
  deathwatch: {
    name: "Oath of Moment",
    effect: "Ayuda a que los kill teams y piezas de precision borren una amenaza marcada de forma mas consistente.",
  },
  imperialFists: {
    name: "Oath of Moment",
    effect: "Concentra el fuego Astartes en el objetivo marcado, especialmente util para convertir volumen de disparo en dano fiable.",
  },
  ironHands: {
    name: "Oath of Moment",
    effect: "Selecciona una amenaza prioritaria y permite que vehiculos, dreadnoughts y apoyo Astartes la ataquen con mayor fiabilidad.",
  },
  ravenGuard: {
    name: "Oath of Moment",
    effect: "Fija una presa clave para que unidades moviles o infiltradas conviertan posicion en eliminaciones importantes.",
  },
  salamanders: {
    name: "Oath of Moment",
    effect: "Permite concentrar dano de corto alcance sobre el objetivo marcado, ideal para melta, flamer y presion de media mesa.",
  },
  ultramarines: {
    name: "Oath of Moment",
    effect: "Da un objetivo prioritario al ejercito y mejora la consistencia de sus unidades flexibles al resolver esa amenaza.",
  },
  whiteScars: {
    name: "Oath of Moment",
    effect: "Marca una pieza enemiga para que la presion movil del capitulo pueda destruirla con menos varianza.",
  },
  tyranids: {
    name: "Shadow in the Warp",
    effect: "Una vez por batalla presiona el liderazgo enemigo con Battle-shock, afectando OC, estratagemas y control de objetivos.",
  },
  aeldari: {
    name: "Strands of Fate",
    effect: "Genera dados de destino que pueden sustituir tiradas criticas, bajando la varianza en momentos importantes.",
  },
  orks: {
    name: "Waaagh!",
    effect: "Una vez por batalla el ejercito obtiene un pico de agresion y supervivencia para convertir el turno clave de asalto.",
  },
  necrons: {
    name: "Reanimation Protocols",
    effect: "Las unidades recuperan modelos o heridas durante la batalla, haciendo que el rival tenga que terminar bien sus eliminaciones.",
  },
  adeptaSororitas: {
    name: "Acts of Faith",
    effect: "Usa Miracle dice para reemplazar tiradas importantes y asegurar cargas, salvaciones, dano o momentos de mision.",
  },
  chaosSpaceMarines: {
    name: "Dark Pacts",
    effect: "Las unidades arriesgan una prueba para ganar Lethal Hits o Sustained Hits y elevar su techo ofensivo.",
  },
  emperorsChildren: {
    name: "Dark Pacts",
    effect: "La base Heretic Astartes permite arriesgar liderazgo para potenciar ataques; los detachments de Slaanesh definen como explota ese pico.",
  },
  tAuEmpire: {
    name: "For the Greater Good",
    effect: "Unidades observadoras guian a unidades atacantes para mejorar disparos contra objetivos detectados.",
  },
  astraMilitarum: {
    name: "Voice of Command",
    effect: "Los oficiales emiten ordenes que mejoran el rendimiento de infanteria, escuadrones y vehiculos en el momento adecuado.",
  },
  adeptusCustodes: {
    name: "Martial Ka'tah",
    effect: "Elige posturas marciales que ajustan el combate de los Custodes segun el intercambio que necesitan ganar.",
  },
  adeptusMechanicus: {
    name: "Doctrina Imperatives",
    effect: "Selecciona imperativos de batalla que orientan al ejercito hacia protocolos ofensivos o defensivos.",
  },
  greyKnights: {
    name: "Teleport Assault",
    effect: "Permite reposicionar unidades mediante teletransporte para puntuar, presionar flancos y castigar huecos.",
  },
  imperialKnights: {
    name: "Code Chivalric",
    effect: "Elige juramentos que premian cumplir objetivos de honor y sostienen el plan de los Knights durante la partida.",
  },
  chaosKnights: {
    name: "Harbingers of Dread",
    effect: "Proyecta terror y presion de Battle-shock para degradar el control enemigo mientras los Knights avanzan.",
  },
  drukhari: {
    name: "Power from Pain",
    effect: "Los Pain tokens potencian unidades clave, normalmente para asegurar intercambios violentos o activaciones decisivas.",
  },
  genestealerCults: {
    name: "Cult Ambush",
    effect: "Unidades destruidas pueden volver desde emboscada, sosteniendo presencia de mesa y obligando al rival a limpiar dos veces.",
  },
  worldEaters: {
    name: "Blessings of Khorne",
    effect: "Cada ronda activa bendiciones que mejoran velocidad, letalidad o resistencia para empujar el plan melee.",
  },
  deathGuard: {
    name: "Nurgle's Gift",
    effect: "Las auras de contagio debilitan al enemigo cercano, haciendo mas favorables los intercambios de desgaste.",
  },
  thousandSons: {
    name: "Cabal of Sorcerers",
    effect: "Genera Cabal points para rituales que dan movilidad, dano, control o trucos psiquicos clave.",
  },
  leaguesOfVotann: {
    name: "Eye of the Ancestors",
    effect: "Los Judgement tokens marcan enemigos y hacen que las unidades Votann sean mas letales contra ellos.",
  },
  chaosDaemons: {
    name: "Shadow of Chaos",
    effect: "Controla zonas de la mesa con influencia demoniaca que afecta Battle-shock, supervivencia y presion de presencia.",
  },
  imperialAgents: {
    name: "Assigned Agents",
    effect: "Permite estructurar agentes imperiales y apoyos especializados alrededor de requisiciones y unidades de mision.",
  },
};

const codexAstartesFactionRule = {
  name: "Oath of Moment",
  timing: "Al inicio de tu fase de mando.",
  effect: "Elige 1 unidad del ejercito rival. Hasta el inicio de tu siguiente fase de mando, esa unidad es tu objetivo de Oath of Moment.",
  details: [
    { label: "Ataques", text: "Cada vez que un modelo con esta habilidad ataca a tu objetivo de Oath of Moment, puede repetir la tirada para impactar." },
    { label: "Codex Space Marines", text: "Si usas un detachment de Codex: Space Marines y tu ejercito no incluye unidades Blood Angels, Dark Angels, Space Wolves, Black Templars o Deathwatch, los ataques contra el objetivo de Oath of Moment tambien tienen +1 a herir." },
  ],
};

const divergentAstartesFactionRule = {
  name: "Oath of Moment",
  timing: "Al inicio de tu fase de mando.",
  effect: "Elige 1 unidad del ejercito rival. Hasta el inicio de tu siguiente fase de mando, esa unidad es tu objetivo de Oath of Moment.",
  details: [
    { label: "Ataques", text: "Cada vez que un modelo con esta habilidad ataca a tu objetivo de Oath of Moment, puede repetir la tirada para impactar." },
  ],
};

const explicitFactionRules = {
  spaceMarines: codexAstartesFactionRule,
  imperialFists: codexAstartesFactionRule,
  ironHands: codexAstartesFactionRule,
  ravenGuard: codexAstartesFactionRule,
  salamanders: codexAstartesFactionRule,
  ultramarines: codexAstartesFactionRule,
  whiteScars: codexAstartesFactionRule,
  bloodAngels: divergentAstartesFactionRule,
  darkAngels: divergentAstartesFactionRule,
  spaceWolves: divergentAstartesFactionRule,
  blackTemplars: divergentAstartesFactionRule,
  deathwatch: divergentAstartesFactionRule,
  tyranids: {
    name: "Shadow in the Warp",
    timing: "Una vez por batalla, en cualquier fase de mando.",
    effect: "Todas las unidades enemigas en el campo de batalla toman una prueba de Battle-shock.",
    details: [
      { label: "Neurotyrant", text: "Si uno o mas Neurotyrants de tu ejercito estan en el campo de batalla cuando activas esta regla, resta 1 a cada prueba de Battle-shock causada por Shadow in the Warp." },
    ],
  },
  aeldari: {
    name: "Strands of Fate",
    timing: "Al inicio de la primera ronda de batalla.",
    effect: "Generas Fate dice segun el tamano de batalla y los guardas en una reserva.",
    details: [
      { label: "Incursion", text: "3 Fate dice." },
      { label: "Strike Force", text: "6 Fate dice." },
      { label: "Onslaught", text: "9 Fate dice." },
      { label: "Uso", text: "Cuando usas una estratagema de detachment, si tienes un Fate die con el valor que corresponde a esa estratagema, puedes descartarlo para reducir el coste de CP de ese uso." },
    ],
  },
  orks: {
    name: "Waaagh!",
    timing: "Una vez por batalla, al inicio de tu fase de mando.",
    effect: "Hasta el inicio de tu siguiente fase de mando, el Waaagh! esta activo para tu ejercito.",
    details: [
      { label: "Movimiento y carga", text: "Las unidades con esta habilidad pueden declarar carga en un turno en el que avanzaron." },
      { label: "Melee", text: "Las armas melee equipadas por modelos con esta habilidad ganan +1 Fuerza y +1 Ataque." },
      { label: "Defensa", text: "Los modelos con esta habilidad tienen salvacion invulnerable de 5+ mientras el Waaagh! esta activo." },
    ],
  },
  necrons: {
    name: "Reanimation Protocols",
    timing: "Al final de tu fase de mando.",
    effect: "Cada unidad Necrons con esta habilidad que este en el campo de batalla reanima D3 heridas.",
    details: [
      { label: "Modelos heridos", text: "Si la unidad tiene modelos con heridas perdidas, asigna primero las heridas reanimadas para recuperar esas heridas." },
      { label: "Modelos destruidos", text: "Si todos los modelos de la unidad estan completos y la unidad esta por debajo de su fuerza inicial, devuelve modelos destruidos, uno por uno, con 1 herida restante." },
      { label: "Limite", text: "No puedes reanimar por encima de la fuerza inicial de la unidad." },
    ],
  },
  adeptaSororitas: {
    name: "Acts of Faith",
    timing: "Una vez por fase por cada unidad con esta habilidad.",
    effect: "Una unidad puede realizar 1 Act of Faith usando Miracle dice.",
    details: [
      { label: "Ganar Miracle dice", text: "Ganas 1 Miracle dice al inicio de cada ronda de batalla y cada vez que una unidad Adepta Sororitas de tu ejercito es destruida." },
      { label: "Valor", text: "Cuando ganas un Miracle die, tiras 1D6; ese resultado es el valor del dado y no cambia salvo por reglas que lo indiquen." },
      { label: "Uso", text: "Al realizar un Act of Faith, sustituyes una tirada permitida por el valor de uno de tus Miracle dice disponibles." },
    ],
  },
  chaosSpaceMarines: {
    name: "Dark Pacts",
    timing: "Cada vez que una unidad con esta habilidad es seleccionada para disparar o pelear.",
    effect: "Elige 1 beneficio para las armas de esa unidad hasta el final de la fase.",
    details: [
      { label: "Opcion 1", text: "Las armas ganan [Lethal Hits]." },
      { label: "Opcion 2", text: "Las armas ganan [Sustained Hits 1]." },
      { label: "Riesgo", text: "Despues de elegir, la unidad toma una prueba de Liderazgo; si falla, sufre dano mortal." },
    ],
  },
  emperorsChildren: {
    name: "Thrill Seekers",
    timing: "Durante un turno en el que la unidad avanzo o retrocedio.",
    effect: "La unidad sigue siendo elegible para disparar y para declarar cargas.",
    details: [
      { label: "Restriccion 1", text: "Si usa esta regla, no puede elegir como objetivo una unidad con la que estaba en Engagement Range al inicio del turno." },
      { label: "Restriccion 2", text: "Si usa esta regla, no puede elegir como objetivo una unidad que ya fue objetivo de otra carga o ataque en esa fase." },
    ],
  },
  tAuEmpire: {
    name: "For The Greater Good",
    timing: "Al inicio de tu fase de disparo.",
    effect: "Puedes seleccionar unidades con esta habilidad para actuar como Observer units.",
    details: [
      { label: "Observer", text: "Cada Observer que no haya sido seleccionado para disparar y sea elegible para disparar elige 1 unidad enemiga visible como Spotted unit hasta el final de la fase." },
      { label: "Restricciones", text: "Fortifications y unidades Battle-shocked no pueden ser Observer units." },
      { label: "Spotted", text: "Cada unidad enemiga solo puede ser marcada como Spotted una vez por fase." },
      { label: "Guided", text: "La unidad Guided recibe su mejora de disparo contra la Spotted unit y queda penalizada al atacar objetivos que no sean esa unidad." },
    ],
  },
  astraMilitarum: {
    name: "Voice Of Command",
    timing: "En tu fase de mando y al final de una fase en la que el Officer desembarco de un Transport o fue colocado en el campo de batalla.",
    effect: "Un modelo Officer con esta habilidad emite Orders.",
    details: [
      { label: "Numero de ordenes", text: "Cada datasheet de Officer indica cuantas Orders puede emitir y que unidades pueden recibirlas." },
      { label: "Rango", text: "Al emitir una Order, selecciona una unidad Astra Militarum elegible a 6 pulgadas del Officer." },
      { label: "Duracion", text: "La Order aplica hasta el inicio de tu siguiente fase de mando." },
    ],
  },
  adeptusCustodes: {
    name: "Martial Ka'tah",
    timing: "Cada vez que una unidad con esta habilidad es seleccionada para pelear.",
    effect: "Elige 1 postura Ka'tah para esa unidad. La postura elegida queda activa hasta que esa unidad termine de hacer sus ataques.",
    details: [
      { label: "Dacatarai Stance", text: "Las armas melee equipadas por modelos de esa unidad ganan [Sustained Hits 1]." },
      { label: "Rendax Stance", text: "Las armas melee equipadas por modelos de esa unidad ganan [Lethal Hits]." },
    ],
  },
  adeptusMechanicus: {
    name: "Doctrina Imperatives",
    timing: "Al inicio de la ronda de batalla.",
    effect: "Eliges un Doctrina Imperative activo para las unidades Adeptus Mechanicus con esta habilidad.",
    details: [
      { label: "Protocolo", text: "El Doctrina elegido aplica sus modificadores mientras este activo." },
      { label: "Alcance", text: "Solo las unidades con la habilidad Doctrina Imperatives reciben los efectos del protocolo." },
    ],
  },
  greyKnights: {
    name: "Teleport Assault",
    timing: "Al final del turno de tu rival.",
    effect: "Puedes retirar del campo de batalla unidades Grey Knights con esta habilidad.",
    details: [
      { label: "Incursion", text: "Hasta 1 unidad." },
      { label: "Strike Force", text: "Hasta 2 unidades." },
      { label: "Onslaught", text: "Hasta 3 unidades." },
      { label: "Regreso", text: "En tu siguiente fase de movimiento, esas unidades se colocan de nuevo usando las restricciones de Deep Strike." },
    ],
  },
  imperialKnights: {
    name: "Code Chivalric",
    timing: "Al final del paso Read Mission Objectives.",
    effect: "Determinas el Oath de tu ejercito para la batalla.",
    details: [
      { label: "Estructura", text: "El Oath se compone de 1 Deed y 1 Quality." },
      { label: "Seleccion", text: "Puedes elegir cada parte o determinarla aleatoriamente con 1D6 en la tabla correspondiente." },
      { label: "Deed", text: "La Deed define que debes lograr para completar el juramento." },
      { label: "Estado", text: "Los efectos del Oath cambian segun si el ejercito esta Honoured o Dishonoured." },
    ],
  },
  chaosKnights: {
    name: "Harbingers of Dread",
    effect: "Durante la batalla activas habilidades de Dread para tus Chaos Knights. Esas habilidades aplican presion de Battle-shock y efectos de terror a unidades enemigas dentro de sus rangos indicados.",
  },
  drukhari: {
    name: "Power from Pain",
    timing: "Durante la batalla, al generar y gastar Pain tokens.",
    effect: "Las Pain abilities de unidades Drukhari solo funcionan mientras la unidad esta Empowered.",
    details: [
      { label: "Ganar tokens", text: "Ganas 1 Pain token al inicio de tu fase de mando." },
      { label: "Destruir unidades", text: "Ganas 1 Pain token cada vez que una unidad enemiga es destruida." },
      { label: "Empower", text: "Gastas Pain tokens para Empower unidades y activar sus Pain abilities." },
    ],
  },
  genestealerCults: {
    name: "Cult Ambush",
    timing: "Al inicio de la batalla y cada vez que una unidad con esta habilidad es destruida.",
    effect: "Empiezas con Resurgence points segun el tamano de batalla y puedes gastarlos para devolver unidades destruidas.",
    details: [
      { label: "Incursion", text: "6 Resurgence points." },
      { label: "Strike Force", text: "10 Resurgence points." },
      { label: "Onslaught", text: "14 Resurgence points." },
      { label: "Coste", text: "Cuando una unidad con esta habilidad es destruida, el coste depende de su Starting Strength." },
    ],
  },
  worldEaters: {
    name: "Blood Tithe",
    timing: "Cuando destruyes unidades enemigas y al inicio de la fase de mando.",
    effect: "Cada vez que una unidad Blood Legions o World Eaters destruye una unidad enemiga, tira 1D6; con 3+ ganas 1 Blood Tithe point.",
    details: [
      { label: "Gasto", text: "Al inicio de la fase de mando puedes gastar Blood Tithe points para activar habilidades de la tabla." },
      { label: "Duracion", text: "Las habilidades compradas con Blood Tithe points duran hasta el final de la batalla." },
    ],
  },
  deathGuard: {
    name: "Nurgle's Gift (Aura)",
    timing: "Mientras una unidad enemiga esta dentro de Contagion Range de una o mas unidades Death Guard.",
    effect: "La unidad enemiga queda Afflicted.",
    details: [
      { label: "Ronda 1", text: "Contagion Range: 3 pulgadas." },
      { label: "Ronda 2", text: "Contagion Range: 6 pulgadas." },
      { label: "Ronda 3+", text: "Contagion Range: 9 pulgadas." },
      { label: "Afflicted", text: "Los modelos de la unidad tienen -1 Toughness y sufren el efecto de la Plague elegida durante Declare Battle Formations." },
    ],
  },
  thousandSons: {
    name: "Cabal of Sorcerers",
    effect: "Al inicio de tu fase de disparo, modelos Thousand Sons con esta habilidad pueden intentar Rituals. Eliges un modelo que no haya intentado ritual este turno, eliges un ritual no intentado este turno y resuelves una prueba psiquica.",
  },
  leaguesOfVotann: {
    name: "Methodical Annihilation",
    effect: "Cuando un modelo Leagues of Votann ataca al objetivo elegible mas cercano o a una unidad en Engagement Range de su unidad, repite tiradas para herir de 1. Algunas unidades, como Kahl o Einhyr Hearthguard, mejoran tambien el AP de esos ataques.",
  },
  chaosDaemons: {
    name: "Shadow of Chaos",
    effect: "Zonas de la mesa pueden estar dentro de tu Shadow of Chaos segun control de objetivos y reglas del ejercito. Dentro de esa sombra se activan efectos demoniacos sobre Battle-shock, supervivencia o retorno de unidades segun corresponda.",
  },
  imperialAgents: {
    name: "Assigned Agents",
    effect: "Si tu faccion no es Agents of the Imperium pero todo tu ejercito tiene Imperium, puedes incluir unidades Agents of the Imperium. El limite depende del tamano de batalla: Incursion 1 Retinue, 1 Character y 1 Requisitioned; Strike Force 2 Retinue, 2 Character y 1 Requisitioned; Onslaught permite mas cupos.",
  },
};

async function init() {
  state.rulesEdition = loadRulesEdition();
  state.dataPackSettings = loadDataPackSettings();
  try {
    await loadGameData();
  } catch (error) {
    document.body.innerHTML = "<main class='load-error'>No se pudo cargar la base de datos offline. Abre la app instalada o desde una direccion web segura para completar la primera carga.</main>";
    return;
  }

  state.faction = factions[0];
  state.enemyFaction = factions[1] || factions[0];
  state.detachment = state.faction.detachments[0];
  state.enemyDetachment = state.enemyFaction.detachments[0];
  state.savedLists = loadSavedLists();
  state.matchHistory = loadMatchHistory();
  state.userProfiles = loadUserProfiles();
  state.activeUserProfileId = loadActiveUserProfileId();
  state.betaTesterMode = loadBetaTesterMode();
  state.betaFeedbackReports = loadBetaFeedbackReports();
  state.betaFeedbackSettings = loadBetaFeedbackSettings();

  populateFactionSelects();
  populateUserProfileFactionSelect();
  populateMissionControls();
  bindEvents();
  syncEditionControls();
  renderDetachments("player");
  renderDetachments("enemy");
  render();
  showLibrary();
  if (state.dataPackSettings.autoCheck) {
    setTimeout(() => checkDataPackUpdate({ silent: true }), 800);
  }
}

async function loadGameData() {
  const response = await fetchEditionData("factions.json");
  const data = await response.json();
  factions = data.factions || [];
  enhancements = data.enhancements || {};
  try {
    const detachmentResponse = await fetchEditionData("detachment-rules.json");
    detachmentRules = (await detachmentResponse.json()).rules || {};
  } catch {
    detachmentRules = {};
  }
  try {
    const stratagemResponse = await fetchEditionData("detachment-stratagems.json");
    detachmentStratagems = (await stratagemResponse.json()).stratagems || {};
  } catch {
    detachmentStratagems = {};
  }
  try {
    const unitDetailsResponse = await fetchEditionData("unit-details.json");
    const unitDetailData = await unitDetailsResponse.json();
    unitDetails = unitDetailData.units || {};
    unitEnhancements = unitDetailData.enhancements || {};
    unitRuleReference = { ...coreRuleReferences, ...(unitDetailData.rules || {}) };
  } catch {
    unitDetails = {};
    unitEnhancements = {};
    unitRuleReference = { ...coreRuleReferences };
  }
}

async function fetchEditionData(fileName) {
  const cached = await readDataPackResponse(state.rulesEdition, fileName);
  if (cached) return cached;
  const editionPath = `data/${state.rulesEdition}/${fileName}?v=${dataVersion}`;
  if (state.rulesEdition !== "10e") {
    try {
      const editionResponse = await fetch(editionPath);
      if (editionResponse.ok) return editionResponse;
    } catch {
      // Fall back to compatible baseline data below.
    }
  }
  const response = await fetch(`data/${fileName}?v=${dataVersion}`);
  if (!response.ok) throw new Error(`No se pudo cargar ${fileName}`);
  return response;
}

function populateFactionSelects() {
  ["#faction", "#enemyFaction"].forEach((selector) => {
    const select = $(selector);
    select.replaceChildren();
    factions.forEach((faction) => select.append(new Option(faction.name, faction.id)));
  });
  $("#enemyFaction").value = state.enemyFaction.id;
}

function populateUserProfileFactionSelect() {
  const select = $("#userProfileFaction");
  if (!select) return;
  select.replaceChildren();
  factions.forEach((faction) => select.append(new Option(faction.name, faction.id)));
}

function populateMissionControls() {
  const preset = $("#missionPreset");
  if (!preset) return;
  preset.replaceChildren();
  chapterApprovedMissionPool.forEach((mission) => {
    preset.append(new Option(`${mission.letter}: ${mission.missionName} - ${mission.deploymentName}`, mission.letter));
  });
}

function applyMissionPreset(letter) {
  const preset = chapterApprovedMissionPool.find((mission) => mission.letter === letter);
  if (!preset) return;
  $("#mission").value = preset.mission;
  $("#deployment").value = preset.deployment;
  $("#layout").value = `ca${preset.layouts[0]}`;
}

function inferMissionPreset(mission, deployment, layout) {
  const layoutNumber = Number(String(layout || "").replace(/^ca/, ""));
  const preset = chapterApprovedMissionPool.find((item) => (
    item.mission === mission
    && item.deployment === deployment
    && (!layoutNumber || item.layouts.includes(layoutNumber))
  ));
  return preset?.letter || "A";
}

function selectedMissionPreset() {
  return chapterApprovedMissionPool.find((mission) => mission.letter === $("#missionPreset")?.value) || null;
}

function loadSavedLists() {
  try {
    const parsed = JSON.parse(localStorage.getItem(savedListsKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
  } catch {
    return [];
  }
}

function loadMatchHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(matchHistoryKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
  } catch {
    return [];
  }
}

function loadUserProfiles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(userProfilesKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
  } catch {
    return [];
  }
}

function loadActiveUserProfileId() {
  try {
    return localStorage.getItem(activeUserProfileKey) || "";
  } catch {
    return "";
  }
}

function loadBetaTesterMode() {
  try {
    return localStorage.getItem(betaTesterModeKey) === "true";
  } catch {
    return false;
  }
}

function persistBetaTesterMode() {
  try {
    localStorage.setItem(betaTesterModeKey, String(Boolean(state.betaTesterMode)));
  } catch {
    // Non-critical: mode still works for the current session.
  }
}

function loadBetaFeedbackReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(betaFeedbackKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
  } catch {
    return [];
  }
}

function persistBetaFeedbackReports() {
  try {
    localStorage.setItem(betaFeedbackKey, JSON.stringify(state.betaFeedbackReports.slice(0, 80)));
  } catch {
    setBetaFeedbackStatus("No se pudo guardar localmente, pero puedes copiar o descargar el reporte.");
  }
}

function loadBetaFeedbackSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(betaFeedbackSettingsKey) || "{}");
    return {
      sendMethod: parsed.sendMethod || "googleForm",
      googleFormUrl: parsed.googleFormUrl || defaultBetaFeedbackGoogleFormUrl,
      email: parsed.email || "",
      endpoint: parsed.endpoint || "",
    };
  } catch {
    return { sendMethod: "googleForm", googleFormUrl: defaultBetaFeedbackGoogleFormUrl, email: "", endpoint: "" };
  }
}

function persistBetaFeedbackSettings() {
  try {
    localStorage.setItem(betaFeedbackSettingsKey, JSON.stringify(state.betaFeedbackSettings));
  } catch {
    // Feedback can still be copied/downloaded.
  }
}

function loadDataPackSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(dataPackSettingsKey) || "{}");
    return {
      manifestUrl: parsed.manifestUrl || "",
      channel: parsed.channel || "11e-beta",
      autoCheck: Boolean(parsed.autoCheck),
      activePacks: parsed.activePacks && typeof parsed.activePacks === "object" ? parsed.activePacks : {},
      lastCheckedAt: parsed.lastCheckedAt || "",
    };
  } catch {
    return { manifestUrl: "", channel: "11e-beta", autoCheck: false, activePacks: {}, lastCheckedAt: "" };
  }
}

function persistDataPackSettings() {
  try {
    localStorage.setItem(dataPackSettingsKey, JSON.stringify(state.dataPackSettings));
  } catch {
    state.dataPackStatus = "No se pudo guardar la configuracion de actualizaciones en este dispositivo.";
  }
}

function dataPackKey(edition, fileName) {
  return `${edition}/${fileName}`;
}

function openDataPackDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB no esta disponible en este dispositivo."));
      return;
    }
    const request = indexedDB.open(dataPackDbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(dataPackDbStore, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir IndexedDB."));
  });
}

async function dataPackDbOperation(mode, action) {
  const db = await openDataPackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(dataPackDbStore, mode);
    const store = tx.objectStore(dataPackDbStore);
    const result = action(store);
    tx.oncomplete = () => {
      db.close();
      resolve(result?.result ?? result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("No se pudo acceder al data pack."));
    };
  });
}

async function readDataPackRecord(edition, fileName) {
  const active = state.dataPackSettings?.activePacks?.[edition];
  if (!active) return null;
  try {
    return await dataPackDbOperation("readonly", (store) => store.get(dataPackKey(edition, fileName)));
  } catch {
    return null;
  }
}

async function readDataPackResponse(edition, fileName) {
  const record = await readDataPackRecord(edition, fileName);
  if (!record?.body) return null;
  return new Response(record.body, {
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "X-ForgeList-Data-Pack": record.version || "installed",
    },
  });
}

async function writeDataPackRecord(edition, fileName, body, metadata) {
  const record = {
    id: dataPackKey(edition, fileName),
    edition,
    fileName,
    body,
    version: metadata.version,
    channel: metadata.channel,
    sourceUrl: metadata.sourceUrl || "",
    installedAt: metadata.installedAt,
  };
  await dataPackDbOperation("readwrite", (store) => store.put(record));
}

async function deleteDataPackRecords(edition) {
  await dataPackDbOperation("readwrite", (store) => {
    dataPackFiles.forEach((fileName) => store.delete(dataPackKey(edition, fileName)));
  });
}

function persistUserProfiles() {
  try {
    localStorage.setItem(userProfilesKey, JSON.stringify(state.userProfiles));
    localStorage.setItem(activeUserProfileKey, state.activeUserProfileId || "");
  } catch {
    setUserProfileStatus("No se pudo guardar el perfil en este navegador.");
  }
}

function activeUserProfile() {
  return state.userProfiles.find((profile) => profile.id === state.activeUserProfileId) || null;
}

function defaultUserProfileValues() {
  return {
    name: "Mi perfil",
    factionId: state.faction?.id || factions[0]?.id || "",
    playstyle: "midrange",
    experience: "mid",
    risk: "5",
    goal: "competitive",
    meta: "balanced",
  };
}

function profileFromControls(existing = {}) {
  const now = new Date().toISOString();
  return {
    id: existing.id || makeProfileId(),
    createdAt: existing.createdAt || now,
    updatedAt: now,
    name: $("#userProfileName").value.trim() || `Perfil ${state.userProfiles.length + 1}`,
    factionId: $("#userProfileFaction").value || factions[0]?.id || "",
    playstyle: $("#userProfilePlaystyle").value || "midrange",
    experience: $("#userProfileExperience").value || "mid",
    risk: $("#userProfileRisk").value || "5",
    goal: $("#userProfileGoal").value || "competitive",
    meta: $("#userProfileMeta").value || "balanced",
  };
}

function makeProfileId() {
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadRulesEdition() {
  try {
    const saved = localStorage.getItem(rulesEditionKey);
    return editionProfiles[saved] ? saved : "10e";
  } catch {
    return "10e";
  }
}

function setRulesEdition(edition, options = {}) {
  if (!editionProfiles[edition]) return;
  state.rulesEdition = edition;
  try {
    localStorage.setItem(rulesEditionKey, edition);
  } catch {
    // Non-critical: edition still works for the current session.
  }
  syncEditionControls();
  if (!options.silent) setSaveStatus("Cambios sin guardar");
  reloadDataFromActivePack();
}

function currentEditionProfile() {
  return editionProfiles[state.rulesEdition] || editionProfiles["10e"];
}

function syncEditionControls() {
  ["#rulesEdition", "#libraryEdition"].forEach((selector) => {
    const select = document.querySelector(selector);
    if (select) select.value = state.rulesEdition;
  });
  const summary = $("#editionSummary");
  if (summary) summary.textContent = currentEditionProfile().summary;
}

function renderEditionAnalysisControls() {
  document.querySelectorAll(".edition-11-field").forEach((element) => {
    element.classList.toggle("hidden", state.rulesEdition !== "11e");
  });
}

function persistSavedLists() {
  try {
    localStorage.setItem(savedListsKey, JSON.stringify(state.savedLists));
  } catch {
    setSaveStatus("No se pudo guardar en este navegador");
  }
}

function persistMatchHistory() {
  try {
    localStorage.setItem(matchHistoryKey, JSON.stringify(state.matchHistory));
  } catch {
    setMatchReportStatus("No se pudo guardar el historial en este navegador.");
  }
}

function renderLibrary() {
  renderUserProfileControls();
  const container = $("#savedLists");
  container.replaceChildren();
  state.savedLists = loadSavedLists().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  if (!state.savedLists.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty";
    empty.innerHTML = "<strong>Aun no hay listas guardadas</strong><p>Crea una nueva lista o entra al editor, importa una lista y guardala con nombre.</p>";
    container.append(empty);
    return;
  }

  state.savedLists.forEach((list) => {
    const card = document.createElement("article");
    card.className = "saved-list-card";
    const playerPoints = totalPoints(list.roster || []);
    const enemyPoints = totalPoints(list.enemyRoster || []);
    const factionName = findFaction(list.factionId)?.name || "Faccion sin definir";
    const detachmentName = findFaction(list.factionId)?.detachments.find((detachment) => detachment.id === list.detachmentId)?.name || "Detachment sin definir";
    card.innerHTML = `
      <div>
        <p class="eyebrow">${factionName}</p>
        <h3>${escapeHtml(list.name || defaultListName)}</h3>
        <p>${escapeHtml(detachmentName)} - ${playerPoints} / ${list.gameSize || 2000} pts</p>
        <p class="mini">${escapeHtml(editionProfiles[list.rulesEdition || "10e"]?.label || "10ma edicion")}</p>
        <p class="mini">Rival: ${enemyPoints} pts - Actualizada ${formatSavedDate(list.updatedAt)}</p>
      </div>
      <div class="saved-list-actions">
        <button type="button" data-list-action="open" data-list-id="${list.id}">Abrir</button>
        <button class="ghost" type="button" data-list-action="duplicate" data-list-id="${list.id}">Duplicar</button>
        <button class="ghost danger" type="button" data-list-action="delete" data-list-id="${list.id}">Borrar</button>
      </div>
    `;
    card.querySelector("[data-list-action='open']").addEventListener("click", () => openSavedList(list.id));
    card.querySelector("[data-list-action='duplicate']").addEventListener("click", () => duplicateSavedList(list.id));
    card.querySelector("[data-list-action='delete']").addEventListener("click", () => deleteSavedList(list.id));
    container.append(card);
  });
}

function renderUserProfileControls() {
  const select = $("#userProfileSelect");
  if (!select) return;
  const previous = state.activeUserProfileId || "";
  select.replaceChildren();
  select.append(new Option("Sin perfil activo", ""));
  state.userProfiles
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .forEach((profile) => select.append(new Option(profile.name || "Perfil sin nombre", profile.id)));
  if (previous && state.userProfiles.some((profile) => profile.id === previous)) select.value = previous;
  else {
    state.activeUserProfileId = "";
    select.value = "";
  }
  fillUserProfileForm(activeUserProfile() || defaultUserProfileValues());
  setUserProfileStatus(activeUserProfile() ? `Perfil activo: ${activeUserProfile().name}` : "Sin perfil activo. Puedes crear uno para usarlo como base de nuevas listas.");
}

function fillUserProfileForm(profile) {
  $("#userProfileName").value = profile.name || "";
  $("#userProfileFaction").value = factions.some((faction) => faction.id === profile.factionId) ? profile.factionId : factions[0]?.id || "";
  $("#userProfilePlaystyle").value = profile.playstyle || "midrange";
  $("#userProfileExperience").value = profile.experience || "mid";
  $("#userProfileRisk").value = profile.risk || "5";
  $("#userProfileGoal").value = profile.goal || "competitive";
  $("#userProfileMeta").value = profile.meta || "balanced";
}

function setUserProfileStatus(message) {
  const status = $("#userProfileStatus");
  if (status) status.textContent = message || "";
}

function saveUserProfileFromControls() {
  const existing = activeUserProfile();
  const profile = profileFromControls(existing || {});
  const index = state.userProfiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) state.userProfiles[index] = profile;
  else state.userProfiles.push(profile);
  state.activeUserProfileId = profile.id;
  persistUserProfiles();
  renderUserProfileControls();
  setUserProfileStatus(`Perfil guardado: ${profile.name}`);
}

function createUserProfileFromControls() {
  const profile = profileFromControls({});
  state.userProfiles.push(profile);
  state.activeUserProfileId = profile.id;
  persistUserProfiles();
  renderUserProfileControls();
  setUserProfileStatus(`Perfil creado: ${profile.name}. Puedes seguir la prueba guiada o saltarla.`);
  startGuidedTour({ fromProfile: true });
}

function deleteActiveUserProfile() {
  const profile = activeUserProfile();
  if (!profile) {
    setUserProfileStatus("No hay perfil activo para borrar.");
    return;
  }
  if (!confirm(`Borrar el perfil "${profile.name}"? Tus listas y memoria no se borran.`)) return;
  state.userProfiles = state.userProfiles.filter((item) => item.id !== profile.id);
  state.activeUserProfileId = "";
  persistUserProfiles();
  renderUserProfileControls();
}

function applyActiveUserProfileToCurrentList(options = {}) {
  const profile = activeUserProfile();
  if (!profile) {
    setSaveStatus("No hay perfil activo para aplicar");
    return;
  }
  state.profile = profile.goal || "competitive";
  $("#playstyle").value = profile.playstyle || "midrange";
  $("#risk").value = profile.risk || "5";
  $("#experience").value = profile.experience || "mid";
  $("#meta").value = profile.meta || "balanced";
  const preferredFaction = findFaction(profile.factionId);
  if (preferredFaction && (!state.roster.length || options.forceFaction)) {
    state.faction = preferredFaction;
    state.detachment = state.faction.detachments[0];
    state.detachmentLoadouts.player = [state.detachment?.id].filter(Boolean);
    state.catalogSections.player.clear();
    $("#faction").value = state.faction.id;
    renderDetachments("player");
    $("#detachment").value = state.detachment.id;
  }
  setProfileButtons();
  setSaveStatus(`Perfil aplicado: ${profile.name}`);
  if (options.renderAfter) render();
}

function applyUserProfileDefaultsToDocument(document) {
  const profile = activeUserProfile();
  if (!profile) return document;
  const faction = findFaction(profile.factionId) || findFaction(document.factionId) || factions[0];
  return {
    ...document,
    profile: profile.goal || document.profile,
    playstyle: profile.playstyle || document.playstyle,
    risk: profile.risk || document.risk,
    experience: profile.experience || document.experience,
    meta: profile.meta || document.meta,
    factionId: faction?.id || document.factionId,
    detachmentId: faction?.detachments?.[0]?.id || document.detachmentId,
    detachmentLoadoutIds: faction?.detachments?.[0]?.id ? [faction.detachments[0].id] : document.detachmentLoadoutIds,
    userProfileId: profile.id,
  };
}

const guidedTourSteps = [
  {
    title: "Biblioteca y perfiles",
    body: "Aqui eliges tu perfil, creas listas y recuperas partidas guardadas. El perfil sirve como base para nuevas listas, autopick y analisis.",
    action: () => showLibrary(),
  },
  {
    title: "Mi army",
    body: "En esta pestaña eliges faccion, detachment, unidades, equipamiento, warlord y lideres. El boton Completar lista usa tu perfil para proponer unidades coherentes.",
    action: () => {
      ensureGuidedTourEditor();
      activateWorkspaceTab("player");
    },
  },
  {
    title: "Army rival",
    body: "Aqui puedes importar o construir la lista enemiga. La app usa esa lista para comparar matchup real, no solo la fuerza interna de tu army.",
    action: () => {
      ensureGuidedTourEditor();
      activateWorkspaceTab("enemy");
    },
  },
  {
    title: "Analisis",
    body: "Esta seccion cruza lista propia, rival, mision, deployment, layout, memoria y edicion. En 11va tambien entran Force Dispositions y terreno.",
    action: () => {
      ensureGuidedTourEditor();
      activateWorkspaceTab("analysis");
    },
  },
  {
    title: "Memoria del jugador",
    body: "Aqui guardas partidas, imagenes de Tabletop Battles, listas usadas, secundarias y resultados. Esa memoria ajusta probabilidades y recomendaciones futuras.",
    action: () => {
      ensureGuidedTourEditor();
      activateWorkspaceTab("memory");
    },
  },
  {
    title: "Verificador de datos",
    body: "Esta herramienta revisa errores de puntos, categorias, datasheets incompletos y scores sospechosos. Es la zona para encontrar problemas antes de que afecten recomendaciones.",
    action: () => {
      ensureGuidedTourEditor();
      activateWorkspaceTab("data");
    },
  },
  {
    title: "Listo para probar",
    body: "Puedes empezar importando una lista propia, cargar un rival y revisar Analisis. Si algo se ve raro, Datos te ayuda a ubicar si el problema viene de la base.",
    action: () => {},
  },
];

function startGuidedTour() {
  state.guidedTour.open = true;
  state.guidedTour.index = 0;
  renderGuidedTour();
}

function closeGuidedTour() {
  state.guidedTour.open = false;
  renderGuidedTour();
}

function nextGuidedTourStep() {
  if (!state.guidedTour.open) return;
  if (state.guidedTour.index >= guidedTourSteps.length - 1) {
    closeGuidedTour();
    return;
  }
  state.guidedTour.index += 1;
  renderGuidedTour();
}

function renderGuidedTour() {
  const overlay = $("#guidedTourOverlay");
  if (!overlay) return;
  overlay.classList.toggle("hidden", !state.guidedTour.open);
  if (!state.guidedTour.open) return;
  const index = Math.max(0, Math.min(guidedTourSteps.length - 1, state.guidedTour.index));
  const step = guidedTourSteps[index];
  step.action?.();
  $("#guidedTourStep").textContent = `Paso ${index + 1} de ${guidedTourSteps.length}`;
  $("#guidedTourTitle").textContent = step.title;
  $("#guidedTourBody").textContent = step.body;
  $("#nextGuidedTour").textContent = index >= guidedTourSteps.length - 1 ? "Terminar" : "Siguiente";
}

function ensureGuidedTourEditor() {
  if (!$("#editorShell").classList.contains("hidden")) return;
  const document = createBlankListDocument("Prueba guiada");
  applyListDocument(document);
  showEditor();
  setSaveStatus("Prueba guiada sin guardar");
}

function renderBetaTesterUi() {
  const toggle = $("#betaTesterMode");
  if (toggle) toggle.checked = Boolean(state.betaTesterMode);
  syncBetaFeedbackSettingsControls();
  const button = $("#openBetaFeedback");
  if (button) button.classList.toggle("hidden", !state.betaTesterMode);
  const overlay = $("#betaFeedbackOverlay");
  if (overlay) overlay.classList.toggle("hidden", !state.betaFeedbackOpen);
  if (state.betaFeedbackOpen) renderBetaFeedbackPreview();
}

function syncBetaFeedbackSettingsControls() {
  const settings = state.betaFeedbackSettings || {};
  if ($("#betaFeedbackSendMethod")) $("#betaFeedbackSendMethod").value = settings.sendMethod || "googleForm";
  if ($("#betaFeedbackGoogleForm")) $("#betaFeedbackGoogleForm").value = settings.googleFormUrl || defaultBetaFeedbackGoogleFormUrl;
  if ($("#betaFeedbackEmail")) $("#betaFeedbackEmail").value = settings.email || "";
  if ($("#betaFeedbackEndpoint")) $("#betaFeedbackEndpoint").value = settings.endpoint || "";
}

function updateBetaFeedbackSettingsFromControls() {
  state.betaFeedbackSettings = {
    sendMethod: $("#betaFeedbackSendMethod")?.value || "googleForm",
    googleFormUrl: $("#betaFeedbackGoogleForm")?.value.trim() || defaultBetaFeedbackGoogleFormUrl,
    email: $("#betaFeedbackEmail")?.value.trim() || "",
    endpoint: $("#betaFeedbackEndpoint")?.value.trim() || "",
  };
  persistBetaFeedbackSettings();
}

function openBetaFeedback() {
  state.betaFeedbackOpen = true;
  clearBetaFeedbackStatus();
  renderBetaTesterUi();
}

function closeBetaFeedback() {
  state.betaFeedbackOpen = false;
  clearBetaFeedbackStatus();
  renderBetaTesterUi();
}

function clearBetaFeedbackStatus() {
  setBetaFeedbackStatus("");
}

function betaFeedbackFormValues() {
  return {
    type: $("#betaFeedbackType")?.value || "bug",
    severity: $("#betaFeedbackSeverity")?.value || "medium",
    title: $("#betaFeedbackTitle")?.value.trim() || "",
    body: $("#betaFeedbackBody")?.value.trim() || "",
    steps: $("#betaFeedbackSteps")?.value.trim() || "",
    expected: $("#betaFeedbackExpected")?.value.trim() || "",
    contact: $("#betaFeedbackContact")?.value.trim() || "",
    contextLevel: $("#betaFeedbackContext")?.value || "full",
  };
}

function buildBetaFeedbackReport() {
  const values = betaFeedbackFormValues();
  return {
    id: `feedback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    app: "ForgeList 40K",
    version: dataVersion,
    type: values.type,
    severity: values.severity,
    title: values.title || "(sin titulo)",
    body: values.body,
    steps: values.steps,
    expected: values.expected,
    contact: values.contact,
    context: collectBetaFeedbackContext(values.contextLevel),
  };
}

function renderBetaFeedbackPreview() {
  const preview = $("#betaFeedbackContextPreview");
  if (!preview) return;
  const values = betaFeedbackFormValues();
  preview.textContent = JSON.stringify(collectBetaFeedbackContext(values.contextLevel), null, 2);
}

function collectBetaFeedbackContext(level = "full") {
  const playerValidation = state.roster.length ? validateRoster("player") : { issues: [] };
  const enemyValidation = state.enemyRoster.length ? validateRoster("enemy") : { issues: [] };
  const activeTab = activeWorkspaceTabName();
  const context = {
    appVersion: dataVersion,
    rulesEdition: state.rulesEdition,
    activeTab,
    screen: $("#editorShell")?.classList.contains("hidden") ? "library" : "editor",
    url: location.href,
    userAgent: navigator.userAgent,
    profile: activeUserProfile() ? {
      name: activeUserProfile().name,
      faction: findFaction(activeUserProfile().factionId)?.name || "",
      playstyle: activeUserProfile().playstyle,
      experience: activeUserProfile().experience,
      risk: activeUserProfile().risk,
      goal: activeUserProfile().goal,
      meta: activeUserProfile().meta,
    } : null,
    currentList: {
      id: state.activeListId || "",
      name: $("#activeListName")?.value.trim() || defaultListName,
      gameSize: state.gameSize,
      playstyle: $("#playstyle")?.value || "",
      risk: $("#risk")?.value || "",
      experience: $("#experience")?.value || "",
      meta: $("#meta")?.value || "",
      faction: state.faction?.name || "",
      detachment: selectedDetachment("player")?.name || "",
      activeDetachments: activeDetachments("player").map((detachment) => detachment.name),
      points: totalPoints(state.roster),
      units: state.roster.length,
      validation: summarizeValidationIssues(playerValidation.issues),
    },
    enemyList: {
      faction: state.enemyFaction?.name || "",
      detachment: selectedDetachment("enemy")?.name || "",
      activeDetachments: activeDetachments("enemy").map((detachment) => detachment.name),
      points: totalPoints(state.enemyRoster),
      units: state.enemyRoster.length,
      inferredStyle: $("#enemyStyle")?.value || "",
      validation: summarizeValidationIssues(enemyValidation.issues),
    },
    analysis: {
      missionPreset: $("#missionPreset")?.value || "",
      mission: $("#mission")?.value || "",
      deployment: $("#deployment")?.value || "",
      layout: $("#layout")?.value || "",
      forceDisposition: $("#forceDisposition")?.value || "",
      enemyForceDisposition: $("#enemyForceDisposition")?.value || "",
      terrainProfile: $("#terrainProfile")?.value || "",
      winRate: $("#winRate")?.textContent || "",
      scores: {
        competitive: $("#competitiveScore")?.textContent || "",
        casual: $("#casualScore")?.textContent || "",
        narrative: $("#narrativeScore")?.textContent || "",
      },
    },
    memory: {
      savedLists: state.savedLists.length,
      matchReports: state.matchHistory.length,
      pendingMatchDraft: Boolean(state.pendingMatchDraft),
    },
  };
  if (level === "light") return context;
  return {
    ...context,
    playerUnits: summarizeFeedbackUnits(state.roster),
    enemyUnits: summarizeFeedbackUnits(state.enemyRoster),
    lastDataAudit: state.dataAudit,
  };
}

function summarizeValidationIssues(issues = []) {
  return {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    items: issues.slice(0, 12).map((issue) => ({
      severity: issue.severity,
      title: issue.title,
      message: issue.message,
      location: issue.location || "",
    })),
  };
}

function summarizeFeedbackUnits(units) {
  return units.slice(0, 80).map((unitData) => ({
    name: unitData.name,
    section: unitData.section,
    points: unitTotalPoints(unitData),
    source: rosterSourceLabel(unitData),
    config: {
      models: unitData.config?.modelCount || null,
      warlord: Boolean(unitData.config?.warlord),
      enhancement: unitData.config?.enhancement || "",
      leaderRef: unitData.config?.leaderRef || "",
      wargear: unitData.config?.wargear || [],
      importedWargearCounts: unitData.config?.importedWargearCounts || {},
    },
  }));
}

function activeWorkspaceTabName() {
  return document.querySelector("[data-workspace-tab].active")?.dataset.workspaceTab || "library";
}

function saveBetaFeedback() {
  const values = betaFeedbackFormValues();
  if (!values.body && !values.title) {
    setBetaFeedbackStatus("Escribe al menos un titulo o una descripcion para que el reporte sirva.");
    return null;
  }
  const report = buildBetaFeedbackReport();
  state.betaFeedbackReports = [report, ...state.betaFeedbackReports].slice(0, 80);
  persistBetaFeedbackReports();
  setBetaFeedbackStatus("Reporte guardado localmente. Copialo o descargalo para mandarlo al desarrollador.");
  return report;
}

async function sendBetaFeedbackReport() {
  updateBetaFeedbackSettingsFromControls();
  const settings = state.betaFeedbackSettings || {};
  const report = saveBetaFeedback();
  if (!report) return;
  if (settings.sendMethod === "googleForm") {
    sendBetaFeedbackToGoogleForm(report, settings.googleFormUrl);
    return;
  }
  if (settings.sendMethod === "endpoint") {
    await sendBetaFeedbackToEndpoint(report, settings.endpoint);
    return;
  }
  sendBetaFeedbackByEmail(report, settings.email);
}

function sendBetaFeedbackToGoogleForm(report, formUrl) {
  try {
    const url = buildBetaGoogleFormUrl(report, formUrl || defaultBetaFeedbackGoogleFormUrl);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) window.location.href = url;
    setBetaFeedbackStatus("Google Form abierto con el reporte prellenado. El tester solo debe revisar y pulsar Enviar.");
  } catch (error) {
    setBetaFeedbackStatus(`No pude preparar el Google Form (${error.message}). El reporte quedo guardado; puedes copiarlo o descargarlo.`);
  }
}

function buildBetaGoogleFormUrl(report, formUrl) {
  const url = new URL(formUrl || defaultBetaFeedbackGoogleFormUrl);
  const context = JSON.stringify(report.context, null, 2);
  const values = {
    "entry.375539772": betaFeedbackTypeLabel(report.type),
    "entry.816245796": betaFeedbackSeverityLabel(report.severity),
    "entry.741737959": report.title || "",
    "entry.1857125252": report.body || "",
    "entry.1282817054": report.steps || "",
    "entry.1812007493": report.expected || "",
    "entry.1855082438": report.contact || "",
    "entry.490747431": context,
  };
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, truncateFormValue(value, key === "entry.490747431" ? 12000 : 1800)));
  if (url.toString().length > 14500) {
    url.searchParams.set("entry.490747431", truncateFormValue(context, 7000));
  }
  return url.toString();
}

function betaFeedbackTypeLabel(type) {
  return {
    bug: "Error/bug",
    data: "Datos incorrectos",
    recommendation: "Recomendación rara",
    ux: "Interfaz confusa",
    idea: "Idea o mejora",
  }[type] || "Error/bug";
}

function betaFeedbackSeverityLabel(severity) {
  return {
    critical: "Crítica",
    medium: "Media",
    low: "Baja",
  }[severity] || "Media";
}

function truncateFormValue(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[Contexto recortado por limite de URL. Usa Descargar JSON si se necesita el reporte completo.]`;
}

async function sendBetaFeedbackToEndpoint(report, endpoint) {
  if (!endpoint || !/^https?:\/\//i.test(endpoint)) {
    setBetaFeedbackStatus("Agrega un endpoint/webhook valido que empiece con http o https.");
    return;
  }
  setBetaFeedbackStatus("Enviando reporte...");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setBetaFeedbackStatus("Reporte enviado correctamente y guardado localmente.");
  } catch (error) {
    setBetaFeedbackStatus(`No se pudo enviar directo (${error.message}). El reporte quedo guardado; puedes copiarlo o descargarlo.`);
  }
}

function sendBetaFeedbackByEmail(report, email) {
  if (!email || !/.+@.+\..+/.test(email)) {
    setBetaFeedbackStatus("Agrega un correo destino valido para preparar el envio.");
    return;
  }
  const subject = encodeURIComponent(`[ForgeList beta] ${report.severity.toUpperCase()} - ${report.title}`);
  const body = encodeURIComponent(JSON.stringify(report, null, 2));
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  if (mailto.length > 7800) {
    fallbackCopyText(JSON.stringify(report, null, 2));
    setBetaFeedbackStatus("El reporte es muy grande para correo automatico. Lo copie al portapapeles; pegalo en el correo o descarga el JSON.");
    return;
  }
  window.location.href = mailto;
  setBetaFeedbackStatus("Correo preparado con el reporte. Solo falta enviarlo desde el cliente de correo.");
}

async function copyBetaFeedbackReport() {
  const report = saveBetaFeedback();
  if (!report) return;
  const text = JSON.stringify(report, null, 2);
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else fallbackCopyText(text);
    setBetaFeedbackStatus("Reporte copiado al portapapeles. Ya puedes pegarlo en Discord, WhatsApp, correo o GitHub.");
  } catch {
    fallbackCopyText(text);
    setBetaFeedbackStatus("Reporte copiado usando metodo alterno.");
  }
}

function downloadBetaFeedbackReport() {
  const report = saveBetaFeedback();
  if (!report) return;
  const filename = `${safeFileName(report.title || "forgelist-feedback")}-${report.id}.json`;
  downloadTextFile(filename, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
  setBetaFeedbackStatus(`Descargado ${filename}.`);
}

function downloadBetaFeedbackArchive() {
  if (!state.betaFeedbackReports.length) {
    setBetaFeedbackStatus("Todavia no hay reportes guardados en este dispositivo.");
    return;
  }
  const filename = `forgelist-feedback-historial-${new Date().toISOString().slice(0, 10)}.json`;
  downloadTextFile(filename, JSON.stringify({
    app: "ForgeList 40K",
    version: dataVersion,
    exportedAt: new Date().toISOString(),
    reports: state.betaFeedbackReports,
  }, null, 2), "application/json;charset=utf-8");
  setBetaFeedbackStatus(`Historial descargado: ${filename}.`);
}

function setBetaFeedbackStatus(message) {
  const status = $("#betaFeedbackStatus");
  if (status) status.textContent = message || "";
}

function renderSavedMatchupControls() {
  const playerSelect = $("#matchupPlayerList");
  const enemySelect = $("#matchupEnemyList");
  if (!playerSelect || !enemySelect) return;
  const previousPlayer = playerSelect.value || state.activeListId || "";
  const previousEnemy = enemySelect.value || "";
  const lists = state.savedLists.filter((list) => list.roster?.length);
  [playerSelect, enemySelect].forEach((select) => {
    select.replaceChildren();
    if (!lists.length) {
      select.append(new Option("Guarda una lista primero", ""));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    lists.forEach((list) => {
      const factionName = findFaction(list.factionId)?.name || "Faccion";
      select.append(new Option(`${list.name || defaultListName} - ${factionName} - ${totalPoints(list.roster || [])} pts`, list.id));
    });
  });
  playerSelect.value = lists.some((list) => list.id === previousPlayer) ? previousPlayer : lists[0]?.id || "";
  const enemyFallback = lists.find((list) => list.id !== playerSelect.value)?.id || lists[0]?.id || "";
  enemySelect.value = lists.some((list) => list.id === previousEnemy) ? previousEnemy : enemyFallback;
  const status = $("#savedMatchupStatus");
  if (status && lists.length < 2) status.textContent = lists.length ? "Puedes probar espejo con una lista, pero guarda otra para comparar matchups reales." : "No hay listas con unidades guardadas todavia.";
}

function loadSavedMatchup() {
  state.savedLists = loadSavedLists();
  const playerDoc = state.savedLists.find((list) => list.id === $("#matchupPlayerList").value);
  const enemyDoc = state.savedLists.find((list) => list.id === $("#matchupEnemyList").value);
  const status = $("#savedMatchupStatus");
  if (!playerDoc || !enemyDoc) {
    if (status) status.textContent = "Selecciona dos listas guardadas con unidades.";
    return;
  }

  applyListDocument(playerDoc);
  applySavedListAsEnemy(enemyDoc);
  $("#matchupPlayerList").value = playerDoc.id;
  $("#matchupEnemyList").value = enemyDoc.id;
  $("#meta").value = inferLocalMeta(state.enemyRoster);
  $("#enemyStyle").value = inferRosterStyle(state.enemyRoster, state.enemyDetachment);
  activateWorkspaceTab("analysis");
  setSaveStatus("Matchup cargado. Guarda si quieres conservar esta lista rival.");
  if (status) status.textContent = `${playerDoc.name || defaultListName} vs ${enemyDoc.name || defaultListName} cargado.`;
  render();
}

function parseAnalysisEnemyList() {
  const textarea = $("#analysisEnemyPaste");
  const status = $("#savedMatchupStatus");
  const text = textarea.value.trim();
  if (!text) {
    if (status) status.textContent = "Pega la lista rival para cargarla en el analisis.";
    return;
  }
  const result = importRosterTextToSide("enemy", text);
  $("#enemyPaste").value = text;
  if (status) {
    const factionName = state.enemyFaction?.name || "Rival";
    const detachmentName = state.enemyDetachment?.name || "Detachment";
    status.textContent = `Lista rival cargada para analisis: ${factionName} - ${detachmentName} - ${result.units.length} unidades - ${totalPoints(state.enemyRoster)} pts. No se guardo en biblioteca.`;
  }
  activateWorkspaceTab("analysis");
  render();
}

function applySavedListAsEnemy(document) {
  state.enemyFaction = findFaction(document.factionId) || factions[1] || factions[0];
  state.enemyDetachment = state.enemyFaction.detachments.find((detachment) => detachment.id === document.detachmentId) || state.enemyFaction.detachments[0];
  state.enemyRoster = restoreSavedRoster(document.roster || []);
  state.detachmentRulesExpanded.enemy = false;
  state.catalogSections.enemy.clear();
  $("#enemyFaction").value = state.enemyFaction.id;
  renderDetachments("enemy");
  $("#enemyDetachment").value = state.enemyDetachment.id;
  $("#enemyPaste").value = "";
  $("#enemyImportStatus").textContent = "";
}

function showLibrary() {
  $("#editorShell").classList.add("hidden");
  $("#listLibrary").classList.remove("hidden");
  state.activeListId = null;
  renderLibrary();
}

function showEditor() {
  $("#listLibrary").classList.add("hidden");
  $("#editorShell").classList.remove("hidden");
}

function createListFromLibrary() {
  const name = $("#newListName").value.trim() || `Lista ${state.savedLists.length + 1}`;
  const document = createBlankListDocument(name);
  state.savedLists = [document, ...state.savedLists];
  persistSavedLists();
  $("#newListName").value = "";
  applyListDocument(document);
  showEditor();
}

function createBlankListDocument(name) {
  const now = new Date().toISOString();
  const faction = factions[0];
  const enemyFaction = factions[1] || factions[0];
  const document = {
    id: makeListId(),
    name: name || defaultListName,
    createdAt: now,
    updatedAt: now,
    profile: "competitive",
    rulesEdition: state.rulesEdition,
    gameSize: 2000,
    playstyle: "midrange",
    risk: "5",
    experience: "mid",
    factionId: faction?.id,
    detachmentId: faction?.detachments?.[0]?.id,
    detachmentLoadoutIds: faction?.detachments?.[0]?.id ? [faction.detachments[0].id] : [],
    roster: [],
    enemyFactionId: enemyFaction?.id,
    enemyDetachmentId: enemyFaction?.detachments?.[0]?.id,
    enemyDetachmentLoadoutIds: enemyFaction?.detachments?.[0]?.id ? [enemyFaction.detachments[0].id] : [],
    enemyRoster: [],
    meta: "balanced",
    enemyStyle: "midrange",
    missionPreset: "A",
    mission: "takeHold",
    deployment: "tippingPoint",
    layout: "ca1",
    forceDisposition: "takeHold",
    enemyForceDisposition: "takeHold",
    terrainProfile: "balancedAreas",
  };
  return applyUserProfileDefaultsToDocument(document);
}

function openSavedList(id) {
  const document = state.savedLists.find((list) => list.id === id);
  if (!document) return;
  applyListDocument(document);
  showEditor();
}

function duplicateSavedList(id) {
  const original = state.savedLists.find((list) => list.id === id);
  if (!original) return;
  const now = new Date().toISOString();
  const copy = {
    ...cloneData(original),
    id: makeListId(),
    name: `${original.name || defaultListName} copia`,
    createdAt: now,
    updatedAt: now,
  };
  state.savedLists = [copy, ...state.savedLists];
  persistSavedLists();
  renderLibrary();
}

function deleteSavedList(id) {
  const list = state.savedLists.find((item) => item.id === id);
  if (!list || !confirm(`Borrar "${list.name || defaultListName}"?`)) return;
  state.savedLists = state.savedLists.filter((item) => item.id !== id);
  persistSavedLists();
  renderLibrary();
}

function applyListDocument(document) {
  const fallback = createBlankListDocument(document?.name || defaultListName);
  const list = { ...fallback, ...(document || {}) };
  state.activeListId = list.id;
  state.profile = list.profile || "competitive";
  state.rulesEdition = editionProfiles[list.rulesEdition] ? list.rulesEdition : state.rulesEdition || "10e";
  try {
    localStorage.setItem(rulesEditionKey, state.rulesEdition);
  } catch {
    // Session-only edition is still fine if storage is unavailable.
  }
  state.gameSize = Number(list.gameSize || 2000);
  state.faction = findFaction(list.factionId) || factions[0];
  state.detachment = state.faction.detachments.find((detachment) => detachment.id === list.detachmentId) || state.faction.detachments[0];
  state.enemyFaction = findFaction(list.enemyFactionId) || factions[1] || factions[0];
  state.enemyDetachment = state.enemyFaction.detachments.find((detachment) => detachment.id === list.enemyDetachmentId) || state.enemyFaction.detachments[0];
  state.detachmentLoadouts.player = Array.isArray(list.detachmentLoadoutIds) ? [...list.detachmentLoadoutIds] : [state.detachment?.id].filter(Boolean);
  state.detachmentLoadouts.enemy = Array.isArray(list.enemyDetachmentLoadoutIds) ? [...list.enemyDetachmentLoadoutIds] : [state.enemyDetachment?.id].filter(Boolean);
  state.roster = restoreSavedRoster(list.roster || []);
  state.enemyRoster = restoreSavedRoster(list.enemyRoster || []);
  state.factionRulesExpanded = false;
  state.detachmentRulesExpanded.player = false;
  state.detachmentRulesExpanded.enemy = false;
  state.stratagemView.open = false;
  state.unitDetailView.open = false;
  state.catalogSections.player.clear();
  state.catalogSections.enemy.clear();

  $("#activeListName").value = list.name || defaultListName;
  $("#editorTitle").textContent = list.name || defaultListName;
  syncEditionControls();
  $("#gameSize").value = String(state.gameSize);
  $("#playstyle").value = list.playstyle || "midrange";
  $("#risk").value = list.risk || "5";
  $("#experience").value = list.experience || "mid";
  $("#meta").value = list.meta || "balanced";
  $("#enemyStyle").value = list.enemyStyle || "midrange";
  const missionPreset = list.missionPreset && list.missionPreset !== "manual" ? list.missionPreset : inferMissionPreset(list.mission, list.deployment, list.layout);
  $("#missionPreset").value = missionPreset;
  applyMissionPreset(missionPreset);
  if (list.layout && /^(ca[1-8]|gw|dense|open|wtc|wtcDense|wtcOpen|ftc|ftcDense|ftcOpen|flg|flgDense|flgOpen)$/.test(list.layout)) $("#layout").value = list.layout;
  $("#forceDisposition").value = list.forceDisposition || inferForceDisposition("player");
  $("#enemyForceDisposition").value = list.enemyForceDisposition || inferForceDisposition("enemy");
  $("#terrainProfile").value = list.terrainProfile || "balancedAreas";
  $("#playerPaste").value = "";
  $("#enemyPaste").value = "";
  $("#playerImportStatus").textContent = "";
  $("#enemyImportStatus").textContent = "";
  setProfileButtons();
  $("#faction").value = state.faction.id;
  $("#enemyFaction").value = state.enemyFaction.id;
  renderDetachments("player");
  renderDetachments("enemy");
  $("#detachment").value = state.detachment.id;
  $("#enemyDetachment").value = state.enemyDetachment.id;
  activateWorkspaceTab("player");
  setSaveStatus(`Guardada ${formatSavedDate(list.updatedAt)}`);
  render();
}

function restoreSavedRoster(units) {
  return (units || []).map((unitData) => {
    const detail = unitDetailForAny(unitData);
    const config = unitData.config || {};
    return {
      ...unitData,
      tags: [...(unitData.tags || [])],
      styles: [...(unitData.styles || [])],
      basePoints: Number(unitData.basePoints || unitData.points || 0),
      instanceId: unitData.instanceId || makeUnitInstanceId(),
      imported: Boolean(unitData.imported),
      recommended: Boolean(unitData.recommended),
      config: {
        warlord: Boolean(config.warlord),
        enhancement: config.enhancement || "",
        enhancementPoints: Number(config.enhancementPoints || 0),
        wargear: [...(config.wargear || [])],
        wargearSelections: { ...(config.wargearSelections || {}) },
        importedWargearCounts: { ...(config.importedWargearCounts || {}) },
        modelCount: config.modelCount || compositionModelRange(detail).min,
        leaderRef: config.leaderRef || "",
      },
      recommendation: unitData.recommendation ? cloneData(unitData.recommendation) : null,
    };
  });
}

function saveActiveList(options = {}) {
  const snapshot = captureListDocument();
  const existingIndex = state.savedLists.findIndex((list) => list.id === snapshot.id);
  if (existingIndex >= 0) {
    state.savedLists[existingIndex] = snapshot;
  } else {
    state.savedLists.unshift(snapshot);
  }
  state.savedLists.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  state.activeListId = snapshot.id;
  persistSavedLists();
  renderSavedMatchupControls();
  renderMatchListSelectors();
  if (!options.silent) setSaveStatus(`Guardada ${formatSavedDate(snapshot.updatedAt)}`);
}

function captureListDocument() {
  const existing = state.savedLists.find((list) => list.id === state.activeListId);
  const now = new Date().toISOString();
  return {
    id: state.activeListId || makeListId(),
    name: $("#activeListName").value.trim() || defaultListName,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    userProfileId: activeUserProfile()?.id || existing?.userProfileId || "",
    profile: state.profile,
    rulesEdition: state.rulesEdition,
    gameSize: state.gameSize,
    playstyle: $("#playstyle").value,
    risk: $("#risk").value,
    experience: $("#experience").value,
    factionId: state.faction?.id,
    detachmentId: state.detachment?.id,
    detachmentLoadoutIds: activeDetachments("player").map((detachment) => detachment.id),
    roster: cloneData(state.roster),
    enemyFactionId: state.enemyFaction?.id,
    enemyDetachmentId: state.enemyDetachment?.id,
    enemyDetachmentLoadoutIds: activeDetachments("enemy").map((detachment) => detachment.id),
    enemyRoster: cloneData(state.enemyRoster),
    meta: $("#meta").value,
    enemyStyle: $("#enemyStyle").value,
    missionPreset: $("#missionPreset").value,
    mission: $("#mission").value,
    deployment: $("#deployment").value,
    layout: $("#layout").value,
    forceDisposition: $("#forceDisposition").value,
    enemyForceDisposition: $("#enemyForceDisposition").value,
    terrainProfile: $("#terrainProfile").value,
  };
}

function setProfileButtons() {
  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.classList.toggle("active", button.dataset.profile === state.profile);
  });
}

function setSaveStatus(text) {
  const status = $("#saveStatus");
  if (status) status.textContent = text || "";
}

function makeListId() {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatSavedDate(value) {
  if (!value) return "ahora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ahora";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function bindEvents() {
  $("#createList").addEventListener("click", createListFromLibrary);
  $("#refreshLists").addEventListener("click", renderLibrary);
  $("#libraryEdition").addEventListener("input", (event) => setRulesEdition(event.target.value, { silent: true }));
  $("#userProfileSelect").addEventListener("input", (event) => {
    state.activeUserProfileId = event.target.value;
    persistUserProfiles();
    renderUserProfileControls();
  });
  $("#saveUserProfile").addEventListener("click", saveUserProfileFromControls);
  $("#createUserProfile").addEventListener("click", createUserProfileFromControls);
  $("#deleteUserProfile").addEventListener("click", deleteActiveUserProfile);
  $("#startGuidedTour").addEventListener("click", () => startGuidedTour({ fromProfile: Boolean(activeUserProfile()) }));
  $("#betaTesterMode").addEventListener("change", (event) => {
    state.betaTesterMode = event.target.checked;
    persistBetaTesterMode();
    renderBetaTesterUi();
    setUserProfileStatus(state.betaTesterMode ? "Modo beta tester activo. Aparecera el boton para mandar comentarios." : "Modo beta tester desactivado.");
  });
  $("#openBetaFeedback").addEventListener("click", () => openBetaFeedback());
  $("#closeBetaFeedback").addEventListener("click", closeBetaFeedback);
  $("#sendBetaFeedback").addEventListener("click", sendBetaFeedbackReport);
  $("#saveBetaFeedback").addEventListener("click", saveBetaFeedback);
  $("#copyBetaFeedback").addEventListener("click", copyBetaFeedbackReport);
  $("#downloadBetaFeedback").addEventListener("click", downloadBetaFeedbackReport);
  $("#downloadBetaFeedbackArchive").addEventListener("click", downloadBetaFeedbackArchive);
  ["betaFeedbackType", "betaFeedbackSeverity", "betaFeedbackTitle", "betaFeedbackBody", "betaFeedbackSteps", "betaFeedbackExpected", "betaFeedbackContact", "betaFeedbackContext"].forEach((id) => {
    $(`#${id}`).addEventListener("input", renderBetaFeedbackPreview);
  });
  ["betaFeedbackSendMethod", "betaFeedbackGoogleForm", "betaFeedbackEmail", "betaFeedbackEndpoint"].forEach((id) => {
    $(`#${id}`).addEventListener("input", updateBetaFeedbackSettingsFromControls);
  });
  $("#skipGuidedTour").addEventListener("click", closeGuidedTour);
  $("#nextGuidedTour").addEventListener("click", nextGuidedTourStep);
  $("#rulesEdition").addEventListener("input", (event) => setRulesEdition(event.target.value));
  $("#saveList").addEventListener("click", () => saveActiveList());
  $("#applyUserProfile").addEventListener("click", () => applyActiveUserProfileToCurrentList({ renderAfter: true }));
  $("#backToLibrary").addEventListener("click", () => {
    if (state.activeListId) saveActiveList({ silent: true });
    showLibrary();
  });
  $("#activeListName").addEventListener("input", () => {
    $("#editorTitle").textContent = $("#activeListName").value.trim() || defaultListName;
    setSaveStatus("Cambios sin guardar");
  });

  document.querySelectorAll("[data-workspace-tab]").forEach((button) => {
    button.addEventListener("click", () => activateWorkspaceTab(button.dataset.workspaceTab));
  });
  $("#refreshDataAudit").addEventListener("click", renderDataVerifier);
  $("#checkDataPackUpdate").addEventListener("click", () => checkDataPackUpdate({ silent: false }));
  $("#reloadDataPack").addEventListener("click", reloadDataFromActivePack);
  $("#clearDataPack").addEventListener("click", clearActiveDataPack);
  ["dataPackChannel", "dataPackManifestUrl", "dataPackAutoCheck"].forEach((id) => {
    $(`#${id}`).addEventListener("input", updateDataPackSettingsFromControls);
  });
  $("#dataAuditFaction").addEventListener("input", (event) => {
    state.dataAudit.factionId = event.target.value;
    renderDataVerifier();
  });
  $("#dataAuditSeverity").addEventListener("input", (event) => {
    state.dataAudit.severity = event.target.value;
    renderDataVerifier();
  });
  $("#dataAuditSearch").addEventListener("input", (event) => {
    state.dataAudit.query = event.target.value;
    renderDataVerifier();
  });

  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile = button.dataset.profile;
      document.querySelectorAll("[data-profile]").forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });

  $("#faction").addEventListener("change", (event) => {
    state.faction = findFaction(event.target.value);
    state.detachment = state.faction.detachments[0];
    state.detachmentLoadouts.player = [state.detachment?.id].filter(Boolean);
    state.roster = [];
    state.factionRulesExpanded = false;
    state.detachmentRulesExpanded.player = false;
    state.catalogSections.player.clear();
    renderDetachments("player");
    render();
  });

  $("#enemyFaction").addEventListener("change", (event) => {
    state.enemyFaction = findFaction(event.target.value);
    state.enemyDetachment = state.enemyFaction.detachments[0];
    state.detachmentLoadouts.enemy = [state.enemyDetachment?.id].filter(Boolean);
    state.enemyRoster = [];
    state.detachmentRulesExpanded.enemy = false;
    state.catalogSections.enemy.clear();
    renderDetachments("enemy");
    render();
  });

  $("#detachment").addEventListener("change", (event) => {
    state.detachment = state.faction.detachments.find((detachment) => detachment.id === event.target.value);
    state.detachmentLoadouts.player = [state.detachment?.id, ...state.detachmentLoadouts.player.filter((id) => id !== state.detachment?.id)].filter(Boolean);
    state.detachmentRulesExpanded.player = false;
    render();
  });

  $("#enemyDetachment").addEventListener("change", (event) => {
    state.enemyDetachment = state.enemyFaction.detachments.find((detachment) => detachment.id === event.target.value);
    state.detachmentLoadouts.enemy = [state.enemyDetachment?.id, ...state.detachmentLoadouts.enemy.filter((id) => id !== state.enemyDetachment?.id)].filter(Boolean);
    state.detachmentRulesExpanded.enemy = false;
    render();
  });

  $("#missionPreset").addEventListener("input", () => {
    applyMissionPreset($("#missionPreset").value);
    render();
  });

  ["playstyle", "risk", "experience", "meta", "enemyStyle", "unitSearch", "enemyUnitSearch"].forEach((id) => {
    $(`#${id}`).addEventListener("input", render);
  });
  ["mission", "deployment", "layout"].forEach((id) => {
    $(`#${id}`).addEventListener("input", () => {
      $("#missionPreset").value = inferMissionPreset($("#mission").value, $("#deployment").value, $("#layout").value);
      render();
    });
  });
  ["forceDisposition", "enemyForceDisposition", "terrainProfile"].forEach((id) => {
    $(`#${id}`).addEventListener("input", render);
  });

  $("#gameSize").addEventListener("input", (event) => {
    state.gameSize = Number(event.target.value);
    render();
  });

  $("#autoPick").addEventListener("click", () => autoPick("player"));
  $("#enemyAutoPick").addEventListener("click", () => autoPick("enemy"));
  $("#openStratagems").addEventListener("click", () => openStratagems("player"));
  $("#openEnemyStratagems").addEventListener("click", () => openStratagems("enemy"));
  $("#closeStratagems").addEventListener("click", () => {
    state.stratagemView.open = false;
    renderStratagemButtons();
    renderStratagemSection();
  });
  $("#closeUnitDetail").addEventListener("click", () => {
    state.unitDetailView.open = false;
    renderUnitDetailPanel();
  });
  $("#clearList").addEventListener("click", () => clearRoster("player"));
  $("#clearEnemyList").addEventListener("click", () => clearRoster("enemy"));
  $("#parsePlayerList").addEventListener("click", () => parseList("player"));
  $("#parseEnemyList").addEventListener("click", parseEnemyList);
  $("#copyPlayerExport").addEventListener("click", () => copyExport("player"));
  $("#copyEnemyExport").addEventListener("click", () => copyExport("enemy"));
  $("#downloadPlayerExport").addEventListener("click", () => downloadExport("player"));
  $("#downloadEnemyExport").addEventListener("click", () => downloadExport("enemy"));
  $("#printPlayerCards").addEventListener("click", () => openPrintableCards("player"));
  $("#printEnemyCards").addEventListener("click", () => openPrintableCards("enemy"));
  $("#loadSavedMatchup").addEventListener("click", loadSavedMatchup);
  $("#parseAnalysisEnemyList").addEventListener("click", parseAnalysisEnemyList);
  $("#parseMatchReport").addEventListener("click", savePendingMatchDraft);
  $("#clearMatchHistory").addEventListener("click", clearMatchHistory);
  $("#parseMatchEnemyList").addEventListener("click", parseMatchEnemyListDraft);
  $("#matchPlayerListSelect").addEventListener("change", renderMatchDraftSummary);
  $("#matchEnemyListSelect").addEventListener("change", renderMatchDraftSummary);
  $("#matchImageFile").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) handleMatchImage(file);
    event.target.value = "";
  });
  $("#matchImageDrop").addEventListener("paste", handleMatchImagePaste);
  $("#matchImageDrop").addEventListener("dragover", (event) => {
    event.preventDefault();
    $("#matchImageDrop").classList.add("dragging");
  });
  $("#matchImageDrop").addEventListener("dragleave", () => $("#matchImageDrop").classList.remove("dragging"));
  $("#matchImageDrop").addEventListener("drop", handleMatchImageDrop);
  $("#simulate").addEventListener("click", renderSimulation);
}

function activateWorkspaceTab(tabName) {
  document.querySelectorAll("[data-workspace-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.workspaceTab === tabName);
  });

  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
  if (tabName === "analysis") renderChangeRecommendations();
  if (tabName === "data") {
    renderDataPackPanel();
    renderDataVerifier();
  }
}

function openStratagems(side) {
  state.stratagemView.open = true;
  state.stratagemView.side = side;
  renderStratagemButtons();
  renderStratagemSection();
  $("#stratagemSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDetachments(side) {
  const isEnemy = side === "enemy";
  const select = $(isEnemy ? "#enemyDetachment" : "#detachment");
  const faction = isEnemy ? state.enemyFaction : state.faction;
  select.replaceChildren();
  faction.detachments.forEach((detachment) => select.append(new Option(detachment.name, detachment.id)));
  syncDetachmentLoadout(side);
  renderDetachmentDpPanel(side);
}

function syncDetachmentLoadout(side) {
  const faction = side === "enemy" ? state.enemyFaction : state.faction;
  const primary = selectedDetachment(side);
  const existing = state.detachmentLoadouts[side] || [];
  const validIds = new Set((faction?.detachments || []).map((detachment) => detachment.id));
  const cleaned = existing.filter((id) => validIds.has(id));
  if (primary && !cleaned.includes(primary.id)) cleaned.unshift(primary.id);
  state.detachmentLoadouts[side] = [...new Set(cleaned)];
}

function activeDetachments(side) {
  const faction = side === "enemy" ? state.enemyFaction : state.faction;
  const primary = selectedDetachment(side);
  if (state.rulesEdition !== "11e") return primary ? [primary] : [];
  syncDetachmentLoadout(side);
  const selectedIds = state.detachmentLoadouts[side] || [];
  const detachments = selectedIds
    .map((id) => faction?.detachments?.find((detachment) => detachment.id === id))
    .filter(Boolean);
  return detachments.length ? detachments : primary ? [primary] : [];
}

function activeDetachmentStyles(side) {
  return [...new Set(activeDetachments(side).flatMap((detachment) => detachment.styles || []))];
}

function detachmentPointBudget() {
  return 3;
}

function detachmentPointCost(detachment) {
  if (!detachment) return 0;
  if (Number.isFinite(Number(detachment.dp))) return Number(detachment.dp);
  if (Number.isFinite(Number(detachment.detachmentPoints))) return Number(detachment.detachmentPoints);
  if (/(gladius|host of ascension|canoptek court|invasion fleet|green tide|renowned heroes)/i.test(detachment.name || "")) return 3;
  if ((detachment.scope || "").toLowerCase() === "unit" || (detachment.tags || []).includes?.("unit-upgrade")) return 1;
  return 2;
}

function detachmentPointTotal(side) {
  return activeDetachments(side).reduce((sum, detachment) => sum + detachmentPointCost(detachment), 0);
}

function canToggleDetachment(side, detachment) {
  if (!detachment) return false;
  const selected = activeDetachments(side);
  if (selected.some((item) => item.id === detachment.id)) return true;
  return detachmentPointTotal(side) + detachmentPointCost(detachment) <= detachmentPointBudget();
}

function toggleDetachmentLoadout(side, detachmentId) {
  if (state.rulesEdition !== "11e") return;
  const faction = side === "enemy" ? state.enemyFaction : state.faction;
  const detachment = faction?.detachments?.find((item) => item.id === detachmentId);
  if (!detachment) return;
  syncDetachmentLoadout(side);
  const selected = new Set(state.detachmentLoadouts[side] || []);
  const primary = selectedDetachment(side);
  if (selected.has(detachmentId)) {
    if (primary?.id === detachmentId) return;
    selected.delete(detachmentId);
  } else if (canToggleDetachment(side, detachment)) {
    selected.add(detachmentId);
  }
  state.detachmentLoadouts[side] = [...selected];
  render();
}

function renderDetachmentDpPanel(side) {
  const panel = $(side === "enemy" ? "#enemyDetachmentDpPanel" : "#detachmentDpPanel");
  if (!panel) return;
  panel.replaceChildren();
  panel.classList.toggle("hidden", state.rulesEdition !== "11e");
  if (state.rulesEdition !== "11e") return;
  syncDetachmentLoadout(side);
  const faction = side === "enemy" ? state.enemyFaction : state.faction;
  const primary = selectedDetachment(side);
  const selectedIds = new Set(state.detachmentLoadouts[side] || []);
  const total = detachmentPointTotal(side);
  const budget = detachmentPointBudget();
  const header = document.createElement("div");
  header.className = "detachment-dp-header";
  header.innerHTML = `
    <strong>Detachments 11va</strong>
    <span>${total}/${budget} DP</span>
    <p>${side === "enemy" ? "Selecciona los paquetes de detachment que usa la lista rival." : "Combina detachments usando Detachment Points. El primero es tu detachment base."}</p>
  `;
  const list = document.createElement("div");
  list.className = "detachment-dp-list";
  (faction?.detachments || []).forEach((detachment) => {
    const cost = detachmentPointCost(detachment);
    const checked = selectedIds.has(detachment.id);
    const disabled = !checked && total + cost > budget;
    const row = document.createElement("label");
    row.className = `detachment-dp-option ${checked ? "active" : ""} ${disabled ? "disabled" : ""}`;
    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span>
        <b>${escapeHtml(detachment.name)}</b>
        <small>${cost} DP${primary?.id === detachment.id ? " - base" : ""}</small>
      </span>
    `;
    row.querySelector("input").addEventListener("change", () => toggleDetachmentLoadout(side, detachment.id));
    list.append(row);
  });
  const warning = document.createElement("p");
  warning.className = "detachment-dp-note";
  warning.textContent = total > budget
    ? "Esta combinacion excede los DP disponibles."
    : "Coste compatible: codex actuales suelen contar como 2DP; detachments 1DP/3DP se respetaran cuando vengan en data/11e.";
  panel.append(header, list, warning);
}

function render() {
  syncEditionControls();
  renderBetaTesterUi();
  renderEditionAnalysisControls();
  renderFactionRules();
  renderDetachmentRules("player");
  renderDetachmentRules("enemy");
  renderDetachmentDpPanel("player");
  renderDetachmentDpPanel("enemy");
  renderStratagemButtons();
  renderStratagemSection();
  renderUnitDetailPanel();
  renderCatalog("player");
  renderCatalog("enemy");
  renderRoster("player");
  renderRoster("enemy");
  renderSavedMatchupControls();
  renderScores();
  renderTips();
  renderComparison();
  if (document.querySelector('[data-tab-panel="analysis"]')?.classList.contains("active")) renderChangeRecommendations();
  renderMissionPresetSummary();
  renderMissionRecommendations();
  renderMatchListSelectors();
  renderMatchDraftSummary();
  renderMatchHistory();
  if (document.querySelector('[data-tab-panel="data"]')?.classList.contains("active")) {
    renderDataPackPanel();
    renderDataVerifier();
  }
  renderSimulation();
}

function renderFactionRules() {
  const container = $("#factionRules");
  if (!container || !state.faction) return;
  const summary = factionRuleSummary(state.faction);
  container.replaceChildren();
  container.classList.toggle("compact", !state.factionRulesExpanded);

  const header = document.createElement("div");
  header.className = "rules-card-header";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `Regla de faccion: ${state.faction.name}`;
  const intro = document.createElement("p");
  intro.textContent = state.factionRulesExpanded ? "Referencia mecanica de la regla principal del ejercito seleccionado." : summary.name;
  heading.append(title, intro);

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "ghost rules-toggle";
  toggleButton.textContent = "...";
  toggleButton.title = state.factionRulesExpanded ? "Compactar regla" : "Leer regla completa";
  toggleButton.setAttribute("aria-label", state.factionRulesExpanded ? "Compactar regla de faccion" : "Leer regla completa de faccion");
  toggleButton.setAttribute("aria-expanded", String(state.factionRulesExpanded));
  toggleButton.addEventListener("click", () => {
    state.factionRulesExpanded = !state.factionRulesExpanded;
    renderFactionRules();
  });
  header.append(heading, toggleButton);

  const list = document.createElement("dl");
  appendRuleDetail(list, "Nombre", summary.name);
  if (state.factionRulesExpanded) {
    appendRuleDetail(list, "Cuando", summary.timing);
    appendRuleDetail(list, "Efecto", summary.effect);
    (summary.details || []).forEach((detail) => appendRuleDetail(list, detail.label, detail.text));
  }
  container.append(header, list);
}

function renderDetachmentRules(side) {
  const isEnemy = side === "enemy";
  const detachment = isEnemy ? state.enemyDetachment : state.detachment;
  const faction = isEnemy ? state.enemyFaction : state.faction;
  const container = $(isEnemy ? "#enemyDetachmentRules" : "#detachmentRules");
  if (!container || !detachment) return;
  const expanded = state.detachmentRulesExpanded[side];
  const summary = detachmentRuleSummary(detachment);
  container.replaceChildren();
  container.classList.toggle("compact", !expanded);

  const header = document.createElement("div");
  header.className = "rules-card-header";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `Regla de detachment${isEnemy ? " rival" : ""}: ${faction?.name || ""}`;
  const intro = document.createElement("p");
  intro.textContent = expanded ? detachment.name : `${detachment.name}: ${summary.name}`;
  heading.append(title, intro);

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "ghost rules-toggle";
  toggleButton.textContent = "...";
  toggleButton.title = expanded ? "Compactar regla" : "Leer regla completa";
  toggleButton.setAttribute("aria-label", expanded ? "Compactar regla de detachment" : "Leer regla completa de detachment");
  toggleButton.setAttribute("aria-expanded", String(expanded));
  toggleButton.addEventListener("click", () => {
    state.detachmentRulesExpanded[side] = !state.detachmentRulesExpanded[side];
    renderDetachmentRules(side);
  });
  header.append(heading, toggleButton);

  const list = document.createElement("dl");
  appendRuleDetail(list, "Nombre", summary.name);
  if (expanded) {
    appendRuleDetail(list, "Cuando", summary.timing);
    appendRuleDetail(list, "Efecto", summary.effect);
    (summary.details || []).forEach((detail) => appendRuleDetail(list, detail.label, detail.text));
  }
  container.append(header, list);
}

function renderStratagemButtons() {
  updateStratagemButton("player");
  updateStratagemButton("enemy");
}

function updateStratagemButton(side) {
  const button = $(side === "enemy" ? "#openEnemyStratagems" : "#openStratagems");
  if (!button) return;
  const detachments = activeDetachments(side);
  const count = stratagemsForActiveDetachments(side).length;
  const active = state.stratagemView.open && state.stratagemView.side === side;
  button.textContent = side === "enemy" ? `Ver estratagemas rivales${count ? ` (${count})` : ""}` : `Ver estratagemas${count ? ` (${count})` : ""}`;
  button.classList.toggle("active", active);
  button.title = count ? `Abrir estratagemas de ${detachments.map((detachment) => detachment.name).join(", ")}` : "No hay estratagemas cargadas para estos detachments";
}

function renderStratagemSection() {
  const section = $("#stratagemSection");
  if (!section) return;
  section.classList.toggle("hidden", !state.stratagemView.open);
  if (!state.stratagemView.open) return;

  const side = state.stratagemView.side;
  const isEnemy = side === "enemy";
  const faction = isEnemy ? state.enemyFaction : state.faction;
  const detachments = activeDetachments(side);
  const stratagems = stratagemsForActiveDetachments(side);
  $("#stratagemTitle").textContent = `Estratagemas${isEnemy ? " rivales" : ""}: ${detachments.map((detachment) => detachment.name).join(" + ") || "Sin detachment"}`;
  $("#stratagemSubtitle").textContent = `${faction?.name || "Faccion"} / ${stratagems.length || 0} estratagemas disponibles / ${detachmentPointTotal(side)}/${detachmentPointBudget()} DP`;

  const list = $("#stratagemList");
  list.replaceChildren();
  if (!stratagems.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No encontre estratagemas para este detachment en la base importada.";
    list.append(empty);
    return;
  }

  stratagems.forEach((stratagem) => {
    const card = document.createElement("article");
    card.className = "stratagem-card";

    const header = document.createElement("div");
    header.className = "stratagem-card-header";
    const title = document.createElement("h4");
    title.textContent = titleCase(stratagem.name);
    const cost = document.createElement("span");
    cost.className = "stratagem-cost";
    cost.textContent = stratagem.cp || "CP";
    header.append(title, cost);

    const meta = document.createElement("div");
    meta.className = "stratagem-meta";
    [stratagem.detachmentName && activeDetachments(side).length > 1 ? stratagem.detachmentName : "", stratagem.phase, stratagem.turn, stratagem.type].filter(Boolean).forEach((item) => {
      const pill = document.createElement("span");
      pill.textContent = item;
      meta.append(pill);
    });

    const summary = document.createElement("p");
    summary.textContent = stratagem.summary || "Consulta el detalle para resolver esta estratagema.";

    const details = document.createElement("dl");
    (stratagem.details || []).forEach((detail) => appendRuleDetail(details, detail.label, detail.text));

    card.append(header, meta, summary, details);
    list.append(card);
  });
}

function selectedDetachment(side) {
  return side === "enemy" ? state.enemyDetachment : state.detachment;
}

function stratagemsForDetachment(detachment) {
  if (!detachment) return [];
  return detachmentStratagems[normalizeName(detachment.name)] || [];
}

function stratagemsForActiveDetachments(side) {
  const seen = new Set();
  return activeDetachments(side).flatMap((detachment) => (
    stratagemsForDetachment(detachment).map((stratagem) => ({ ...stratagem, detachmentName: detachment.name }))
  )).filter((stratagem) => {
    const key = normalizeName(`${stratagem.detachmentName} ${stratagem.name}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function openUnitDetail(side, unitData, index = null) {
  const mode = Number.isInteger(index) ? "roster" : "catalog";
  state.unitDetailView = {
    open: true,
    side,
    mode,
    index,
    unit: unitData,
    draft: mode === "catalog" ? defaultUnitConfig(side, unitData) : null,
  };
  renderUnitDetailPanel();
  $("#unitDetailPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderUnitDetailPanel() {
  const panel = $("#unitDetailPanel");
  if (!panel) return;
  panel.classList.toggle("hidden", !state.unitDetailView.open);
  if (!state.unitDetailView.open) return;

  const side = state.unitDetailView.side;
  const unitData = detailViewUnit();
  if (!unitData) {
    panel.classList.add("hidden");
    return;
  }

  const detail = unitDetailFor(side, unitData);
  $("#unitDetailTitle").textContent = unitData.name;
  $("#unitDetailSubtitle").textContent = `${unitData.section || detail.role || "Unidad"} / ${unitTotalPoints(unitData)} pts / ${side === "enemy" ? "army rival" : "mi army"}`;

  const content = $("#unitDetailContent");
  content.replaceChildren();
  content.append(renderUnitConfigBlock(side, unitData, detail));
  if (unitData.recommended) content.append(renderRecommendationBlock(unitData));
  content.append(renderDatasheetBlock(unitData, detail));
}

function detailViewUnit() {
  const view = state.unitDetailView;
  if (view.mode === "roster") {
    const units = view.side === "enemy" ? state.enemyRoster : state.roster;
    return units[view.index] || null;
  }
  return view.unit;
}

function renderRecommendationBlock(unitData) {
  const block = document.createElement("div");
  block.className = "recommendation-block";
  const explanation = unitData.recommendation || buildRecommendationExplanation(unitData, autoPickContext(state.unitDetailView.side, state.unitDetailView.side === "enemy" ? state.enemyRoster : state.roster), state.unitDetailView.side === "enemy" ? state.enemyRoster : state.roster);
  const title = document.createElement("h4");
  title.textContent = "Por que la recomienda el sistema";
  const summary = document.createElement("p");
  summary.textContent = explanation.summary;
  const list = document.createElement("ul");
  (explanation.reasons || []).forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    list.append(item);
  });
  const useTitle = document.createElement("strong");
  useTitle.textContent = "Como usarla en mesa";
  const useList = document.createElement("ul");
  (explanation.usage || []).forEach((tip) => {
    const item = document.createElement("li");
    item.textContent = tip;
    useList.append(item);
  });
  const note = document.createElement("p");
  note.className = "mini";
  note.textContent = explanation.caution || "Revisala contra tu plan de mision antes de cerrar la lista.";
  block.append(title, summary, list, useTitle, useList, note);
  return block;
}

function renderUnitConfigBlock(side, unitData, detail) {
  const block = document.createElement("div");
  block.className = "unit-config-block";
  const title = document.createElement("h4");
  title.textContent = "Configuracion de lista";
  block.append(title);

  const config = editableUnitConfig(side, unitData);
  const controls = document.createElement("div");
  controls.className = "unit-config-controls";

  addModelCountControl(controls, side, unitData, detail, config);
  addLeaderControls(controls, side, unitData, config);

  if (canBeWarlord(unitData)) {
    const label = document.createElement("label");
    label.className = "check-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(config.warlord);
    checkbox.addEventListener("change", () => updateUnitConfig(side, unitData, { warlord: checkbox.checked }));
    label.append(checkbox, document.createTextNode(" Warlord"));
    controls.append(label);
  }

  if (canCarryEnhancement(unitData)) {
    const label = document.createElement("label");
    label.textContent = "Enhancement";
    const select = document.createElement("select");
    select.append(new Option("Sin enhancement", ""));
    availableEnhancements(side).forEach((enhancement) => {
      const suffix = enhancement.cost ? ` (${enhancement.cost})` : "";
      select.append(new Option(`${enhancement.name}${suffix}`, enhancement.name));
    });
    select.value = config.enhancement || "";
    select.addEventListener("change", () => {
      const enhancement = availableEnhancements(side).find((item) => item.name === select.value);
      updateUnitConfig(side, unitData, {
        enhancement: select.value,
        enhancementPoints: enhancementPoints(enhancement),
      });
    });
    label.append(select);
    controls.append(label);
  }

  const optionGroups = wargearOptionGroups(detail);
  if (optionGroups.length) {
    const options = document.createElement("div");
    options.className = "wargear-options";
    const optionsTitle = document.createElement("strong");
    optionsTitle.textContent = "Opciones de equipamiento";
    options.append(optionsTitle);
    optionGroups.forEach((option) => {
      if (option.choices.length > 1) {
        const label = document.createElement("label");
        label.textContent = option.label;
        const select = document.createElement("select");
        select.append(new Option("Mantener loadout base", ""));
        option.choices.forEach((choice) => select.append(new Option(choice, choice)));
        select.value = config.wargearSelections?.[option.id] || "";
        select.addEventListener("change", () => {
          const nextSelections = { ...(editableUnitConfig(side, unitData).wargearSelections || {}) };
          if (select.value) nextSelections[option.id] = select.value;
          else delete nextSelections[option.id];
          updateUnitConfig(side, unitData, {
            wargearSelections: nextSelections,
            wargear: selectedOptionTexts(optionGroups, nextSelections),
          });
        });
        label.append(select);
        options.append(label);
      } else {
        const label = document.createElement("label");
        label.className = "check-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(config.wargearSelections?.[option.id]);
        checkbox.addEventListener("change", () => {
          const nextSelections = { ...(editableUnitConfig(side, unitData).wargearSelections || {}) };
          if (checkbox.checked) nextSelections[option.id] = option.choices[0] || option.raw;
          else delete nextSelections[option.id];
          updateUnitConfig(side, unitData, {
            wargearSelections: nextSelections,
            wargear: selectedOptionTexts(optionGroups, nextSelections),
          });
        });
        label.append(checkbox, document.createTextNode(` ${option.label}`));
        options.append(label);
      }
    });
    controls.append(options);
  }

  if (state.unitDetailView.mode === "catalog") {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = side === "enemy" ? "Agregar a army rival" : "Agregar a mi army";
    addButton.addEventListener("click", () => addConfiguredUnit(side, unitData));
    controls.append(addButton);
  }

  if (!controls.children.length) {
    const empty = document.createElement("p");
    empty.className = "mini";
    empty.textContent = "Esta unidad no tiene opciones configurables cargadas en la base actual.";
    controls.append(empty);
  }

  block.append(controls);
  return block;
}

function addModelCountControl(controls, side, unitData, detail, config) {
  const sizes = unitSizeOptions(detail);
  if (sizes.length <= 1) return;
  const label = document.createElement("label");
  label.textContent = "Modelos en la unidad";
  const select = document.createElement("select");
  sizes.forEach((size) => {
    const points = unitPointsForModelCount(unitData, detail, size);
    select.append(new Option(`${size} modelos - ${points} pts`, String(size)));
  });
  select.value = String(configuredModelCount(unitData, detail, config));
  select.addEventListener("change", () => {
    updateUnitConfig(side, unitData, {
      modelCount: Number(select.value),
      importedWargearCounts: {},
    });
  });
  label.append(select);
  controls.append(label);
}

function addLeaderControls(controls, side, unitData, config) {
  if (isCharacterLike(unitData)) {
    const targets = leaderTargets(side, unitData);
    if (!targets.length) return;
    const panel = document.createElement("div");
    panel.className = "leader-link-panel";
    const title = document.createElement("strong");
    title.textContent = "Puede liderar";
    const list = document.createElement("p");
    list.textContent = targets.join(", ");
    panel.append(title, list);
    controls.append(panel);
    return;
  }

  if (state.unitDetailView.mode !== "roster") return;
  const leaders = compatibleRosterLeaders(side, unitData);
  if (!leaders.length) return;
  const label = document.createElement("label");
  label.textContent = "Lider asignado";
  const select = document.createElement("select");
  select.append(new Option("Sin lider asignado", ""));
  leaders.forEach(({ leader, index }) => {
    select.append(new Option(`${leader.name} (${unitTotalPoints(leader)} pts)`, leader.instanceId || String(index)));
  });
  select.value = config.leaderRef || "";
  select.addEventListener("change", () => updateUnitLeader(side, state.unitDetailView.index, select.value));
  label.append(select);
  controls.append(label);
}

function renderDatasheetBlock(unitData, detail) {
  const block = document.createElement("div");
  block.className = "datasheet-block";
  block.classList.add("datasheet-list");
  const config = editableUnitConfig(state.unitDetailView.side, unitData);

  addModelPanel(block, detail.models || []);
  addWargearPanel(block, unitData, detail, config);
  addRoleScorePanel(block, unitData);
  addDetailPanel(block, "Loadout base", [detail.loadout || "Sin loadout base registrado."], true);
  addDetailPanel(block, "Composicion", detail.composition || [], true);
  addAbilityPanel(block, detail.abilities || []);
  addRulesPanel(block, unitData, detail, config);
  addKeywordPanel(block, "Keywords", detail.keywords || []);
  addKeywordPanel(block, "Faction keywords", detail.factionKeywords || [], true);
  if (detail.transport) addDetailPanel(block, "Transporte", [detail.transport], true);
  if (detail.damaged) addDetailPanel(block, "Perfil degradado", [detail.damaged], true);
  if (detail.legend) addDetailPanel(block, "Notas de datasheet", [detail.legend], true);

  return block;
}

function addDetailPanel(container, title, lines, collapsed = false) {
  const panel = detailPanel(title, collapsed);
  const validLines = lines.filter(Boolean);
  if (!validLines.length) {
    panel.append(emptyMini("Sin datos cargados."));
  } else {
    validLines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      panel.append(p);
    });
  }
  container.append(panel);
}

function addModelPanel(container, models) {
  const panel = detailPanel("Unit", false);
  if (!models.length) {
    panel.append(emptyMini("Sin perfil de modelo cargado."));
  } else {
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Modelo</th><th>M</th><th>T</th><th>Sv</th><th>W</th><th>Ld</th><th>OC</th></tr></thead>";
    const body = document.createElement("tbody");
    models.forEach((model) => {
      const row = document.createElement("tr");
      ["name", "M", "T", "Sv", "W", "Ld", "OC"].forEach((key) => {
        const cell = document.createElement("td");
        cell.textContent = model[key] || "-";
        row.append(cell);
      });
      body.append(row);
    });
    table.append(body);
    panel.append(table);
  }
  container.append(panel);
}

function addWargearPanel(container, unitData, detail, config) {
  const selected = effectiveWargear(detail, config, unitData);
  const ranged = selected.filter((weapon) => normalizeName(weapon.type || weapon.range) !== "melee");
  const melee = selected.filter((weapon) => normalizeName(weapon.type || weapon.range) === "melee");
  addWeaponTable(container, "Ranged Weapons", ranged, "BS");
  addWeaponTable(container, "Melee Weapons", melee, "WS");
  addUnprofiledWargearPanel(container, detail, config, unitData);

  const allProfiles = (detail.wargear || []).filter((weapon) => !selected.some((item) => weaponMatchesChoice(item.name, weapon.name)));
  if (allProfiles.length) {
    const panel = detailPanel("Otros perfiles disponibles", true);
    const text = document.createElement("p");
    text.textContent = allProfiles.map((weapon) => weapon.name).join(", ");
    panel.append(text);
    container.append(panel);
  }
}

function addUnprofiledWargearPanel(container, detail, config, unitData) {
  const counts = effectiveWargearCounts(detail, config, unitData);
  const extras = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .filter(([name]) => !(detail.wargear || []).some((weapon) => weaponMatchesChoice(weapon.name, name)))
    .map(([name, count]) => count > 1 ? `${name} (x${count})` : name);
  if (!extras.length) return;
  const panel = detailPanel("Equipo sin perfil de arma", true);
  const text = document.createElement("p");
  text.textContent = extras.join(", ");
  panel.append(text);
  container.append(panel);
}

function addWeaponTable(container, title, weapons, skillLabel) {
  const panel = detailPanel(title, false);
  if (!weapons.length) {
    panel.append(emptyMini("Sin perfiles seleccionados o cargados."));
  } else {
    const table = document.createElement("table");
    table.innerHTML = `<thead><tr><th>${title.includes("Ranged") ? "Ranged Weapons" : "Melee Weapons"}</th><th>Range</th><th>A</th><th>${skillLabel}</th><th>S</th><th>AP</th><th>D</th><th>Keywords</th></tr></thead>`;
    const body = document.createElement("tbody");
    weapons.forEach((weapon) => {
      const row = document.createElement("tr");
      ["name", "range", "A", "skill", "S", "AP", "D", "abilities"].forEach((key) => {
        const cell = document.createElement("td");
        cell.textContent = key === "name" ? weaponNameWithCount(weapon) : weapon[key] || "-";
        row.append(cell);
      });
      body.append(row);
    });
    table.append(body);
    panel.append(table);
  }
  container.append(panel);
}

function weaponNameWithCount(weapon) {
  const count = Number(weapon.count || 1);
  return count > 1 ? `${weapon.name} (x${count})` : weapon.name;
}

function addAbilityPanel(container, abilities) {
  const panel = detailPanel("Abilities", false);
  if (!abilities.length) {
    panel.append(emptyMini("Sin habilidades cargadas."));
  } else {
    abilities.forEach((ability) => {
      const item = document.createElement("div");
      item.className = "ability-item";
      const name = document.createElement("strong");
      name.textContent = ability.name || ability.type || "Habilidad";
      const description = document.createElement("p");
      description.textContent = ability.description || ability.type || "";
      item.append(name, description);
      panel.append(item);
    });
  }
  container.append(panel);
}

function addRulesPanel(container, unitData, detail, config) {
  const panel = detailPanel("Rules", false);
  const rules = rulesForUnit(state.unitDetailView.side, unitData, detail, config);
  if (!rules.length) {
    panel.append(emptyMini("Sin referencias de reglas detectadas para esta unidad."));
  } else {
    rules.forEach((rule) => {
      const item = document.createElement("div");
      item.className = "ability-item";
      const name = document.createElement("strong");
      name.textContent = rule.name;
      const description = document.createElement("p");
      description.textContent = rule.description;
      item.append(name, description);
      panel.append(item);
    });
  }

  const keywords = [...new Set([...(detail.keywords || []), ...(detail.factionKeywords || [])])];
  if (keywords.length) {
    const keywordRow = document.createElement("div");
    keywordRow.className = "rules-keyword-row";
    const label = document.createElement("strong");
    label.textContent = "Keywords:";
    const tags = document.createElement("div");
    tags.className = "tags";
    keywords.forEach((keyword) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = keyword;
      tags.append(tag);
    });
    keywordRow.append(label, tags);
    panel.append(keywordRow);
  }
  container.append(panel);
}

function addKeywordPanel(container, title, keywords, collapsed = false) {
  const panel = detailPanel(title, collapsed);
  if (!keywords.length) {
    panel.append(emptyMini("Sin keywords cargadas."));
  } else {
    const tags = document.createElement("div");
    tags.className = "tags";
    keywords.forEach((keyword) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = keyword;
      tags.append(tag);
    });
    panel.append(tags);
  }
  container.append(panel);
}

function detailPanel(title, collapsed = false) {
  const panel = document.createElement("details");
  panel.className = "datasheet-detail-card";
  panel.open = !collapsed;
  const heading = document.createElement("summary");
  heading.textContent = title;
  panel.append(heading);
  return panel;
}

function emptyMini(text) {
  const p = document.createElement("p");
  p.className = "mini";
  p.textContent = text;
  return p;
}

function unitDetailFor(side, unitData) {
  const faction = side === "enemy" ? state.enemyFaction : state.faction;
  return unitDetailForFaction(faction, unitData);
}

function unitDetailForFaction(faction, unitData) {
  return detailByUnitName(unitData.name, faction?.id) || fallbackUnitDetail(unitData);
}

function unitDetailForAny(unitData) {
  return detailByUnitName(unitData.name, state.faction?.id) || detailByUnitName(unitData.name, state.enemyFaction?.id) || fallbackUnitDetail(unitData);
}

function detailByUnitName(name, preferredFactionId) {
  const key = normalizeName(name);
  if (unitDetails[preferredFactionId]?.[key]) return unitDetails[preferredFactionId][key];
  for (const factionUnits of Object.values(unitDetails)) {
    if (factionUnits?.[key]) return factionUnits[key];
  }
  return null;
}

function fallbackUnitDetail(unitData) {
  return {
    name: unitData.name,
    role: unitData.section,
    loadout: "No hay datasheet detallado enlazado para esta unidad.",
    composition: [],
    models: [],
    wargearOptions: [],
    wargear: [],
    abilities: unitData.tags.map((tag) => ({ name: tag, description: "Etiqueta tactica inferida por la app." })),
    keywords: unitData.tags || [],
    factionKeywords: [],
  };
}

function editableUnitConfig(side, unitData) {
  if (state.unitDetailView.mode === "catalog") return state.unitDetailView.draft || defaultUnitConfig(side, unitData);
  return unitData.config || defaultUnitConfig(side, unitData);
}

function defaultUnitConfig(side, unitData) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const detail = unitDetailFor(side, unitData);
  return {
    warlord: canBeWarlord(unitData) && !units.some((unit) => unit.config?.warlord),
    enhancement: "",
    enhancementPoints: 0,
    wargear: [],
    wargearSelections: {},
    importedWargearCounts: {},
    modelCount: compositionModelRange(detail).min,
    leaderRef: "",
  };
}

function updateUnitConfig(side, unitData, patch) {
  if (state.unitDetailView.mode === "catalog") {
    state.unitDetailView.draft = { ...editableUnitConfig(side, unitData), ...patch };
    renderUnitDetailPanel();
    return;
  }

  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const current = units[state.unitDetailView.index];
  if (!current) return;
  current.config = { ...defaultUnitConfig(side, current), ...(current.config || {}), ...patch };
  if (patch.warlord) {
    units.forEach((unit, index) => {
      if (index !== state.unitDetailView.index && unit.config?.warlord) unit.config.warlord = false;
    });
  }
  render();
}

function updateUnitLeader(side, bodyguardIndex, leaderRef) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const bodyguard = units[bodyguardIndex];
  if (!bodyguard) return;
  units.forEach((unitData, index) => {
    if (index !== bodyguardIndex && unitData.config?.leaderRef === leaderRef) {
      unitData.config.leaderRef = "";
    }
  });
  bodyguard.config = { ...defaultUnitConfig(side, bodyguard), ...(bodyguard.config || {}), leaderRef };
  render();
}

function addConfiguredUnit(side, unitData) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const config = editableUnitConfig(side, unitData);
  const detail = unitDetailFor(side, unitData);
  if (totalPoints(units) + unitTotalPoints({ ...unitData, config }, detail) > state.gameSize * 1.1) return;
  if (config.warlord) units.forEach((unit) => {
    if (unit.config) unit.config.warlord = false;
  });
  const added = rosterUnit({ ...unitData, config }, "manual");
  units.push(added);
  state.unitDetailView.mode = "roster";
  state.unitDetailView.index = units.length - 1;
  state.unitDetailView.unit = added;
  state.unitDetailView.draft = null;
  syncInferredContext(side === "enemy");
  render();
}

function availableEnhancements(side) {
  const seen = new Set();
  return activeDetachments(side).flatMap((detachment) => (
    unitEnhancements[normalizeName(detachment?.name || "")] || []
  )).filter((enhancement) => {
    const key = normalizeName(enhancement.name || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enhancementPoints(enhancement) {
  return Number((enhancement?.cost || "").match(/\d+/)?.[0] || 0);
}

function wargearOptionGroups(detail) {
  return (detail.wargearOptions || []).map((raw, index) => {
    const choices = optionChoices(raw);
    return {
      id: String(index),
      raw,
      label: optionLabel(raw, index),
      choices: choices.length ? choices : [singleOptionChoice(raw)],
      replaceTargets: replaceTargets(raw),
    };
  });
}

function optionChoices(raw) {
  return raw
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter((line) => /^\d+\s+/.test(line))
    .map(cleanWargearChoice)
    .filter(Boolean);
}

function singleOptionChoice(raw) {
  const match = raw.match(/\b(?:with|equipped with|replaced with)\s+(.+?)\.?$/i);
  return cleanWargearChoice(match?.[1] || raw);
}

function cleanWargearChoice(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^(?:every|each|any|one|a|an|\d+)\s+.+?\s+is equipped with:\s*/i, "")
    .replace(/^.+?\s+is equipped with:\s*/i, "")
    .replace(/^one of the following:\s*/i, "")
    .replace(/^\d+\s*x?\s*/i, "")
    .replace(/[.;]+$/, "")
    .trim();
}

function optionLabel(raw, index) {
  return (raw.split("\n")[0] || `Opcion ${index + 1}`).replace(/:$/, "");
}

function selectedOptionTexts(groups, selections) {
  return groups
    .map((group) => selections[group.id])
    .filter(Boolean);
}

function replaceTargets(raw) {
  const firstLine = raw.split("\n")[0] || raw;
  const match = firstLine.match(/(?:'s|s)\s+(.+?)\s+can be replaced/i) || firstLine.match(/^(.+?)\s+can be replaced/i);
  if (!match) return [];
  return match[1]
    .replace(/\bthis model\b/gi, "")
    .split(/\s*,\s*|\s+and\s+/i)
    .map((item) => item.replace(/^(?:the|a|an|one|1)\s+/i, "").trim())
    .filter((item) => item.length > 2 && !/model|sergeant|captain|intercessor/i.test(item));
}

function effectiveWargear(detail, config, unitData) {
  const counts = effectiveWargearCounts(detail, config, unitData);
  const matched = weaponsFromCountMap(detail, counts);
  return matched.length ? matched : (detail.wargear || []).map((weapon) => ({ ...weapon, count: 1 }));
}

function effectiveWargearCounts(detail, config, unitData) {
  if (Object.keys(config?.importedWargearCounts || {}).length) {
    return { ...config.importedWargearCounts };
  }

  const groups = wargearOptionGroups(detail);
  const selections = config?.wargearSelections || {};
  const counts = baseLoadoutCounts(detail, config, unitData);

  groups.forEach((group) => {
    const selected = selections[group.id];
    if (!selected) return;
    const count = optionSelectionCount(group, detail, unitData, config);
    group.replaceTargets.forEach((target) => subtractMatchingCount(counts, target, count));
    addCount(counts, selected, count);
  });

  return counts;
}

function optionReplacesBase(group, detail, unitData) {
  const raw = group.raw.toLowerCase();
  if (/sergeant|champion|alluress|exarch|theyn|nob|boss nob|watch sergeant|obsessionist|solarite|hekatrix/.test(raw)) return false;
  if (/for every|one model|up to|any number of models/.test(raw)) return false;
  if (/all models|every model/.test(raw)) return true;
  if (/this model/.test(raw)) return isSingleModelDatasheet(detail, unitData);
  return isSingleModelDatasheet(detail, unitData);
}

function isSingleModelDatasheet(detail, unitData) {
  if (isCharacterLike(unitData) || unitData.section === "Vehicle" || unitData.section === "Monster" || unitData.section === "Fortification") return true;
  const composition = (detail.composition || []).join(" ").toLowerCase();
  if (!composition) return false;
  if (/\b\d+\s*-\s*\d+\b/.test(composition)) return false;
  const numbers = [...composition.matchAll(/\b\d+\b/g)].map((match) => Number(match[0]));
  return numbers.length === 1 && numbers[0] === 1;
}

function baseLoadoutCounts(detail, config, unitData) {
  const counts = {};
  const multiplier = /^every model/i.test(detail.loadout || "") ? unitModelCount(detail, config, unitData) : 1;
  baseLoadoutEntries(detail.loadout).forEach((entry) => addCount(counts, entry.name, entry.count * multiplier));
  return counts;
}

function baseLoadoutEntries(loadout = "") {
  const afterColon = loadout.includes(":") ? loadout.split(":").slice(1).join(":") : loadout;
  return afterColon
    .replace(/\.$/, "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(\d+)\s+(.+)$/);
      return {
        name: cleanWargearChoice(match?.[2] || item),
        count: Number(match?.[1] || 1),
      };
    })
    .filter((entry) => entry.name && normalizeName(entry.name) !== "nothing");
}

function unitModelCount(detail, config, unitData) {
  return configuredModelCount(unitData, detail, config);
}

function configuredModelCount(unitData, detail, config = {}) {
  const range = compositionModelRange(detail);
  return clampModelCount(Number(config?.modelCount || range.min), range);
}

function clampModelCount(count, range) {
  if (!Number.isFinite(count) || count <= 0) return range.min;
  return Math.max(range.min, Math.min(range.max, count));
}

function unitSizeOptions(detail) {
  const range = compositionModelRange(detail);
  if (range.max <= range.min) return [range.min];
  return Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index);
}

function compositionModelRange(detail) {
  const lines = detail?.composition || [];
  const range = lines.reduce((totals, line) => {
    const text = String(line);
    const rangeMatch = text.match(/\b(\d+)\s*-\s*(\d+)\b/);
    if (rangeMatch) {
      totals.min += Number(rangeMatch[1]);
      totals.max += Number(rangeMatch[2]);
      return totals;
    }
    const fixed = text.match(/\b(\d+)\b/);
    const value = Number(fixed?.[1] || 0);
    totals.min += value;
    totals.max += value;
    return totals;
  }, { min: 0, max: 0 });
  return {
    min: Math.max(1, range.min || 1),
    max: Math.max(1, range.max || range.min || 1),
  };
}

function unitPointsForModelCount(unitData, detail, modelCount) {
  const range = compositionModelRange(detail);
  const basePoints = Number(unitData.basePoints || unitData.points || 0);
  if (!basePoints || range.max <= range.min) return basePoints;
  const count = clampModelCount(modelCount, range);
  const pointCosts = unitData.pointCosts || {};
  if (pointCosts[String(count)] !== undefined) return Number(pointCosts[String(count)]);
  if (usesBlockPoints(range)) return Math.ceil(count / range.min) * basePoints;
  const perModel = basePoints / Math.max(1, range.min);
  return Math.max(0, Math.round((perModel * count) / 5) * 5);
}

function usesBlockPoints(range) {
  return range.min >= 5 && range.max > range.min;
}

function inferModelCountFromPoints(points, unitData, detail) {
  const options = unitSizeOptions(detail);
  if (options.length <= 1) return options[0];
  const match = options
    .map((count) => ({ count, points: unitPointsForModelCount(unitData, detail, count) }))
    .sort((a, b) => Math.abs(a.points - points) - Math.abs(b.points - points))[0];
  return match?.count || options[0];
}

function optionSelectionCount(group, detail, unitData, config) {
  const raw = group.raw.toLowerCase();
  if (/all models|every model/.test(raw)) return unitModelCount(detail, config, unitData);
  const everyMatch = raw.match(/for every\s+(\d+)\s+models?/);
  if (everyMatch) return Math.max(1, Math.floor(unitModelCount(detail, config, unitData) / Number(everyMatch[1])));
  const upToMatch = raw.match(/up to\s+(\d+)\s+models?/);
  if (upToMatch) return Number(upToMatch[1]);
  return 1;
}

function addCount(counts, name, amount = 1) {
  const clean = cleanWargearChoice(name);
  if (!clean || amount <= 0) return;
  counts[clean] = Math.max(0, (counts[clean] || 0) + amount);
}

function subtractMatchingCount(counts, target, amount) {
  const targetKey = normalizeName(target);
  const match = Object.keys(counts).find((name) => {
    const key = normalizeName(name);
    return key === targetKey || key.includes(targetKey) || targetKey.includes(key);
  });
  if (match) counts[match] = Math.max(0, counts[match] - amount);
}

function weaponsFromCountMap(detail, counts) {
  const matched = [];
  Object.entries(counts).forEach(([name, count]) => {
    if (count <= 0) return;
    const matches = (detail.wargear || []).filter((weapon) => weaponMatchesChoice(weapon.name, name));
    matches.forEach((weapon) => {
      const key = normalizeName(weapon.name);
      const existing = matched.find((item) => normalizeName(item.name) === key);
      if (existing) existing.count += count;
      else matched.push({ ...weapon, count });
    });
  });
  return matched;
}

function weaponMatchesChoice(weaponName = "", choice = "") {
  const weapon = normalizeWeaponKey(weaponName);
  const wanted = normalizeWeaponKey(choice);
  if (!weapon || !wanted) return false;
  return weapon === wanted || weapon.startsWith(`${wanted} `) || wanted.startsWith(`${weapon} `);
}

function rulesForUnit(side, unitData, detail, config) {
  const found = new Map();
  const addRule = (name) => {
    const key = ruleKey(name);
    const rule = unitRuleReference[key];
    if (rule && !found.has(key)) found.set(key, rule);
  };

  const faction = side === "enemy" ? state.enemyFaction : state.faction;
  const factionRule = faction ? factionRuleSummary(faction) : null;
  if (factionRule?.name) addRule(factionRule.name);

  (detail.abilities || []).forEach((ability) => {
    addRule(ability.name);
  });

  effectiveWargear(detail, config, unitData).forEach((weapon) => {
    weaponKeywords(weapon.abilities).forEach(addRule);
  });

  (detail.keywords || []).forEach(addRule);
  return [...found.values()].map((rule) => ({
    name: rule.name,
    description: rule.description || rule.legend || "",
  })).filter((rule) => rule.description);
}

function ruleKey(name = "") {
  const normalized = normalizeName(String(name).replace(/\bx\+?$/i, "").replace(/\d+\+?$/g, ""));
  if (normalized.startsWith("anti ")) return "anti";
  if (normalized.startsWith("rapid fire")) return "rapid fire";
  if (normalized.startsWith("sustained hits")) return "sustained hits";
  if (normalized.startsWith("feel no pain")) return "feel no pain";
  if (normalized.startsWith("deadly demise")) return "deadly demise";
  if (normalized.startsWith("scouts")) return "scouts";
  if (normalized.startsWith("melta")) return "melta";
  return normalized;
}

function weaponKeywords(text = "") {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const keys = [];
  Object.keys(coreRuleReferences).forEach((key) => {
    const pattern = key.replace(/\s+/g, "[ -]");
    if (new RegExp(`\\b${pattern}\\b`, "i").test(normalized)) keys.push(key);
  });
  const antiMatches = normalized.match(/\banti-[a-z ]+\s+\d\+\b/g) || [];
  if (antiMatches.length) keys.push("anti");
  return [...new Set(keys)];
}

function addRoleScorePanel(container, unitData) {
  const panel = detailPanel("Scores tacticos", false);
  const scores = unitRoleScores(unitData);
  const list = document.createElement("div");
  list.className = "role-score-list";
  scores.forEach((score) => {
    const row = document.createElement("div");
    row.className = "role-score-row";
    row.innerHTML = `<span>${score.label}</span><strong>${score.value}/10</strong><div><i style="width: ${score.value * 10}%"></i></div>`;
    list.append(row);
  });
  panel.append(list);
  container.append(panel);
}

function unitRoleScores(unitData) {
  const features = unitFeatures(unitData);
  const weapons = unitWeaponFeatureScores(unitData);
  const score = (...values) => Math.max(0, Math.min(10, Math.round(Math.max(...values) * 10)));
  const weightedScore = (...values) => Math.max(0, Math.min(10, Math.round(values.reduce((sum, value) => sum + value, 0) * 10)));
  return [
    { label: "Dano antiinfanteria", value: weightedScore(weapons.shooting * 0.58, weapons.melee * 0.22, features.boardControl * 0.14, features.indirect * 0.08) },
    { label: "Dano antitanque", value: weightedScore(weapons.antiTank * 0.76, features.antiTank * 0.18, features.monsterVehicle * 0.06) },
    { label: "Melee", value: weightedScore(weapons.melee * 0.72, features.charge * 0.14, features.melee * 0.14) },
    { label: "Disparo", value: weightedScore(weapons.shooting * 0.7, weapons.rangedAntiTank * 0.16, features.shooting * 0.14) },
    { label: "Scorer", value: score(features.scoring, features.speed * 0.65, features.deepStrike * 0.65) },
    { label: "Pantalla", value: score(features.screens, features.boardControl * 0.75, features.cheap * 0.8) },
    { label: "Ancla", value: score(features.anchor, features.durability * 0.9) },
    { label: "Trading piece", value: weightedScore(features.trading * 0.46, features.cheap * 0.2, features.pressure * 0.18, Math.max(weapons.shooting, weapons.melee, weapons.antiTank) * 0.22) },
    { label: "Transporte", value: score(isDedicatedTransport(unitData) ? 1 : 0, features.transport * 0.8) },
    { label: "Buff piece", value: score(features.buff, features.synergy * 0.6) },
    { label: "Objective holder", value: score(features.scoring * 0.75, features.anchor * 0.75, features.durability * 0.7) },
    { label: "Deep strike", value: score(features.deepStrike) },
    { label: "Countercharge", value: weightedScore(weapons.melee * 0.52, features.anchor * 0.18, features.charge * 0.16, features.melee * 0.14) },
  ];
}

function titleCase(value = "") {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function appendRuleDetail(list, label, text) {
  if (!text) return;
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  if (Array.isArray(text)) {
    const bulletList = document.createElement("ul");
    text.forEach((item) => {
      const bullet = document.createElement("li");
      bullet.textContent = item;
      bulletList.append(bullet);
    });
    detail.append(bulletList);
  } else {
    detail.textContent = text;
  }
  row.append(term, detail);
  list.append(row);
}

function factionRuleSummary(faction) {
  return explicitFactionRules[faction.id] || inferredFactionRuleSummary(faction);
}

function detachmentRuleSummary(detachment) {
  return detachmentRules[normalizeName(detachment.name)] || inferredDetachmentRuleSummary(detachment);
}

function inferredDetachmentRuleSummary(detachment) {
  const styles = detachment.styles || [];
  const details = [];
  if (styles.includes("pressure")) details.push({ label: "Presion", text: "Favorece reglas de avance, carga, amenaza temprana o intercambios activos." });
  if (styles.includes("melee")) details.push({ label: "Melee", text: "Favorece combate, cargas o ataques de corta distancia." });
  if (styles.includes("shooting")) details.push({ label: "Disparo", text: "Favorece disparo, fuego concentrado o perfiles de apoyo a distancia." });
  if (styles.includes("durable")) details.push({ label: "Resistencia", text: "Favorece aguantar objetivos, reducir dano o sostener mesa." });
  if (styles.includes("mobility")) details.push({ label: "Movilidad", text: "Favorece reposicionamiento, reservas, deep strike, scout o movimiento extra." });
  if (styles.includes("mission") || !details.length) details.push({ label: "Mision", text: "Favorece control de objetivos, OC, acciones o scoring." });
  return {
    name: `${detachment.name} rule`,
    timing: "Regla exacta no disponible en la cache local.",
    effect: "Referencia mecanica inferida desde el perfil del detachment.",
    details,
  };
}

function inferredFactionRuleSummary(faction) {
  const units = faction.units || [];
  const tags = units.flatMap((unitData) => [...unitData.tags, ...(unitData.styles || [])]).join(" ");
  const styles = faction.detachments?.flatMap((detachment) => detachment.styles || []) || [];
  const styleText = styles.join(" ");
  const pressure = /pressure|melee|mobility/.test(`${tags} ${styleText}`);
  const durable = /durable|anchor|monster|vehicle/.test(`${tags} ${styleText}`);
  const shooting = /shooting|anti-tank|vehicle/.test(`${tags} ${styleText}`);
  return {
    name: "Regla de faccion pendiente",
    effect: durable
      ? "Aun no tengo registrada la regla exacta de esta faccion; por ahora se marca como ejercito de resistencia y presencia."
      : pressure
        ? "Aun no tengo registrada la regla exacta de esta faccion; por ahora se marca como ejercito de presion y tempo."
        : shooting
          ? "Aun no tengo registrada la regla exacta de esta faccion; por ahora se marca como ejercito de disparo y control de lineas."
          : "Aun no tengo registrada la regla exacta de esta faccion.",
  };
}

function renderCatalog(side) {
  const isEnemy = side === "enemy";
  const catalog = $(isEnemy ? "#enemyCatalog" : "#unitCatalog");
  catalog.replaceChildren();
  const units = filteredUnits(side);
  const groups = groupBySection(units);
  const openSections = state.catalogSections[side];
  const searchHasText = Boolean(normalizeSearch($(isEnemy ? "#enemyUnitSearch" : "#unitSearch").value));

  if (!units.length) {
    const empty = document.createElement("div");
    empty.className = "roster empty";
    empty.textContent = "No encontre unidades con esa busqueda.";
    catalog.append(empty);
    return;
  }

  sectionOrder.forEach((section) => {
    const sectionUnits = groups.get(section);
    if (!sectionUnits?.length) return;
    const wrapper = document.createElement("details");
    wrapper.className = "unit-section";
    wrapper.open = searchHasText || openSections.has(section);
    wrapper.addEventListener("toggle", () => {
      if (wrapper.open) {
        openSections.add(section);
      } else {
        openSections.delete(section);
      }
    });

    const title = document.createElement("summary");
    title.className = "unit-section-title";
    title.innerHTML = `<span class="unit-section-name">${section}</span><span>${sectionUnits.length}</span>`;

    const body = document.createElement("div");
    body.className = "unit-section-body";
    sectionUnits.forEach((unitData) => body.append(renderUnitCard(side, unitData)));

    wrapper.append(title, body);
    catalog.append(wrapper);
  });
}

function renderUnitCard(side, unitData) {
  const isEnemy = side === "enemy";
  const card = document.createElement("div");
  card.className = "unit-card";
  card.innerHTML = `
    <div>
      <h4>${unitData.name}</h4>
      <p>${unitData.section || "Other"} - ${unitData.styles.join(" / ")}</p>
      <div class="tags">${unitData.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    </div>
    <div class="unit-actions">
      <strong>${unitData.points} pts</strong>
      <button class="ghost" type="button" data-action="detail">Ver</button>
      <button type="button" data-action="add">${isEnemy ? "Rival" : "Agregar"}</button>
    </div>
  `;
  card.querySelector("[data-action='detail']").addEventListener("click", () => openUnitDetail(side, unitData));
  card.querySelector("[data-action='add']").addEventListener("click", () => addUnit(side, unitData));
  return card;
}

function renderRoster(side) {
  const isEnemy = side === "enemy";
  const roster = $(isEnemy ? "#enemyRoster" : "#roster");
  const units = isEnemy ? state.enemyRoster : state.roster;
  reconcileLeaderRefs(units);
  const validation = validateRoster(side);
  const issueMap = issuesByUnitIndex(validation.issues);
  roster.replaceChildren();

  if (!units.length) {
    roster.classList.add("empty");
    roster.textContent = isEnemy ? "La lista rival aparecera aqui." : "Tu lista aparecera aqui.";
  } else {
    roster.classList.remove("empty");
    [
      { title: isEnemy ? "Base rival" : "Tus elecciones", source: "base" },
      { title: "Recomendado por el sistema", source: "recommended" },
    ].forEach((group) => {
      const indexedUnits = units
        .map((unitData, index) => ({ unitData, index }))
        .filter(({ unitData }) => group.source === "recommended" ? unitData.recommended : !unitData.recommended);
      if (!indexedUnits.length) return;
      roster.append(renderRosterGroup(side, group, indexedUnits, issueMap));
    });
  }

  renderRosterValidation(side, validation);

  const points = totalPoints(units);
  if (isEnemy) {
    $("#enemyPointsUsed").textContent = points;
    $("#enemyGameSizeLabel").textContent = state.gameSize;
    $("#enemyPointsUsed").closest(".mini").classList.toggle("over", points > state.gameSize);
  } else {
    $("#pointsUsed").textContent = points;
    $("#gameSizeLabel").textContent = state.gameSize;
    $(".points").classList.toggle("over", points > state.gameSize);
  }
}

function renderRosterGroup(side, group, indexedUnits, issueMap) {
  const section = document.createElement("section");
  section.className = `roster-group ${group.source}`;
  const heading = document.createElement("div");
  heading.className = "roster-group-title";
  heading.innerHTML = `<strong>${group.title}</strong><span>${totalPoints(indexedUnits.map(({ unitData }) => unitData))} pts</span>`;
  section.append(heading);

  groupIndexedRosterBySection(indexedUnits).forEach((sectionUnits, sectionName) => {
    if (!sectionUnits.length) return;
    const subgroup = document.createElement("div");
    subgroup.className = "roster-category";
    const subheading = document.createElement("div");
    subheading.className = "roster-category-title";
    subheading.innerHTML = `<strong>${sectionName}</strong><span>${sectionUnits.length} / ${totalPoints(sectionUnits.map(({ unitData }) => unitData))} pts</span>`;
    subgroup.append(subheading);
    sectionUnits.forEach(({ unitData, index }) => {
      subgroup.append(renderRosterRow(side, unitData, index, issueMap.get(index) || []));
    });
    section.append(subgroup);
  });

  return section;
}

function renderRosterRow(side, unitData, index, unitIssues) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const row = document.createElement("div");
  const issueClass = unitIssues.some((issue) => issue.severity === "error") ? " invalid" : unitIssues.length ? " warning" : "";
  row.className = `roster-row${unitData.imported ? " imported" : ""}${unitData.recommended ? " recommended" : ""}${issueClass}`;
  row.innerHTML = `
    <div>
      <h4>${unitData.name}</h4>
      <p>${unitTotalPoints(unitData)} pts - ${unitData.tags.join(", ")} - ${rosterSourceLabel(unitData)}</p>
      ${configSummary(unitData) ? `<p class="config-summary">${configSummary(unitData)}</p>` : ""}
      ${unitIssues.length ? `<ul class="row-issues">${unitIssues.map((issue) => `<li>${issue.message}</li>`).join("")}</ul>` : ""}
    </div>
    <div class="roster-actions">
      <button class="ghost" type="button" data-action="detail">Configurar</button>
      <button class="ghost" type="button" data-action="remove">Quitar</button>
    </div>
  `;
  row.querySelector("[data-action='detail']").addEventListener("click", () => openUnitDetail(side, unitData, index));
  row.querySelector("[data-action='remove']").addEventListener("click", () => {
    units.splice(index, 1);
    if (state.unitDetailView.open && state.unitDetailView.side === side && state.unitDetailView.index === index) {
      state.unitDetailView.open = false;
    }
    syncInferredContext(side === "enemy");
    render();
  });
  return row;
}

function configSummary(unitData) {
  const config = unitData.config || {};
  const pieces = [];
  const detail = unitDetailForAny(unitData);
  const sizes = unitSizeOptions(detail);
  if (sizes.length > 1) pieces.push(`${configuredModelCount(unitData, detail, config)} modelos`);
  if (config.warlord) pieces.push("Warlord");
  if (config.enhancement) pieces.push(`Enhancement: ${config.enhancement}`);
  if (config.wargear?.length) pieces.push(`${config.wargear.length} opcion(es) de equipo marcadas`);
  if (Object.keys(config.importedWargearCounts || {}).length) pieces.push("equipamiento importado");
  if (config.leaderRef) {
    const leader = [...state.roster, ...state.enemyRoster].find((unit) => unit.instanceId === config.leaderRef);
    if (leader) pieces.push(`lider: ${leader.name}`);
  }
  return pieces.join(" - ");
}

function rosterSourceLabel(unitData) {
  if (unitData.recommended) return "recomendada";
  if (unitData.imported) return "importada";
  return "manual";
}

function renderRosterValidation(side, validation) {
  const container = $(side === "enemy" ? "#enemyRosterValidation" : "#rosterValidation");
  container.replaceChildren();

  if (!validation.issues.length) {
    if (!validation.units.length) return;
    const ok = document.createElement("p");
    ok.className = "validation-ok";
    ok.textContent = "Lista legal segun los controles cargados: puntos, warlord, copias, enhancements, tamanos, lideres, transportes y categorias especiales.";
    container.append(ok);
    return;
  }

  validation.issues.forEach((issue) => {
    const item = document.createElement("div");
    item.className = `validation-item ${issue.severity}`;
    item.innerHTML = `
      <strong>${issue.title}</strong>
      <p>${issue.message}${issue.location ? ` Ubicacion: ${issue.location}.` : ""}</p>
      ${issue.hint ? `<p class="validation-hint">${issue.hint}</p>` : ""}
    `;
    container.append(item);
  });
}

function renderScores() {
  const scores = calculateScores("player");
  $("#competitiveScore").textContent = scores.competitive.toFixed(1);
  $("#casualScore").textContent = scores.casual.toFixed(1);
  $("#narrativeScore").textContent = scores.narrative.toFixed(1);
  $("#scoreSummary").textContent = buildScoreSummary(scores);
  renderScoreBreakdown(scores);
}

function renderTips() {
  const tips = $("#tips");
  tips.replaceChildren();
  getTips().forEach((tip) => {
    const item = document.createElement("li");
    if (typeof tip === "string") {
      item.textContent = tip;
    } else {
      const title = document.createElement("strong");
      title.textContent = tip.title;
      const body = document.createElement("p");
      body.textContent = tip.body;
      item.append(title, body);
    }
    tips.append(item);
  });
}

function renderChangeRecommendations() {
  const container = $("#changeRecommendations");
  if (!container) return;
  container.replaceChildren();
  if (!state.roster.length) {
    container.append(emptyMini("Agrega o importa tu lista para ver cambios concretos: que sumar, que retirar y por que."));
    return;
  }
  const items = buildChangeRecommendations();
  if (!items.length) {
    container.append(emptyMini("No veo cambios urgentes. La lista tiene roles principales cubiertos; revisa ajustes finos por mision y rival."));
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = `change-recommendation-card ${item.kind || "note"}`;
    card.innerHTML = `
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
      ${item.impact ? `<em>${escapeHtml(item.impact)}</em>` : ""}
    `;
    container.append(card);
  });
}

function buildChangeRecommendations() {
  const context = autoPickContext("player", state.roster);
  const items = [];
  const additions = totalPoints(state.roster) < state.gameSize
    ? bestAutoPickAdditions("player", state.roster).slice(0, 4)
    : [];
  const cuts = cutRecommendationCandidates(context).slice(0, 3);

  additions.forEach((unitData, index) => {
    const rosterAfter = [...state.roster, ...additions.slice(0, index + 1)];
    const explanation = buildRecommendationExplanation(unitData, context, rosterAfter);
    const reasons = explanation.reasons?.slice(0, 2).join(" ") || explanation.summary;
    const usage = explanation.usage?.[0] ? ` Uso: ${explanation.usage[0]}` : "";
    items.push({
      kind: "add",
      type: "Agregar",
      title: `${unitData.name} (${unitData.points} pts)`,
      body: `${reasons}${usage}`,
      impact: changeImpactText(unitData, state.roster, context),
    });
  });

  cuts.forEach((cut) => {
    const afterCut = state.roster.filter((unitData) => unitData !== cut.unitData);
    const gaps = missingNeedLabels(rosterStructure(afterCut), context).slice(0, 2);
    items.push({
      kind: "cut",
      type: "Quitar o reducir",
      title: `${cut.unitData.name} (${unitTotalPoints(cut.unitData)} pts)`,
      body: `${cut.reasons.join("; ")}.`,
      impact: `Al retirarla, usa esos puntos para ${gaps.join(" o ") || "una pieza con tarea mas clara dentro del plan"}.`,
    });
  });

  suggestedSwapRecommendations(additions, cuts, context).forEach((item) => items.push(item));
  return items.slice(0, 8);
}

function changeImpactText(unitData, roster, context) {
  const before = rosterStructure(roster);
  const after = rosterStructure([...roster, unitData]);
  const improved = Object.entries(context.minimums || {})
    .filter(([need, target]) => (before[need] || 0) < target && (after[need] || 0) > (before[need] || 0))
    .map(([need]) => missingNeedLabels({ [need]: 0 }, { minimums: { [need]: 1 } })[0])
    .filter(Boolean);
  const roles = unitRoleScores(unitData).filter((score) => score.value >= 7).sort((a, b) => b.value - a.value).slice(0, 2).map((score) => score.label.toLowerCase());
  if (improved.length) return `Impacto principal: cubre ${[...new Set(improved)].join(", ")}. Roles fuertes: ${roles.join(", ") || "utilidad de lista"}.`;
  return `Impacto principal: sube ${roles.join(", ") || "coherencia"} para el plan ${archetypeDisplayName(context.playstyle)}.`;
}

function suggestedSwapRecommendations(additions, cuts, context) {
  if (!additions.length || !cuts.length) return [];
  const available = state.gameSize - totalPoints(state.roster);
  return cuts.slice(0, 2).flatMap((cut) => {
    const candidate = additions.find((unitData) => unitData.points <= unitTotalPoints(cut.unitData) + available + 5);
    if (!candidate) return [];
    const need = structuralNeedLabels(candidate, context).slice(0, 2).join(" y ") || "un rol mas claro";
    return [{
      kind: "swap",
      type: "Cambio directo",
      title: `${cut.unitData.name} -> ${candidate.name}`,
      body: `Tiene sentido si necesitas liberar puntos o foco: ${cut.unitData.name} esta marcado por ${cut.reasons[0]}, mientras ${candidate.name} aporta ${need}.`,
      impact: `No es una orden automatica: revisa puntos exactos y si pierdes una unidad clave para secundaria antes de confirmar el cambio.`,
    }];
  });
}

function renderComparison() {
  const container = $("#profileCompare");
  const player = armyProfile(state.roster);
  const enemy = armyProfile(state.enemyRoster);
  container.replaceChildren();

  metrics.forEach(([key, label]) => {
    const playerValue = Math.round(player[key]);
    const enemyValue = Math.round(enemy[key]);
    const row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML = `
      <strong>${label}</strong>
      <div class="metric-bar">
        <span style="--value: ${playerValue}%"></span>
        <span class="enemy" style="--value: ${enemyValue}%"></span>
      </div>
      <small>${playerValue}/${enemyValue}</small>
    `;
    container.append(row);
  });

  if (state.enemyRoster.length) {
    matchupBreakdown(player, enemy)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 4)
      .forEach((factor) => {
        const row = document.createElement("div");
        row.className = "metric-row matchup-factor";
        row.innerHTML = `
          <strong>${escapeHtml(factor.label)}</strong>
          <div class="metric-bar matchup-edge">
            <span style="--value: ${Math.max(0, 50 + factor.value * 5)}%"></span>
            <span class="enemy" style="--value: ${Math.max(0, 50 - factor.value * 5)}%"></span>
          </div>
          <small>${signedDecimal(factor.value)}</small>
          <em>${escapeHtml(factor.note)}</em>
        `;
        container.append(row);
      });
  }
}

function savePendingMatchDraft() {
  const textarea = $("#matchReportPaste");
  const text = textarea.value.trim();
  let report = cloneData(state.pendingMatchDraft || createMatchDraftFromText(text));
  if (!text && !state.pendingMatchImageData && !state.pendingMatchDraft) {
    return setMatchReportStatus("Pega o sube una imagen del reporte para preparar la partida.");
  }
  if (text && text !== (report.raw || "")) {
    const rebuilt = createMatchDraftFromText(text);
    report = { ...report, ...rebuilt, id: report.id || rebuilt.id, createdAt: report.createdAt || rebuilt.createdAt, image: report.image || rebuilt.image };
  }
  report.raw = text.slice(0, 5000);
  report.image = state.pendingMatchImageData || report.image || "";
  report.playerList = selectedMatchListSnapshot("player");
  report.enemyList = selectedMatchListSnapshot("enemy");
  report.rulesEdition = state.rulesEdition;
  report.enemyStyle = inferMatchListStyle(report.enemyList) || report.enemyStyle || "";
  report.opponentFaction = report.opponentFaction || report.enemyList?.faction || "";
  report.updatedAt = new Date().toISOString();
  if (state.editingMatchId) {
    report.id = state.editingMatchId;
    const index = state.matchHistory.findIndex((item) => item.id === state.editingMatchId);
    if (index >= 0) state.matchHistory[index] = report;
    state.editingMatchId = null;
  } else {
    state.matchHistory = [report, ...state.matchHistory].slice(0, 200);
  }
  persistMatchHistory();
  textarea.value = "";
  state.pendingMatchImageData = null;
  state.pendingMatchDraft = null;
  state.pendingMatchEnemyList = null;
  $("#matchEnemyListPaste").value = "";
  setMatchEnemyListStatus("");
  renderMatchImagePreview();
  setMatchReportStatus(`Partida guardada: ${matchScoreText(report)}. Listas vinculadas: ${report.playerList?.name || "sin lista"} vs ${report.enemyList?.name || "sin lista"}.`);
  render();
}

async function handleMatchImagePaste(event) {
  const file = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith("image/"));
  if (!file) return;
  event.preventDefault();
  await handleMatchImage(file);
}

async function handleMatchImageDrop(event) {
  event.preventDefault();
  $("#matchImageDrop").classList.remove("dragging");
  const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith("image/"));
  if (file) await handleMatchImage(file);
}

async function handleMatchImage(file) {
  try {
    setMatchReportStatus("Leyendo imagen con OCR...");
    state.pendingMatchEnemyList = null;
    $("#matchEnemyListPaste").value = "";
    setMatchEnemyListStatus("");
    state.pendingMatchImageData = await imageFileToDataUrl(file, 900);
    renderMatchImagePreview();
    const text = await extractTextFromMatchImage(file);
    const normalized = normalizeOcrReportText(text);
    $("#matchReportPaste").value = normalized;
    state.pendingMatchDraft = createMatchDraftFromText(normalized);
    state.pendingMatchDraft.image = state.pendingMatchImageData;
    renderMatchListSelectors();
    renderMatchDraftSummary();
    setMatchReportStatus(state.pendingMatchDraft.partial
      ? "OCR parcial: guarde lo que pude leer. Elige las listas usadas y pulsa Guardar en memoria."
      : "Imagen leida. Elige las listas usadas y pulsa Guardar en memoria.");
  } catch (error) {
    state.pendingMatchDraft = createMatchDraftFromText("");
    state.pendingMatchDraft.image = state.pendingMatchImageData || "";
    renderMatchListSelectors();
    renderMatchDraftSummary();
    setMatchReportStatus(`No pude leer todo el texto (${error.message}), pero conserve la imagen. Elige las listas usadas y pulsa Guardar en memoria.`);
  }
}

function renderMatchImagePreview() {
  const container = $("#matchImagePreview");
  if (!container) return;
  container.replaceChildren();
  container.classList.toggle("hidden", !state.pendingMatchImageData);
  if (!state.pendingMatchImageData) return;
  const img = document.createElement("img");
  img.alt = "Vista previa del reporte";
  img.src = state.pendingMatchImageData;
  container.append(img);
}

function renderMatchDraftSummary() {
  const container = $("#matchDraftSummary");
  if (!container) return;
  const draft = state.pendingMatchDraft;
  container.replaceChildren();
  container.classList.toggle("hidden", !draft);
  if (!draft) return;
  const playerList = selectedMatchListSnapshot("player");
  const enemyList = selectedMatchListSnapshot("enemy");
  const detected = [
    draft.date ? `Fecha: ${draft.date}` : "",
    draft.mission ? `Mision: ${missionDisplayName(draft.mission)}` : "",
    draft.deployment ? `Deployment: ${deploymentDisplayName(draft.deployment)}` : "",
    draft.playerSecondaries?.length ? `Tus secundarias: ${draft.playerSecondaries.join(", ")}` : "",
    draft.opponentSecondaries?.length ? `Secundarias rival: ${draft.opponentSecondaries.join(", ")}` : "",
  ].filter(Boolean);
  container.innerHTML = `
    <strong>${escapeHtml(matchScoreText(draft))}</strong>
    <p>${draft.partial ? "Lectura parcial: se guardara lo detectado y la imagen original." : "Lectura completa lista para guardar."}</p>
    <p>${escapeHtml(detected.join(" | ") || "Sin datos tacticos detectados todavia.")}</p>
    <p>Listas a vincular: ${escapeHtml(playerList.name || "sin lista")} vs ${escapeHtml(enemyList.name || "sin lista")}.</p>
  `;
}

function renderMatchListSelectors() {
  const playerSelect = $("#matchPlayerListSelect");
  const enemySelect = $("#matchEnemyListSelect");
  if (!playerSelect || !enemySelect) return;
  const previousPlayer = playerSelect.value || (state.pendingMatchDraft?.playerList?.units?.length ? "draft:player" : "currentPlayer");
  const previousEnemy = enemySelect.value || (state.pendingMatchDraft?.enemyList?.units?.length ? "draft:enemy" : "currentEnemy");
  const playerOptions = matchListOptions("player");
  const enemyOptions = matchListOptions("enemy");
  fillMatchListSelect(playerSelect, playerOptions, previousPlayer);
  fillMatchListSelect(enemySelect, enemyOptions, previousEnemy);
}

function parseMatchEnemyListDraft() {
  const textarea = $("#matchEnemyListPaste");
  const text = textarea.value.trim();
  if (!text) return setMatchEnemyListStatus("Pega la lista rival para esta partida.");
  let meta = detectRosterMeta(text, state.enemyFaction);
  const parsed = parseRosterTextWithFactionFallback(text, meta.faction || state.enemyFaction);
  if (parsed.faction && (!meta.faction || parsed.faction.id !== meta.faction.id)) {
    meta = {
      faction: parsed.faction,
      detachment: findDetachmentMention(text, parsed.faction) || parsed.faction.detachments[0],
    };
  }
  const faction = meta.faction || parsed.faction || state.enemyFaction;
  const detachment = meta.detachment || faction?.detachments?.[0] || null;
  if (!faction) return setMatchEnemyListStatus("No pude detectar una faccion rival para esa lista.");
  const result = { ...parsed.result, meta: { faction, detachment } };
  const previousEnemyFaction = state.enemyFaction;
  const previousEnemyDetachment = state.enemyDetachment;
  state.enemyFaction = faction;
  state.enemyDetachment = detachment || faction.detachments[0];
  result.units.forEach((unitData) => resolveImportedEnhancement("enemy", unitData));
  state.enemyFaction = previousEnemyFaction;
  state.enemyDetachment = previousEnemyDetachment;
  state.pendingMatchEnemyList = {
    name: reportListNameFromText(text, "Lista rival importada"),
    faction: faction.name,
    detachment: detachment?.name || "",
    detachmentLoadout: detachment?.name || "",
    detachmentPoints: detachment ? detachmentPointCost(detachment) : 0,
    points: totalPoints(result.units),
    units: cloneData(result.units),
    raw: text.slice(0, 5000),
  };
  if (!state.pendingMatchDraft) state.pendingMatchDraft = createMatchDraftFromText($("#matchReportPaste").value || "");
  state.pendingMatchDraft.enemyList = cloneData(state.pendingMatchEnemyList);
  state.pendingMatchDraft.opponentFaction = state.pendingMatchDraft.opponentFaction || faction.name;
  state.pendingMatchDraft.opponentDetachment = state.pendingMatchDraft.opponentDetachment || detachment?.name || "";
  renderMatchListSelectors();
  $("#matchEnemyListSelect").value = "importedEnemy";
  renderMatchDraftSummary();
  setMatchEnemyListStatus(`Lista rival vinculada: ${result.units.length} unidades, ${totalPoints(result.units)} pts. No se guardo en biblioteca.`);
}

function reportListNameFromText(text, fallback) {
  const firstUseful = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !/^\+{3,}|^(characters|battleline|other datasheets|dedicated transports|allied units|legends)$/i.test(line));
  return firstUseful?.replace(/\(\s*\d+\s*points?\s*\)/i, "").trim().slice(0, 80) || fallback;
}

function setMatchEnemyListStatus(text) {
  const status = $("#matchEnemyListStatus");
  if (status) status.textContent = text;
}

function fillMatchListSelect(select, options, previousValue) {
  select.replaceChildren();
  options.forEach((option) => select.append(new Option(option.label, option.value)));
  const fallback = options.find((option) => option.value !== "none")?.value || "none";
  select.value = options.some((option) => option.value === previousValue) ? previousValue : fallback;
}

function matchListOptions(side) {
  const options = [{ value: "none", label: "Sin lista vinculada" }];
  const draftList = side === "enemy" ? state.pendingMatchDraft?.enemyList : state.pendingMatchDraft?.playerList;
  if (side === "enemy" && state.pendingMatchEnemyList?.units?.length) {
    options.push({ value: "importedEnemy", label: `${state.pendingMatchEnemyList.name || "Lista rival importada"} - ${state.pendingMatchEnemyList.faction || "Rival"} - ${state.pendingMatchEnemyList.points || totalPoints(state.pendingMatchEnemyList.units)} pts` });
  }
  if (draftList?.units?.length) {
    options.push({ value: `draft:${side}`, label: `${draftList.name || "Lista ya vinculada"} - ${draftList.faction || "Faccion"} - ${draftList.points || totalPoints(draftList.units)} pts` });
  }
  if (state.roster.length) options.push({ value: "currentPlayer", label: `Editor actual - tu lista - ${totalPoints(state.roster)} pts` });
  if (state.enemyRoster.length) options.push({ value: "currentEnemy", label: `Editor actual - rival - ${totalPoints(state.enemyRoster)} pts` });
  state.savedLists.forEach((list) => {
    if (list.roster?.length) {
      const faction = findFaction(list.factionId)?.name || "Faccion";
      options.push({ value: `saved:${list.id}:player`, label: `${list.name || defaultListName} - ${faction} - ${totalPoints(list.roster)} pts` });
    }
    if (list.enemyRoster?.length) {
      const faction = findFaction(list.enemyFactionId)?.name || "Rival";
      options.push({ value: `saved:${list.id}:enemy`, label: `${list.name || defaultListName} (rival guardada) - ${faction} - ${totalPoints(list.enemyRoster)} pts` });
    }
  });
  if (side === "enemy") {
    options.sort((a, b) => Number(b.value === "currentEnemy") - Number(a.value === "currentEnemy"));
  }
  return options;
}

function selectedMatchListSnapshot(side) {
  const select = $(side === "enemy" ? "#matchEnemyListSelect" : "#matchPlayerListSelect");
  const value = select?.value || "none";
  if (value === "currentPlayer") return captureMatchList("player");
  if (value === "currentEnemy") return captureMatchList("enemy");
  if (value === "importedEnemy" && state.pendingMatchEnemyList?.units?.length) return cloneData(state.pendingMatchEnemyList);
  if (value.startsWith("draft:")) {
    const draftList = side === "enemy" ? state.pendingMatchDraft?.enemyList : state.pendingMatchDraft?.playerList;
    if (draftList?.units?.length) return cloneData(draftList);
  }
  if (value.startsWith("saved:")) {
    const [, id, slot] = value.split(":");
    const document = state.savedLists.find((list) => list.id === id);
    if (document) return savedDocumentMatchSnapshot(document, slot);
  }
  return { name: "", faction: "", detachment: "", points: 0, units: [] };
}

function savedDocumentMatchSnapshot(document, slot = "player") {
  const enemySlot = slot === "enemy";
  const faction = findFaction(enemySlot ? document.enemyFactionId : document.factionId);
  const detachmentId = enemySlot ? document.enemyDetachmentId : document.detachmentId;
  const detachment = faction?.detachments.find((item) => item.id === detachmentId);
  const loadoutIds = enemySlot ? document.enemyDetachmentLoadoutIds : document.detachmentLoadoutIds;
  const loadout = (Array.isArray(loadoutIds) ? loadoutIds : [detachmentId])
    .map((id) => faction?.detachments.find((item) => item.id === id))
    .filter(Boolean);
  const units = cloneData(enemySlot ? document.enemyRoster || [] : document.roster || []);
  return {
    name: `${document.name || defaultListName}${enemySlot ? " (rival)" : ""}`,
    faction: faction?.name || "",
    detachment: detachment?.name || "",
    detachmentLoadout: loadout.map((item) => item.name).join(" + "),
    detachmentPoints: loadout.reduce((sum, item) => sum + detachmentPointCost(item), 0),
    points: totalPoints(units),
    units,
  };
}

async function imageFileToDataUrl(file, maxWidth = 900) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function extractTextFromMatchImage(file) {
  const candidates = [];
  if ("TextDetector" in window) {
    try {
      const detector = new window.TextDetector();
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      if (results?.length) {
        candidates.push(results
          .sort((a, b) => (a.boundingBox?.y || a.boundingBox?.top || 0) - (b.boundingBox?.y || b.boundingBox?.top || 0) || (a.boundingBox?.x || a.boundingBox?.left || 0) - (b.boundingBox?.x || b.boundingBox?.left || 0))
          .map((item) => item.rawValue || "")
          .filter(Boolean)
          .join("\n"));
      }
    } catch (error) {
      console.warn("Native OCR failed, falling back to Tesseract.", error);
    }
  }
  try {
    await loadTesseract();
    const variants = await createOcrImageVariants(file);
    for (const [index, variant] of variants.entries()) {
      setMatchReportStatus(`Leyendo imagen con OCR... intento ${index + 1}/${variants.length}`);
      const result = await window.Tesseract.recognize(variant.source, "eng", {
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "6",
        logger: (message) => {
          if (message.status === "recognizing text" && Number.isFinite(message.progress)) {
            setMatchReportStatus(`Leyendo imagen con OCR... intento ${index + 1}/${variants.length} ${Math.round(message.progress * 100)}%`);
          }
        },
      });
      candidates.push(result?.data?.text || "");
      const best = bestOcrCandidate(candidates);
      if (best.quality >= 26 && extractReportScore(best.text) && ocrSectionQuality(best.text) >= 2) break;
    }
  } catch (error) {
    if (!candidates.length) throw error;
    console.warn("Tesseract OCR failed, using native OCR candidate.", error);
  }
  return bestOcrCandidate(candidates).text;
}

async function createOcrImageVariants(file) {
  const variants = [{ name: "original", source: file }];
  variants.push({ name: "scaled", source: await preprocessOcrImage(file, "scaled") });
  variants.push({ name: "contrast", source: await preprocessOcrImage(file, "contrast") });
  variants.push({ name: "threshold", source: await preprocessOcrImage(file, "threshold") });
  variants.push({ name: "invert", source: await preprocessOcrImage(file, "invert") });
  variants.push({ name: "score-top", source: await preprocessOcrImage(file, "score-top") });
  variants.push({ name: "score-threshold", source: await preprocessOcrImage(file, "score-threshold") });
  variants.push({ name: "left-column", source: await preprocessOcrImage(file, "left-column") });
  variants.push({ name: "right-column", source: await preprocessOcrImage(file, "right-column") });
  return variants;
}

async function preprocessOcrImage(file, mode) {
  const bitmap = await createImageBitmap(file);
  const crop = ocrCropForMode(bitmap, mode);
  const scale = Math.min(2.8, Math.max(1.35, 1500 / Math.max(1, crop.sw)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.sw * scale));
  canvas.height = Math.max(1, Math.round(crop.sh * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  if (["contrast", "score-top", "threshold", "score-threshold", "invert", "left-column", "right-column"].includes(mode)) {
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const gray = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114;
      let boosted = gray > 150 ? Math.min(255, gray * 1.2 + 18) : Math.max(0, gray * 0.7 - 14);
      if (["threshold", "score-threshold"].includes(mode)) boosted = gray > 118 ? 255 : 0;
      if (mode === "invert") boosted = 255 - boosted;
      image.data[index] = boosted;
      image.data[index + 1] = boosted;
      image.data[index + 2] = boosted;
    }
    context.putImageData(image, 0, 0);
  }
  return canvas.toDataURL("image/png");
}

function ocrCropForMode(bitmap, mode) {
  const width = bitmap.width;
  const height = bitmap.height;
  if (["score-top", "score-threshold"].includes(mode)) return { sx: 0, sy: 0, sw: width, sh: Math.max(1, height * 0.34) };
  if (mode === "left-column") return { sx: 0, sy: height * 0.12, sw: width * 0.62, sh: height * 0.8 };
  if (mode === "right-column") return { sx: width * 0.38, sy: height * 0.12, sw: width * 0.62, sh: height * 0.8 };
  return { sx: 0, sy: 0, sw: width, sh: height };
}

function bestOcrCandidate(candidates) {
  const ranked = candidates
    .map((text) => ({ text, quality: ocrTextQuality(text) }))
    .sort((a, b) => b.quality - a.quality || b.text.length - a.text.length);
  const best = ranked[0] || { text: "", quality: 0 };
  const bestHasScore = Boolean(extractReportScore(best.text));
  const scoreBest = ranked.find((candidate) => extractReportScore(candidate.text));
  const sectionBest = ranked.find((candidate) => ocrSectionQuality(candidate.text) >= 2);
  if ((scoreBest && !bestHasScore) || (sectionBest && sectionBest.text !== best.text)) {
    return {
      text: [scoreBest?.text, sectionBest?.text, best.text].filter(Boolean).join("\n"),
      quality: best.quality + Math.min(6, (scoreBest?.quality || 0) / 3) + Math.min(3, (sectionBest?.quality || 0) / 5),
    };
  }
  return best;
}

function ocrTextQuality(text = "") {
  const normalized = normalizeOcrReportText(text);
  let score = 0;
  const reportScore = extractReportScore(normalized);
  if (reportScore) score += 6 + Math.max(0, Math.min(4, reportScore.quality / 3));
  if (detectKnownMission(normalized)) score += 4;
  if (detectKnownDeployment(normalized)) score += 3;
  score += Math.min(6, extractSecondaries(normalized).length);
  score += Math.min(6, ocrSectionQuality(normalized) * 2);
  score += Math.min(3, (normalized.match(/\b(?:battle ready|cp remaining|went first|went second)\b/gi) || []).length);
  score += Math.min(4, normalized.split(/\r?\n/).filter(Boolean).length / 8);
  return score;
}

function ocrSectionQuality(text = "") {
  const normalized = normalizeOcrReportText(text);
  return [50, 40, 10].reduce((sum, total) => sum + (extractScoreBeforeTotal(normalized, total) ? 1 : 0), 0);
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-tesseract]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Tesseract OCR.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.dataset.tesseract = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar Tesseract OCR. Revisa tu conexion o habilita internet para OCR."));
    document.head.append(script);
  });
}

function normalizeOcrReportText(text = "") {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/(\d)\s*[_~=:]\s*(\d)/g, "$1-$2")
    .replace(/\b([Vv])\s*1\s*([CcTt])\s*([Oo0])\s*([Rr])\s*([Yy])\b/g, "VICTORY")
    .replace(/\bV1CTORY\b/gi, "VICTORY")
    .replace(/\bScorched\s+Earth\b/gi, "Scorched Earth")
    .replace(/\bPurge\s+The\s+Foe\b/gi, "Purge The Foe")
    .split(/\r?\n/)
    .map((line) => normalizeOcrScoreLine(line.replace(/[ \t]{2,}/g, " ").trim()))
    .filter(Boolean)
    .join("\n");
}

function normalizeOcrScoreLine(line = "") {
  return String(line || "")
    .replace(/(\d)\s*[-_~=:]\s*(\d)/g, "$1-$2")
    .replace(/\b([0-9OoIlSBg])\s+([0-9OoIlSBg])\s*-\s*([0-9OoIlSBg])\s+([0-9OoIlSBg])\b/g, "$1$2-$3$4")
    .replace(/\b([0-9OoIlSBg])\s+([0-9OoIlSBg])\s+[-_~=:]\s+([0-9OoIlSBg])\s+([0-9OoIlSBg])\b/g, "$1$2-$3$4");
}

function normalizeOcrReportText(text = "") {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/(\d)\s*[-_~=:]\s*(\d)/g, "$1-$2")
    .replace(/([0-9OoIlSBg])\s*[/\\]\s*([145SIl]\s*[0Oo])/g, "$1/$2")
    .replace(/([0-9OoIlSBg])\s+([0-9OoIlSBg])\s*[/\\]\s*([145SIl]\s*[0Oo])/g, "$1$2/$3")
    .replace(/\b([Vv])\s*1\s*([CcTt])\s*([Oo0])\s*([Rr])\s*([Yy])\b/g, "VICTORY")
    .replace(/\bV1CTORY\b/gi, "VICTORY")
    .replace(/\bDEFE4T\b/gi, "DEFEAT")
    .replace(/\bDR4W\b/gi, "DRAW")
    .replace(/\bScorched\s+Earth\b/gi, "Scorched Earth")
    .replace(/\bPurge\s+The\s+Foe\b/gi, "Purge The Foe")
    .split(/\r?\n/)
    .map((line) => normalizeOcrScoreLine(line.replace(/[ \t]{2,}/g, " ").trim()))
    .filter(Boolean)
    .join("\n");
}

function normalizeOcrScoreLine(line = "") {
  return String(line || "")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/(\d)\s*[-_~=:]\s*(\d)/g, "$1-$2")
    .replace(/([0-9OoIlSBg])\s*[_~=:]\s*([0-9OoIlSBg])/g, "$1-$2")
    .replace(/([0-9OoIlSBg])\s+([0-9OoIlSBg])\s*\/\s*([145SIl]\s*[0Oo])/g, "$1$2/$3")
    .replace(/\b([0-9OoIlSBg])\s+([0-9OoIlSBg])\s*-\s*([0-9OoIlSBg])\s+([0-9OoIlSBg])\b/g, "$1$2-$3$4")
    .replace(/\b([0-9OoIlSBg])\s+([0-9OoIlSBg])\s+[-_~=:]\s+([0-9OoIlSBg])\s+([0-9OoIlSBg])\b/g, "$1$2-$3$4");
}

function extractReportScore(linesOrText) {
  const lines = Array.isArray(linesOrText)
    ? linesOrText
    : normalizeOcrReportText(linesOrText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = [];
  lines.forEach((line, index) => {
    candidates.push(...scoreCandidatesFromLine(line, index, line));
    const joinedNext = `${line} ${lines[index + 1] || ""}`.trim();
    if (joinedNext !== line) candidates.push(...scoreCandidatesFromLine(joinedNext, index, line));
    const joinedPrev = `${lines[index - 1] || ""} ${line}`.trim();
    if (joinedPrev !== line) candidates.push(...scoreCandidatesFromLine(joinedPrev, index, line));
  });
  return candidates
    .filter((candidate) => Number.isFinite(candidate.playerScore) && Number.isFinite(candidate.opponentScore))
    .filter((candidate) => candidate.playerScore >= 0 && candidate.playerScore <= 100 && candidate.opponentScore >= 0 && candidate.opponentScore <= 100)
    .filter((candidate) => candidate.playerScore + candidate.opponentScore >= 20)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)[0] || null;
}

function scoreCandidatesFromLine(line, index, originalLine) {
  const clean = normalizeOcrScoreLine(line);
  if (!clean || ocrLineLooksLikeDate(clean) || /\/\s*(?:40|50|10)\b/.test(clean)) return [];
  const candidates = [];
  const scoreNumber = "([0-9OoIlSBg][0-9OoIlSBg\\s,.]{0,5})";
  const separated = new RegExp(`${scoreNumber}\\s*[-_~=:]\\s*${scoreNumber}`, "g");
  let match;
  while ((match = separated.exec(clean))) {
    const playerScore = parseOcrScoreNumber(match[1]);
    const opponentScore = parseOcrScoreNumber(match[2]);
    candidates.push(makeScoreCandidate({ playerScore, opponentScore, index, line: originalLine || line, raw: match[0] }));
  }

  if (/victory|defeat|draw/i.test(clean) || index <= 8) {
    const compact = clean.replace(/\b([0-9OoIlSBg])\s+([0-9OoIlSBg])\b/g, "$1$2");
    const numbers = [...compact.matchAll(/\b[0-9OoIlSBg][0-9OoIlSBg,.]{1,3}\b/g)]
      .map((item) => ({ raw: item[0], value: parseOcrScoreNumber(item[0]) }))
      .filter((item) => Number.isFinite(item.value) && item.value >= 0 && item.value <= 100);
    for (let i = 0; i < numbers.length - 1; i += 1) {
      candidates.push(makeScoreCandidate({ playerScore: numbers[i].value, opponentScore: numbers[i + 1].value, index, line: originalLine || line, raw: `${numbers[i].raw} ${numbers[i + 1].raw}` }));
    }
  }
  return candidates.filter((candidate) => candidate.quality > -4);
}

function makeScoreCandidate(candidate) {
  let quality = 0;
  const line = String(candidate.line || "");
  if (/victory|defeat|draw/i.test(line)) quality += 7;
  if (candidate.index <= 8) quality += 4;
  if (candidate.index <= 4) quality += 2;
  if (/\b\d{1,3}\s*[-]\s*\d{1,3}\b/.test(normalizeOcrScoreLine(line))) quality += 3;
  if (/\/\s*(?:40|50|10)\b/.test(line)) quality -= 8;
  if (/battle ready|cp remaining|warhammer|mission deck|created with/i.test(line)) quality -= 6;
  if (Math.max(candidate.playerScore, candidate.opponentScore) > 45) quality += 2;
  if (Math.abs(candidate.playerScore - candidate.opponentScore) <= 50) quality += 1;
  return { ...candidate, quality };
}

function parseOcrScoreNumber(value = "") {
  let text = String(value || "")
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/[gq]/g, "9")
    .replace(/\s+/g, "")
    .trim();
  if (/^0[,.]$/.test(text)) return 9;
  if (/^[0-9]0[,.]$/.test(text)) return Number(`${text[0]}9`);
  if (/^[0-9][,.]0$/.test(text)) return Number(text[0]);
  if (/^[0-9][,.]$/.test(text)) text = text.replace(/[,.]/g, "");
  text = text.replace(/[^0-9]/g, "");
  if (text.length > 3) text = text.slice(0, 3);
  return text ? Number(text) : NaN;
}

function ocrLineLooksLikeDate(line = "") {
  return /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|abr|ago|dic)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i.test(line);
}

function createMatchDraftFromText(text = "") {
  const normalized = normalizeOcrReportText(text);
  const parsed = parseMatchReport(normalized);
  if (parsed) return { ...parsed, scoreKnown: true, partial: false };
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const compact = lines.join("\n");
  const score = extractReportScore(lines);
  const scoreIndex = score?.index ?? -1;
  const scoreLine = lines[scoreIndex] || "";
  const inlineScore = scoreLine.match(/^\s*([A-Za-z\u00C0-\u00FF' .-]{2,}?)\s+(\d{1,3})\s*[-\u2013]\s*(\d{1,3})\s+([A-Za-z\u00C0-\u00FF' .-]{2,})\s*$/);
  const playerScore = score ? score.playerScore : 0;
  const opponentScore = score ? score.opponentScore : 0;
  const playerName = cleanReportName(inlineScore?.[1] || lines[Math.max(0, scoreIndex - 1)] || "Jugador");
  const opponentName = cleanReportName(inlineScore?.[4] || lines[scoreIndex + 1] || "Rival");
  const playerBlock = lines.length ? reportPlayerBlock(lines, playerName, opponentName, true) : { text: compact, wentFirst: null };
  const opponentBlock = lines.length ? reportPlayerBlock(lines, playerName, opponentName, false) : { text: compact, wentFirst: null };
  const result = score ? playerScore > opponentScore ? "win" : playerScore < opponentScore ? "loss" : "draw" : "unknown";
  return {
    id: makeListId(),
    createdAt: new Date().toISOString(),
    date: lines.find((line) => /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i.test(line)) || "",
    playerName,
    opponentName,
    playerFaction: detectReportFaction(playerBlock.text) || detectReportFaction(compact, true),
    opponentFaction: detectReportFaction(opponentBlock.text) || detectReportFaction(compact, false),
    playerDetachment: detectReportDetachment(playerBlock.text),
    opponentDetachment: detectReportDetachment(opponentBlock.text),
    playerScore,
    opponentScore,
    scoreKnown: Boolean(score),
    rulesEdition: state.rulesEdition,
    result,
    playerWentFirst: playerBlock.wentFirst,
    opponentWentFirst: opponentBlock.wentFirst,
    mission: detectKnownMission(compact),
    deployment: detectKnownDeployment(compact),
    playerPrimary: extractSectionScore(playerBlock.text, 50),
    opponentPrimary: extractSectionScore(opponentBlock.text, 50),
    playerSecondary: extractSectionScore(playerBlock.text, 40),
    opponentSecondary: extractSectionScore(opponentBlock.text, 40),
    playerPrimaryTurns: extractTurnScores(playerBlock.text, 50),
    opponentPrimaryTurns: extractTurnScores(opponentBlock.text, 50),
    playerSecondaryTurns: extractTurnScores(playerBlock.text, 40),
    opponentSecondaryTurns: extractTurnScores(opponentBlock.text, 40),
    playerBattleReady: extractBattleReady(playerBlock.text),
    opponentBattleReady: extractBattleReady(opponentBlock.text),
    playerCpTurns: extractCpTurns(playerBlock.text),
    opponentCpTurns: extractCpTurns(opponentBlock.text),
    playerSecondaries: extractSecondaries(playerBlock.text),
    opponentSecondaries: extractSecondaries(opponentBlock.text),
    playerList: { name: "", faction: "", detachment: "", points: 0, units: [] },
    enemyList: { name: "", faction: "", detachment: "", points: 0, units: [] },
    partial: true,
    raw: normalized.slice(0, 5000),
  };
}

function clearMatchHistory() {
  if (!state.matchHistory.length) return setMatchReportStatus("No hay partidas guardadas.");
  if (!confirm("Borrar todo el historial de partidas?")) return;
  state.matchHistory = [];
  state.editingMatchId = null;
  state.pendingMatchDraft = null;
  state.pendingMatchImageData = null;
  persistMatchHistory();
  setMatchReportStatus("Historial borrado.");
  render();
}

function editMatchHistoryEntry(id) {
  const report = state.matchHistory.find((item) => item.id === id);
  if (!report) return;
  state.editingMatchId = id;
  state.pendingMatchImageData = report.image || null;
  state.pendingMatchDraft = { ...cloneData(report), partial: Boolean(report.partial) };
  state.pendingMatchEnemyList = null;
  $("#matchReportPaste").value = report.raw || matchReportToEditableText(report);
  renderMatchImagePreview();
  renderMatchListSelectors();
  renderMatchDraftSummary();
  setMatchReportStatus("Editando partida. Ajusta listas o reintenta OCR y pulsa Guardar en memoria para reemplazarla.");
  activateWorkspaceTab("memory");
  $("#matchReportPaste").focus();
}

function deleteMatchHistoryEntry(id) {
  const report = state.matchHistory.find((item) => item.id === id);
  if (!report || !confirm(`Borrar partida ${matchScoreText(report)}?`)) return;
  state.matchHistory = state.matchHistory.filter((item) => item.id !== id);
  if (state.editingMatchId === id) {
    state.editingMatchId = null;
    state.pendingMatchDraft = null;
    state.pendingMatchImageData = null;
  }
  if (state.reviewingMatchId === id) state.reviewingMatchId = null;
  persistMatchHistory();
  setMatchReportStatus("Partida retirada del historial.");
  render();
}

function toggleMatchHistoryReview(id) {
  state.reviewingMatchId = state.reviewingMatchId === id ? null : id;
  renderMatchHistoryList();
}

function loadMatchHistoryLists(id) {
  const report = state.matchHistory.find((item) => item.id === id);
  if (!report?.playerList?.units?.length && !report?.enemyList?.units?.length) return setMatchReportStatus("Esta partida no tiene listas guardadas.");
  if (report.playerList?.units?.length) {
    state.roster = restoreSavedRoster(report.playerList.units);
    const faction = factions.find((item) => item.name === report.playerList.faction);
    if (faction) {
      state.faction = faction;
      state.detachment = faction.detachments.find((item) => item.name === report.playerList.detachment) || faction.detachments[0];
    }
  }
  if (report.enemyList?.units?.length) {
    state.enemyRoster = restoreSavedRoster(report.enemyList.units);
    const faction = factions.find((item) => item.name === report.enemyList.faction);
    if (faction) {
      state.enemyFaction = faction;
      state.enemyDetachment = faction.detachments.find((item) => item.name === report.enemyList.detachment) || faction.detachments[0];
    }
  }
  renderDetachments("player");
  renderDetachments("enemy");
  $("#faction").value = state.faction.id;
  $("#enemyFaction").value = state.enemyFaction.id;
  $("#detachment").value = state.detachment.id;
  $("#enemyDetachment").value = state.enemyDetachment.id;
  setMatchReportStatus("Listas de esa partida cargadas en el editor.");
  activateWorkspaceTab("analysis");
  render();
}

function setMatchReportStatus(text) {
  const status = $("#matchReportStatus");
  if (status) status.textContent = text;
}

function renderMatchHistory() {
  renderMatchHistoryStats();
  renderMatchHistoryInsights();
  renderMatchHistoryList();
}

function renderMatchHistoryStats() {
  const container = $("#matchHistoryStats");
  if (!container) return;
  container.replaceChildren();
  const stats = matchHistoryStats();
  const items = [
    ["Record", `${stats.wins}-${stats.losses}-${stats.draws}`],
    ["Win rate", `${stats.winRate}%`],
    ["Diferencial medio", signedNumber(stats.averageDiff)],
    ["Yendo primero", `${stats.firstTurnWinRate}%`],
    ["Primaria media", String(stats.averagePrimary)],
    ["Secundaria media", String(stats.averageSecondary)],
    ["Mejor turno", stats.bestTurn ? `T${stats.bestTurn}` : "-"],
    ["Partidas", String(stats.total)],
  ];
  items.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "history-stat";
    card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    container.append(card);
  });
}

function renderMatchHistoryInsights() {
  const container = $("#matchHistoryInsights");
  if (!container) return;
  container.replaceChildren();
  const insights = matchHistoryInsights();
  if (!insights.length) {
    container.append(emptyMini("Cuando registres partidas, aqui apareceran patrones de misiones, secundarias, turnos y matchups."));
    return;
  }
  insights.forEach((insight) => {
    const item = document.createElement("div");
    item.className = "history-insight";
    item.innerHTML = `<strong>${escapeHtml(insight.title)}</strong><p>${escapeHtml(insight.body)}</p>`;
    container.append(item);
  });
}

function signedNumber(value) {
  return value > 0 ? `+${value}` : String(value);
}

function matchScoreText(report) {
  const player = report?.playerName || "Jugador";
  const opponent = report?.opponentName || "Rival";
  if (report?.scoreKnown === false || report?.result === "unknown") return `${player} vs ${opponent} - marcador no detectado`;
  return `${player} ${Number(report?.playerScore || 0)}-${Number(report?.opponentScore || 0)} ${opponent}`;
}

function deploymentDisplayName(value) {
  return chapterApprovedMissionPool.find((mission) => mission.deployment === value)?.deploymentName || value || "Deployment desconocido";
}

function renderMatchHistoryList() {
  const container = $("#matchHistoryList");
  if (!container) return;
  container.replaceChildren();
  if (!state.matchHistory.length) {
    container.append(emptyMini("Aun no hay partidas registradas. Pega un reporte para empezar a alimentar el analisis."));
    return;
  }
  state.matchHistory.slice(0, 8).forEach((report) => {
    const item = document.createElement("article");
    item.className = `history-entry ${report.result || "unknown"}`;
    const meta = [report.date, report.mission, report.deployment].filter(Boolean).join(" - ");
    const listMeta = [
      report.playerList?.name ? `Tu lista: ${report.playerList.name}` : "",
      report.enemyList?.name ? `Rival: ${report.enemyList.name}` : "",
    ].filter(Boolean).join(" | ");
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(matchScoreText(report))}</strong>
        <p>${escapeHtml(meta || "Partida registrada")}</p>
        <p>${escapeHtml(listMeta || "Sin listas capturadas")}</p>
      </div>
    `;
    if (report.image) {
      const img = document.createElement("img");
      img.className = "history-entry-thumb";
      img.alt = "Reporte guardado";
      img.src = report.image;
      item.prepend(img);
    }
    const side = document.createElement("div");
    side.className = "history-entry-actions";
    const result = document.createElement("span");
    result.textContent = report.result === "win" ? "Victoria" : report.result === "loss" ? "Derrota" : report.result === "draw" ? "Empate" : "Parcial";
    const review = document.createElement("button");
    review.type = "button";
    review.className = "ghost";
    review.textContent = state.reviewingMatchId === report.id ? "Ocultar" : "Revisar";
    review.addEventListener("click", () => toggleMatchHistoryReview(report.id));
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => editMatchHistoryEntry(report.id));
    const load = document.createElement("button");
    load.type = "button";
    load.className = "ghost";
    load.textContent = "Cargar listas";
    load.addEventListener("click", () => loadMatchHistoryLists(report.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost";
    remove.textContent = "Retirar";
    remove.addEventListener("click", () => deleteMatchHistoryEntry(report.id));
    side.append(result, review, edit, load, remove);
    item.append(side);
    if (state.reviewingMatchId === report.id) {
      item.append(renderMatchReviewFeedback(report));
    }
    container.append(item);
  });
}

function renderMatchReviewFeedback(report) {
  const panel = document.createElement("div");
  panel.className = "history-entry-review";
  const items = matchReviewFeedbackItems(report);
  panel.innerHTML = `
    <div class="history-review-title">
      <strong>Feedback de la partida</strong>
      <span>${escapeHtml(matchReviewContextLine(report))}</span>
    </div>
    <div class="history-review-grid">
      ${items.map((item) => `
        <article class="history-review-card ${escapeHtml(item.tone || "neutral")}">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `).join("")}
    </div>
  `;
  return panel;
}

function renderDataPackPanel() {
  const channel = $("#dataPackChannel");
  const manifest = $("#dataPackManifestUrl");
  const autoCheck = $("#dataPackAutoCheck");
  const summary = $("#dataPackSummary");
  const status = $("#dataPackStatus");
  if (!channel || !manifest || !autoCheck || !summary || !status) return;
  channel.value = state.dataPackSettings.channel || "11e-beta";
  manifest.value = state.dataPackSettings.manifestUrl || "";
  autoCheck.checked = Boolean(state.dataPackSettings.autoCheck);
  status.textContent = state.dataPackStatus || "";

  const active = state.dataPackSettings.activePacks?.[state.rulesEdition];
  const installed = Object.entries(state.dataPackSettings.activePacks || {})
    .filter(([edition]) => edition !== state.rulesEdition)
    .map(([edition, pack]) => `${editionProfiles[edition]?.label || edition}: ${pack.version} (${pack.channel})`);
  const activeText = active
    ? `${editionProfiles[state.rulesEdition]?.label || state.rulesEdition}: ${active.version} (${active.channel}) instalado ${formatSavedDate(active.installedAt)}`
    : `${editionProfiles[state.rulesEdition]?.label || state.rulesEdition}: usando datos incluidos en la app`;
  summary.innerHTML = `
    <article><strong>${escapeHtml(activeText)}</strong><span>${escapeHtml(state.dataPackSettings.lastCheckedAt ? `Ultima revision: ${formatSavedDate(state.dataPackSettings.lastCheckedAt)}` : "Sin revision remota todavia")}</span></article>
    ${installed.length ? `<article><strong>Otros paquetes instalados</strong><span>${escapeHtml(installed.join(" | "))}</span></article>` : ""}
    <article><strong>Formato manifest</strong><span>${escapeHtml(`Debe incluir ${dataPackFiles.join(", ")}`)}</span></article>
  `;
}

function updateDataPackSettingsFromControls() {
  state.dataPackSettings = {
    ...state.dataPackSettings,
    channel: $("#dataPackChannel")?.value || "11e-beta",
    manifestUrl: $("#dataPackManifestUrl")?.value.trim() || "",
    autoCheck: Boolean($("#dataPackAutoCheck")?.checked),
  };
  persistDataPackSettings();
  renderDataPackPanel();
}

async function checkDataPackUpdate(options = {}) {
  updateDataPackSettingsFromControls();
  const manifestUrl = state.dataPackSettings.manifestUrl;
  if (!manifestUrl || !/^https?:\/\//i.test(manifestUrl)) {
    if (!options.silent) {
      state.dataPackStatus = "Agrega una URL de manifest remota que empiece con http o https.";
      renderDataPackPanel();
    }
    return;
  }
  state.dataPackStatus = options.silent ? "" : "Buscando actualizaciones de datos...";
  renderDataPackPanel();
  try {
    const manifest = await fetchDataPackManifest(manifestUrl);
    const pack = resolveDataPackFromManifest(manifest, state.dataPackSettings.channel, state.rulesEdition);
    if (!pack) throw new Error(`No encontre paquete para ${state.rulesEdition} / ${state.dataPackSettings.channel}.`);
    const current = state.dataPackSettings.activePacks?.[pack.edition];
    if (current?.version === pack.version) {
      state.dataPackSettings.lastCheckedAt = new Date().toISOString();
      persistDataPackSettings();
      state.dataPackStatus = options.silent ? "" : `Ya tienes instalada la version ${pack.version}.`;
      renderDataPackPanel();
      return;
    }
    await installDataPack(pack, manifestUrl);
    state.dataPackStatus = `Data pack ${pack.version} instalado. Recargando datos...`;
    renderDataPackPanel();
    if (pack.edition === state.rulesEdition) await reloadDataFromActivePack();
    else renderDataPackPanel();
  } catch (error) {
    state.dataPackStatus = `No se pudo actualizar: ${error.message}`;
    renderDataPackPanel();
  }
}

async function fetchDataPackManifest(manifestUrl) {
  const response = await fetch(manifestUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  return response.json();
}

function resolveDataPackFromManifest(manifest, channel, currentEdition) {
  const packs = normalizeDataPackManifest(manifest);
  return packs.find((pack) => pack.channel === channel)
    || packs.find((pack) => pack.edition === currentEdition)
    || null;
}

function normalizeDataPackManifest(manifest) {
  const candidates = [];
  if (Array.isArray(manifest?.packs)) candidates.push(...manifest.packs);
  if (manifest?.channels && typeof manifest.channels === "object") {
    Object.entries(manifest.channels).forEach(([channel, pack]) => candidates.push({ ...pack, channel: pack.channel || channel }));
  }
  if (manifest?.files) candidates.push(manifest);
  return candidates.map((pack) => {
    const channel = pack.channel || inferDataPackChannel(pack.edition);
    return {
      edition: pack.edition || inferEditionFromChannel(channel),
      channel,
      version: String(pack.version || pack.updatedAt || pack.date || "sin-version"),
      files: normalizeDataPackFiles(pack.files || {}),
      notes: pack.notes || "",
    };
  }).filter((pack) => pack.edition && pack.channel && dataPackFiles.every((fileName) => pack.files[fileName]));
}

function normalizeDataPackFiles(files) {
  return Object.fromEntries(Object.entries(files).map(([fileName, value]) => [
    fileName,
    typeof value === "string" ? value : value?.url || value?.href || "",
  ]));
}

function inferEditionFromChannel(channel = "") {
  return String(channel).startsWith("11e") ? "11e" : "10e";
}

function inferDataPackChannel(edition = "10e") {
  return edition === "11e" ? "11e-beta" : "10e-stable";
}

async function installDataPack(pack, manifestUrl) {
  const installedAt = new Date().toISOString();
  for (const fileName of dataPackFiles) {
    const sourceUrl = new URL(pack.files[fileName], manifestUrl).toString();
    state.dataPackStatus = `Descargando ${fileName}...`;
    renderDataPackPanel();
    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`${fileName} HTTP ${response.status}`);
    const body = await response.text();
    JSON.parse(body);
    await writeDataPackRecord(pack.edition, fileName, body, {
      version: pack.version,
      channel: pack.channel,
      sourceUrl,
      installedAt,
    });
  }
  state.dataPackSettings.activePacks = {
    ...(state.dataPackSettings.activePacks || {}),
    [pack.edition]: {
      version: pack.version,
      channel: pack.channel,
      installedAt,
      manifestUrl,
      notes: pack.notes || "",
    },
  };
  state.dataPackSettings.lastCheckedAt = installedAt;
  persistDataPackSettings();
}

async function reloadDataFromActivePack() {
  const previous = {
    factionId: state.faction?.id,
    enemyFactionId: state.enemyFaction?.id,
    detachmentId: state.detachment?.id,
    enemyDetachmentId: state.enemyDetachment?.id,
  };
  try {
    await loadGameData();
    state.faction = findFaction(previous.factionId) || factions[0];
    state.enemyFaction = findFaction(previous.enemyFactionId) || factions[1] || factions[0];
    state.detachment = state.faction?.detachments?.find((detachment) => detachment.id === previous.detachmentId) || state.faction?.detachments?.[0];
    state.enemyDetachment = state.enemyFaction?.detachments?.find((detachment) => detachment.id === previous.enemyDetachmentId) || state.enemyFaction?.detachments?.[0];
    populateFactionSelects();
    populateUserProfileFactionSelect();
    renderDetachments("player");
    renderDetachments("enemy");
    state.dataPackStatus = "Datos recargados correctamente.";
    render();
  } catch (error) {
    state.dataPackStatus = `No se pudieron recargar los datos: ${error.message}`;
    renderDataPackPanel();
  }
}

async function clearActiveDataPack() {
  const edition = state.rulesEdition;
  try {
    await deleteDataPackRecords(edition);
    const activePacks = { ...(state.dataPackSettings.activePacks || {}) };
    delete activePacks[edition];
    state.dataPackSettings.activePacks = activePacks;
    persistDataPackSettings();
    state.dataPackStatus = "Paquete remoto eliminado. Volviendo a datos incluidos...";
    renderDataPackPanel();
    await reloadDataFromActivePack();
  } catch (error) {
    state.dataPackStatus = `No se pudo limpiar el paquete: ${error.message}`;
    renderDataPackPanel();
  }
}

function renderDataVerifier() {
  const factionSelect = $("#dataAuditFaction");
  const severitySelect = $("#dataAuditSeverity");
  const searchInput = $("#dataAuditSearch");
  const summary = $("#dataAuditSummary");
  const list = $("#dataAuditList");
  if (!factionSelect || !severitySelect || !searchInput || !summary || !list) return;

  syncDataAuditControls(factionSelect, severitySelect, searchInput);
  const report = buildDataAuditReport();
  const filtered = filterDataAuditIssues(report.issues);
  renderDataAuditSummary(summary, report, filtered.length);
  renderDataAuditList(list, filtered);
}

function syncDataAuditControls(factionSelect, severitySelect, searchInput) {
  const currentFaction = state.dataAudit.factionId || "all";
  const options = [
    new Option("Todas las facciones", "all"),
    ...factions.map((faction) => new Option(faction.name, faction.id)),
  ];
  const signature = options.map((option) => `${option.value}:${option.text}`).join("|");
  if (factionSelect.dataset.signature !== signature) {
    factionSelect.replaceChildren(...options);
    factionSelect.dataset.signature = signature;
  }
  if (![...factionSelect.options].some((option) => option.value === currentFaction)) {
    state.dataAudit.factionId = "all";
  }
  factionSelect.value = state.dataAudit.factionId;
  severitySelect.value = state.dataAudit.severity || "all";
  if (searchInput.value !== (state.dataAudit.query || "")) searchInput.value = state.dataAudit.query || "";
}

function buildDataAuditReport() {
  const issues = [];
  let unitCount = 0;
  const duplicateMap = new Map();
  factions.forEach((faction) => {
    (faction.units || []).forEach((unitData) => {
      unitCount += 1;
      const key = `${faction.id}:${normalizeName(unitData.name)}`;
      duplicateMap.set(key, [...(duplicateMap.get(key) || []), unitData]);
      issues.push(...dataAuditIssuesForUnit(faction, unitData));
    });
  });

  duplicateMap.forEach((units, key) => {
    if (units.length <= 1) return;
    const faction = factions.find((item) => item.id === key.split(":")[0]);
    issues.push({
      severity: "warn",
      faction: faction?.name || key.split(":")[0],
      unit: units[0].name,
      section: units[0].section || "Other",
      title: "Unidad duplicada",
      message: `Hay ${units.length} entradas con el mismo nombre normalizado en esta faccion.`,
      hint: "Puede ser correcto si son variantes reales, pero conviene revisar si el importador duplico datasheets.",
    });
  });

  return {
    edition: currentEditionProfile().label,
    factionCount: factions.length,
    unitCount,
    issues: issues.sort((a, b) => dataAuditSeverityRank(a.severity) - dataAuditSeverityRank(b.severity) || a.faction.localeCompare(b.faction) || a.unit.localeCompare(b.unit)),
  };
}

function dataAuditIssuesForUnit(faction, unitData) {
  const issues = [];
  const detail = detailByUnitName(unitData.name, faction.id);
  const section = unitData.section || "";
  const normalizedSection = dataAuditCanonicalSection(section);
  const pointValues = [Number(unitData.points || 0), ...Object.values(unitData.pointCosts || {}).map(Number)].filter((value) => Number.isFinite(value));
  const positivePoints = pointValues.filter((value) => value > 0);
  const keywords = new Set((detail?.keywords || []).map((keyword) => normalizeName(keyword)));
  const add = (severity, title, message, hint = "") => {
    issues.push({
      severity,
      faction: faction.name,
      factionId: faction.id,
      unit: unitData.name || "Unidad sin nombre",
      section: section || "Other",
      title,
      message,
      hint,
    });
  };

  if (!unitData.name) add("error", "Nombre faltante", "La entrada no tiene nombre de unidad.", "Debe corregirse en data/factions.json o en el importador.");
  if (!positivePoints.length) add("error", "Sin puntos", "La unidad no tiene coste de puntos positivo ni tabla de pointCosts util.", "Esta unidad puede romper importacion, autopick y conteo de lista.");
  if (!section) add("error", "Sin categoria", "La unidad no tiene section asignada.", "Debe caer en una seccion canonica o en Allied Units/Legends.");
  else if (!normalizedSection) add("error", "Categoria no reconocida", `La categoria '${section}' no forma parte del orden canonico.`, "Revisar normalizacion de BSData o corregir section.");
  else if (normalizedSection === "Other") add("warn", "Categoria generica", "La unidad sigue clasificada como Other.", "No siempre es ilegal, pero reduce calidad de busqueda, filtros y recomendaciones.");

  if (!detail) {
    add("incomplete", "Sin datasheet enlazado", "No encontre detalle de datasheet para esta unidad en unit-details.json.", "La unidad aparecera con fallback y puede perder armas, reglas y keywords.");
    return issues;
  }

  if (!detail.models?.length) add("incomplete", "Sin perfil de modelo", "No hay tabla M/T/SV/W/LD/OC enlazada.", "Afecta cartas PDF, comparacion y revision visual de datasheet.");
  if (!detail.keywords?.length) add("incomplete", "Sin keywords", "No hay keywords enlazadas para esta unidad.", "Afecta lideres, reglas, categorias y scoring tactico.");
  if (!detail.abilities?.length && !detail.loadout && !detail.wargear?.length) {
    add("incomplete", "Datasheet muy vacio", "No hay habilidades, loadout ni armas registradas.", "Probablemente el detalle no se extrajo completo.");
  }
  if (!hasMeaningfulWargear(detail)) add("incomplete", "Sin armas/loadout", "No hay armas o loadout base util.", "Afecta scores de disparo, melee, cartas PDF e importacion de equipo.");

  const incompleteWeapons = (detail.wargear || []).filter((weapon) => dataAuditWeaponIncomplete(weapon));
  if (incompleteWeapons.length) {
    add("warn", "Armas incompletas", `${incompleteWeapons.length} arma(s) tienen nombre o perfil incompleto: ${incompleteWeapons.slice(0, 3).map((weapon) => weapon.name || "sin nombre").join(", ")}.`, "Revisar extraccion de perfiles de armas.");
  }

  dataAuditSectionMismatch(unitData, normalizedSection, keywords, detail.role || "").forEach((issue) => add(issue.severity, issue.title, issue.message, issue.hint));
  dataAuditScoreIssues(unitData).forEach((issue) => add(issue.severity, issue.title, issue.message, issue.hint));
  dataAuditPointTierIssues(unitData, detail, positivePoints).forEach((issue) => add(issue.severity, issue.title, issue.message, issue.hint));
  return issues;
}

function dataAuditCanonicalSection(section = "") {
  const normalized = normalizeName(section);
  if (normalized === "epic hero" || normalized === "epic heroes") return "Epic Hero";
  if (normalized === "character" || normalized === "characters") return "Character";
  if (normalized === "battleline") return "Battleline";
  if (normalized === "dedicated transport" || normalized === "dedicated transports") return "Dedicated Transport";
  if (normalized === "fortification" || normalized === "fortifications") return "Fortification";
  if (normalized === "infantry") return "Infantry";
  if (normalized === "mounted") return "Mounted";
  if (normalized === "monster" || normalized === "monsters") return "Monster";
  if (normalized === "vehicle" || normalized === "vehicles") return "Vehicle";
  if (normalized === "allied unit" || normalized === "allied units" || normalized === "allies") return "Allied Units";
  if (normalized === "legend" || normalized === "legends") return "Legends";
  if (normalized === "other" || normalized === "other datasheets") return "Other";
  return sectionOrder.includes(section) ? section : "";
}

function hasMeaningfulWargear(detail) {
  if ((detail.wargear || []).some((weapon) => weapon.name && !/^(-|none|nothing)$/i.test(weapon.name))) return true;
  return baseLoadoutEntries(detail.loadout || "").length > 0;
}

function dataAuditWeaponIncomplete(weapon = {}) {
  if (!weapon.name || normalizeName(weapon.name).length < 3) return true;
  const profileValues = [weapon.range, weapon.A, weapon.BS, weapon.WS, weapon.S, weapon.AP, weapon.D].filter((value) => String(value || "").trim() && String(value || "").trim() !== "-");
  return profileValues.length < 3;
}

function dataAuditSectionMismatch(unitData, section, keywords, role = "") {
  if (["Allied Units", "Legends"].includes(section)) return [];
  const issues = [];
  const roleText = normalizeName(role);
  const hasKeyword = (keyword) => keywords.has(keyword) || roleText.includes(keyword);
  const push = (title, message, hint = "Revisar keywords, role de Wahapedia/BSData y section en factions.json.") => issues.push({ severity: "warn", title, message, hint });
  if (hasKeyword("fortification") && section !== "Fortification") push("Fortification mal clasificada", "La datasheet tiene keyword/rol de fortification pero no esta en Fortification.");
  if (hasKeyword("vehicle") && !["Vehicle", "Dedicated Transport"].includes(section)) push("Vehicle mal clasificado", "La datasheet parece Vehicle pero esta en otra categoria.");
  if (hasKeyword("monster") && section !== "Monster") push("Monster mal clasificado", "La datasheet parece Monster pero esta en otra categoria.");
  if (hasKeyword("character") && !["Character", "Epic Hero"].includes(section)) push("Character mal clasificado", "La datasheet parece Character pero no esta como Character/Epic Hero.");
  if (hasKeyword("battleline") && section !== "Battleline") push("Battleline mal clasificada", "La datasheet parece Battleline pero no esta en Battleline.");
  if (section === "Vehicle" && hasKeyword("infantry") && !hasKeyword("vehicle")) push("Vehicle sospechoso", "La unidad esta como Vehicle, pero sus keywords parecen Infantry.");
  if (section === "Monster" && hasKeyword("infantry") && !hasKeyword("monster")) push("Monster sospechoso", "La unidad esta como Monster, pero sus keywords parecen Infantry.");
  return issues;
}

function dataAuditScoreIssues(unitData) {
  const scores = unitRoleScores(unitData);
  const highScores = scores.filter((score) => score.value >= 8);
  const issues = [];
  if (highScores.length >= 7) {
    issues.push({
      severity: "warn",
      title: "Scores demasiado planos",
      message: `La unidad tiene ${highScores.length} roles en 8+ (${highScores.slice(0, 5).map((score) => score.label).join(", ")}).`,
      hint: "Suele indicar tags demasiado generosos o armas mal interpretadas; puede sesgar autopick.",
    });
  }
  const scoreMap = new Map(scores.map((score) => [score.label, score.value]));
  const text = normalizeName(`${unitData.name} ${unitData.section || ""} ${(unitData.tags || []).join(" ")}`);
  if (/(scout|cultist|gretchin|guardsmen|termagant|hormagaunt|neurogaunt|kabalite|wych)/.test(text)) {
    const spike = ["Dano antitanque", "Melee", "Disparo", "Ancla"].filter((label) => Number(scoreMap.get(label) || 0) >= 8);
    if (spike.length >= 2) {
      issues.push({
        severity: "warn",
        title: "Unidad ligera con scores altos",
        message: `Unidad barata/ligera con roles altos en ${spike.join(", ")}.`,
        hint: "Revisar tags inferidos y perfiles de arma para evitar recomendaciones repetidas sin plan.",
      });
    }
  }
  return issues;
}

function dataAuditPointTierIssues(unitData, detail, positivePoints) {
  const issues = [];
  const range = compositionModelRange(detail);
  const pointCosts = unitData.pointCosts || {};
  const costValues = Object.values(pointCosts).map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (range.max > range.min && !costValues.length && !Number(unitData.points || 0)) {
    issues.push({
      severity: "error",
      title: "Tamanos sin coste",
      message: `La composicion permite ${range.min}-${range.max} modelos, pero no hay coste base ni pointCosts.`,
      hint: "Esto rompe conteo por tamano de unidad.",
    });
  }
  if (range.max > range.min && costValues.length && !pointCosts[String(range.min)]) {
    issues.push({
      severity: "warn",
      title: "Falta coste minimo",
      message: `Hay pointCosts, pero no encontre coste para el tamano minimo (${range.min}).`,
      hint: "Puede causar errores al importar unidades por puntos.",
    });
  }
  if (positivePoints.some((value) => value % 5 !== 0)) {
    issues.push({
      severity: "warn",
      title: "Coste poco comun",
      message: `Hay costes que no son multiplos de 5: ${positivePoints.filter((value) => value % 5 !== 0).join(", ")}.`,
      hint: "No siempre es error, pero conviene revisar cambios manuales.",
    });
  }
  return issues;
}

function dataAuditSeverityRank(severity) {
  return { error: 0, warn: 1, incomplete: 2 }[severity] ?? 3;
}

function filterDataAuditIssues(issues) {
  const factionId = state.dataAudit.factionId || "all";
  const severity = state.dataAudit.severity || "all";
  const query = normalizeSearch(state.dataAudit.query || "");
  return issues.filter((issue) => {
    if (factionId !== "all" && issue.factionId !== factionId) return false;
    if (severity !== "all" && issue.severity !== severity) return false;
    if (query) {
      const haystack = normalizeSearch(`${issue.faction} ${issue.unit} ${issue.section} ${issue.title} ${issue.message} ${issue.hint}`);
      if (!query.split(" ").every((part) => haystack.includes(part))) return false;
    }
    return true;
  });
}

function renderDataAuditSummary(container, report, filteredCount) {
  const counts = {
    error: report.issues.filter((issue) => issue.severity === "error").length,
    warn: report.issues.filter((issue) => issue.severity === "warn").length,
    incomplete: report.issues.filter((issue) => issue.severity === "incomplete").length,
  };
  container.innerHTML = `
    <article><strong>${escapeHtml(report.edition)}</strong><span>Dataset activo</span></article>
    <article><strong>${report.factionCount}</strong><span>Facciones</span></article>
    <article><strong>${report.unitCount}</strong><span>Unidades revisadas</span></article>
    <article class="error"><strong>${counts.error}</strong><span>Errores</span></article>
    <article class="warn"><strong>${counts.warn}</strong><span>Advertencias</span></article>
    <article class="incomplete"><strong>${counts.incomplete}</strong><span>Datos incompletos</span></article>
    <article><strong>${filteredCount}</strong><span>Mostrados con filtros</span></article>
  `;
}

function renderDataAuditList(container, issues) {
  container.replaceChildren();
  if (!issues.length) {
    container.append(emptyMini("No hay hallazgos con los filtros actuales."));
    return;
  }
  const limit = 160;
  issues.slice(0, limit).forEach((issue) => {
    const item = document.createElement("article");
    item.className = `data-audit-item ${issue.severity}`;
    item.innerHTML = `
      <div>
        <span class="data-audit-severity">${escapeHtml(dataAuditSeverityLabel(issue.severity))}</span>
        <strong>${escapeHtml(issue.title)}</strong>
        <p>${escapeHtml(issue.message)}</p>
        ${issue.hint ? `<p class="mini">${escapeHtml(issue.hint)}</p>` : ""}
      </div>
      <aside>
        <b>${escapeHtml(issue.unit)}</b>
        <span>${escapeHtml(issue.faction)}</span>
        <em>${escapeHtml(issue.section || "Other")}</em>
      </aside>
    `;
    container.append(item);
  });
  if (issues.length > limit) {
    container.append(emptyMini(`Mostrando ${limit} de ${issues.length} hallazgos. Usa filtros para acotar la revision.`));
  }
}

function dataAuditSeverityLabel(severity) {
  return severity === "error" ? "Error" : severity === "warn" ? "Advertencia" : "Dato incompleto";
}

function matchHistoryStats() {
  const total = state.matchHistory.length;
  const wins = state.matchHistory.filter((item) => item.result === "win").length;
  const losses = state.matchHistory.filter((item) => item.result === "loss").length;
  const draws = state.matchHistory.filter((item) => item.result === "draw").length;
  const knownResults = state.matchHistory.filter((item) => ["win", "loss", "draw"].includes(item.result));
  const diffs = state.matchHistory
    .filter((item) => item.scoreKnown !== false && Number.isFinite(Number(item.playerScore)) && Number.isFinite(Number(item.opponentScore)))
    .map((item) => item.playerScore - item.opponentScore);
  const firstTurnGames = state.matchHistory.filter((item) => item.playerWentFirst !== null && ["win", "loss", "draw"].includes(item.result));
  const firstTurnWins = firstTurnGames.filter((item) => item.playerWentFirst && item.result === "win").length;
  const primaryValues = state.matchHistory.map((item) => item.playerPrimary).filter((value) => Number(value) > 0);
  const secondaryValues = state.matchHistory.map((item) => item.playerSecondary).filter((value) => Number(value) > 0);
  return {
    total,
    wins,
    losses,
    draws,
    winRate: knownResults.length ? Math.round((wins / knownResults.length) * 100) : 0,
    averageDiff: diffs.length ? Math.round(diffs.reduce((sum, value) => sum + value, 0) / diffs.length) : 0,
    firstTurnWinRate: firstTurnGames.length ? Math.round((firstTurnWins / firstTurnGames.length) * 100) : 0,
    averagePrimary: primaryValues.length ? Math.round(primaryValues.reduce((sum, value) => sum + value, 0) / primaryValues.length) : 0,
    averageSecondary: secondaryValues.length ? Math.round(secondaryValues.reduce((sum, value) => sum + value, 0) / secondaryValues.length) : 0,
    bestTurn: bestHistoryTurn(),
  };
}

function matchReviewContextLine(report) {
  const parts = [
    report.date || "",
    editionProfiles[report.rulesEdition || "10e"]?.label || "",
    report.mission ? missionDisplayName(report.mission) : "",
    report.deployment ? deploymentDisplayName(report.deployment) : "",
    report.playerList?.faction && report.enemyList?.faction ? `${report.playerList.faction} vs ${report.enemyList.faction}` : "",
  ].filter(Boolean);
  return parts.join(" - ") || "Partida guardada en memoria";
}

function matchReviewFeedbackItems(report) {
  const items = [];
  if (report.scoreKnown === false || report.result === "unknown") {
    items.push({
      title: "Lectura parcial",
      body: "El marcador no quedo confiable. Guarde lo que pude detectar, pero este reporte pesa menos para memoria, autopick y probabilidad hasta que el OCR lea marcador y secciones.",
      tone: "warn",
    });
  } else {
    items.push(matchReviewScoreCard(report));
  }
  items.push(matchReviewPrimarySecondaryCard(report));
  items.push(matchReviewTurnCard(report));
  items.push(matchReviewSecondariesCard(report));
  items.push(matchReviewMissionCard(report));
  items.push(matchReviewListCard(report));
  items.push(matchReviewNextStepCard(report));
  return items.filter(Boolean);
}

function matchReviewScoreCard(report) {
  const diff = Number(report.playerScore || 0) - Number(report.opponentScore || 0);
  const resultText = report.result === "win" ? "ganaste" : report.result === "loss" ? "perdiste" : "empataste";
  return {
    title: `Marcador ${signedNumber(diff)}`,
    body: `La partida termino ${Number(report.playerScore || 0)}-${Number(report.opponentScore || 0)}: ${resultText}. ${matchReviewScoreInterpretation(report, diff)}`,
    tone: diff > 0 ? "good" : diff < 0 ? "bad" : "neutral",
  };
}

function matchReviewScoreInterpretation(report, diff) {
  const primaryDelta = Number(report.playerPrimary || 0) - Number(report.opponentPrimary || 0);
  const secondaryDelta = Number(report.playerSecondary || 0) - Number(report.opponentSecondary || 0);
  if (Math.abs(diff) <= 5) return "Fue una partida de margen fino: una decision de secundaria, OC o ultimo turno probablemente movia el resultado.";
  if (diff > 0 && secondaryDelta >= primaryDelta) return "La ventaja vino sobre todo por secundarias y ejecucion de plan, asi que vale la pena repetir esos patrones.";
  if (diff > 0) return "La ventaja vino por primaria/control de mesa; protege ese plan en matchups parecidos.";
  if (primaryDelta < secondaryDelta) return "La caida principal estuvo en primaria/control. En una revancha, prioriza negar puntos antes que buscar bajas.";
  return "La caida principal estuvo en secundarias o conversion de acciones. Revisa si elegiste objetivos que tu lista podia completar de forma repetible.";
}

function matchReviewPrimarySecondaryCard(report) {
  const primaryDelta = Number(report.playerPrimary || 0) - Number(report.opponentPrimary || 0);
  const secondaryDelta = Number(report.playerSecondary || 0) - Number(report.opponentSecondary || 0);
  const battleReadyDelta = Number(report.playerBattleReady || 0) - Number(report.opponentBattleReady || 0);
  const lead = Math.abs(primaryDelta) >= Math.abs(secondaryDelta) ? "primaria" : "secundarias";
  return {
    title: "Primaria vs secundarias",
    body: `Primaria ${signedNumber(primaryDelta)} (${report.playerPrimary || 0}-${report.opponentPrimary || 0}), secundarias ${signedNumber(secondaryDelta)} (${report.playerSecondary || 0}-${report.opponentSecondary || 0}), battle ready ${signedNumber(battleReadyDelta)}. El eje de la partida fue ${lead}.`,
    tone: primaryDelta + secondaryDelta >= 0 ? "good" : "bad",
  };
}

function matchReviewTurnCard(report) {
  const playerTurns = combinedTurnScores(report);
  const enemyTurns = combinedOpponentTurnScores(report);
  const deltas = playerTurns.map((value, index) => Number(value || 0) - Number(enemyTurns[index] || 0));
  const bestIndex = deltas.reduce((winner, value, index) => value > deltas[winner] ? index : winner, 0);
  const worstIndex = deltas.reduce((loser, value, index) => value < deltas[loser] ? index : loser, 0);
  return {
    title: "Lectura por turnos",
    body: `Tu mejor ventana fue T${bestIndex + 1} (${signedNumber(deltas[bestIndex])}) y el turno mas caro fue T${worstIndex + 1} (${signedNumber(deltas[worstIndex])}). ${matchReviewTurnAdvice(report, bestIndex + 1, worstIndex + 1)}`,
    tone: deltas.reduce((sum, value) => sum + value, 0) >= 0 ? "good" : "bad",
  };
}

function combinedOpponentTurnScores(report) {
  return Array.from({ length: 5 }, (_, index) => Number(report.opponentPrimaryTurns?.[index] || 0) + Number(report.opponentSecondaryTurns?.[index] || 0));
}

function matchReviewTurnAdvice(report, bestTurn, worstTurn) {
  if (worstTurn <= 2) return "El problema aparecio temprano: revisa despliegue, pantallas y si regalaste una pieza antes de puntuar.";
  if (worstTurn >= 4) return "La caida fue tarde: probablemente faltaron unidades moviles/OC vivas para cerrar mesa o secundarias.";
  if (bestTurn <= 2 && report.result === "loss") return "Tuviste impacto temprano, pero no se convirtio en plan sostenido. Guarda una segunda oleada para T3.";
  return "Usa esta curva para ajustar autopick: quieres reforzar el turno debil sin romper tu mejor ventana.";
}

function matchReviewSecondariesCard(report) {
  const own = report.playerSecondaries || [];
  const enemy = report.opponentSecondaries || [];
  const secondaryDelta = Number(report.playerSecondary || 0) - Number(report.opponentSecondary || 0);
  return {
    title: "Secundarias",
    body: `Tuyas: ${own.length ? own.join(", ") : "no detectadas"}. Rival: ${enemy.length ? enemy.join(", ") : "no detectadas"}. ${secondaryDelta >= 0 ? "Tus elecciones funcionaron o al menos no cedieron diferencial." : "Aqui cediste diferencial: en partidas parecidas, prioriza secundarias que tu lista pueda repetir sin exponerse."}`,
    tone: secondaryDelta >= 0 ? "good" : "bad",
  };
}

function matchReviewMissionCard(report) {
  const mission = report.mission ? missionDisplayName(report.mission) : "mision no detectada";
  const deployment = report.deployment ? deploymentDisplayName(report.deployment) : "deployment no detectado";
  const wentFirst = report.playerWentFirst === true ? "fuiste primero" : report.playerWentFirst === false ? "fuiste segundo" : "orden de turno no detectado";
  return {
    title: "Mision y deployment",
    body: `${mission} con ${deployment}; ${wentFirst}. ${matchReviewMissionAdvice(report)}`,
    tone: "neutral",
  };
}

function matchReviewMissionAdvice(report) {
  const diff = Number(report.playerScore || 0) - Number(report.opponentScore || 0);
  if (["supplyDrop", "terraform"].includes(report.mission) && diff < 0) return "Como esta mision paga tarde, revisa si gastaste demasiado recurso antes de T4-T5.";
  if (["purgeFoe", "scorchedEarth"].includes(report.mission) && diff < 0) return "En esta combinacion los trades y acciones tempranas pesan mucho: no cambies unidades si no compran puntos.";
  if (report.playerWentFirst === true && diff < 0) return "Si fuiste primero y perdiste, probablemente faltaron pantallas, staging o conversion de tempo en puntos.";
  if (report.playerWentFirst === false && diff > 0) return "Ganar yendo segundo es buena senal: tu lista probablemente aguanta y responde bien.";
  return "Guarda esta lectura para comparar misiones similares en memoria.";
}

function matchReviewListCard(report) {
  if (!report.playerList?.units?.length && !report.enemyList?.units?.length) {
    return {
      title: "Listas vinculadas",
      body: "Esta partida no tiene listas guardadas. Para feedback mas preciso, vincula tu lista y la rival cuando guardes el reporte.",
      tone: "warn",
    };
  }
  const playerStyle = inferMatchListStyle(report.playerList);
  const enemyStyle = inferMatchListStyle(report.enemyList);
  const playerPoints = report.playerList?.points || totalPoints(report.playerList?.units || []);
  const enemyPoints = report.enemyList?.points || totalPoints(report.enemyList?.units || []);
  return {
    title: "Listas usadas",
    body: `${report.playerList?.name || "Tu lista"} (${playerPoints || 0} pts, ${archetypeDisplayName(playerStyle || "midrange")}) vs ${report.enemyList?.name || "lista rival"} (${enemyPoints || 0} pts, ${archetypeDisplayName(enemyStyle || "midrange")}). ${matchReviewListAdvice(report, playerStyle, enemyStyle)}`,
    tone: "neutral",
  };
}

function matchReviewListAdvice(report, playerStyle, enemyStyle) {
  if (!report.playerList?.units?.length || !report.enemyList?.units?.length) return "Vincular ambas listas permitira detectar si el problema fue matchup, mision o ejecucion.";
  if (report.result === "loss" && enemyStyle === "horde") return "Contra este tipo de rival, sube valor de pantallas, control y dano eficiente antiinfanteria.";
  if (report.result === "loss" && enemyStyle === "skew") return "Contra skew, evita dano disperso y considera mas redundancia en respuestas especificas.";
  if (report.result === "loss" && enemyStyle === "mobilityTempo") return "Contra tempo, necesitas negar rutas y conservar scoring movil para el cierre.";
  if (report.result === "win") return "Este pairing funciono: la memoria lo usara como referencia positiva para autopick y simulacion.";
  return "La memoria usara este matchup para ajustar recomendaciones futuras.";
}

function matchReviewNextStepCard(report) {
  const diff = Number(report.playerScore || 0) - Number(report.opponentScore || 0);
  const primaryDelta = Number(report.playerPrimary || 0) - Number(report.opponentPrimary || 0);
  const secondaryDelta = Number(report.playerSecondary || 0) - Number(report.opponentSecondary || 0);
  let body = "Siguiente enfoque: ";
  if (report.scoreKnown === false || report.result === "unknown") {
    body += "vuelve a intentar OCR con la imagen completa y vincula listas antes de usar esta partida como referencia fuerte.";
  } else if (diff >= 10) {
    body += "mantener el plan, pero anotar que unidades hicieron scoring y cuales solo sobraron para poder optimizar sin romper lo que funciono.";
  } else if (primaryDelta < -6) {
    body += "practicar despliegue y movimientos de T1-T2 para no regalar primaria; el autopick deberia favorecer OC, pantallas y piezas de trading.";
  } else if (secondaryDelta < -6) {
    body += "revisar seleccion de secundarias; el autopick deberia favorecer unidades que repitan acciones o lleguen a cuadrantes sin morir.";
  } else {
    body += "partida pareja; identifica una decision de deployment y una de secundarias para probar distinto en la revancha.";
  }
  return { title: "Accion recomendada", body, tone: diff >= 0 ? "good" : "warn" };
}

function matchHistoryInsights() {
  if (!state.matchHistory.length) return [];
  const stats = matchHistoryStats();
  const commonSecondaries = topHistorySecondaries();
  const secondaryRecords = historySecondaryRecords();
  const goodSecondaries = secondaryRecords.filter((item) => item.score >= 0.8).slice(0, 4);
  const badSecondaries = [...secondaryRecords].filter((item) => item.score <= -0.4).sort((a, b) => a.score - b.score).slice(0, 4);
  const missionRecords = historyMissionRecords();
  const bestMissions = missionRecords.filter((item) => item.games >= 1 && item.winRate >= 55).slice(0, 3);
  const hardMissions = [...missionRecords].filter((item) => item.games >= 1 && item.winRate <= 45).sort((a, b) => a.winRate - b.winRate).slice(0, 3);
  const factionRecords = historyOpponentRecords("faction");
  const styleRecords = historyOpponentRecords("style");
  const bestFactions = factionRecords.filter((item) => item.games >= 1 && item.winRate >= 55).slice(0, 4);
  const hardFactions = [...factionRecords].filter((item) => item.games >= 1 && item.winRate <= 45).sort((a, b) => a.winRate - b.winRate).slice(0, 4);
  const bestStyles = styleRecords.filter((item) => item.games >= 1 && item.winRate >= 55).slice(0, 3);
  const hardStyles = [...styleRecords].filter((item) => item.games >= 1 && item.winRate <= 45).sort((a, b) => a.winRate - b.winRate).slice(0, 3);
  return [
    stats.averageSecondary && stats.averageSecondary < 24 ? { title: "Secundarias bajas", body: `Promedias ${stats.averageSecondary}/40. El autopick dara mas valor a piezas moviles, deep strike y scoring.` } : null,
    stats.averagePrimary && stats.averagePrimary < 30 ? { title: "Primaria bajo presion", body: `Promedias ${stats.averagePrimary}/50 en primaria. El sistema va a valorar mas anclas, pantallas y control de mesa.` } : null,
    stats.bestTurn ? { title: "Mejor turno", body: `Tu mejor produccion historica parece concentrarse en turno ${stats.bestTurn}. Esto ayuda a detectar si tu lista necesita aguantar, acelerar o cerrar mejor.` } : null,
    commonSecondaries.length ? { title: "Secundarias frecuentes", body: commonSecondaries.map((item) => `${item.name} (${item.count})`).join(", ") } : null,
    goodSecondaries.length ? { title: "Secundarias favorables", body: goodSecondaries.map((item) => `${item.name}: ${item.winRate}% WR, sec. media ${item.averageSecondary}`).join(", ") } : null,
    badSecondaries.length ? { title: "Secundarias desfavorables", body: badSecondaries.map((item) => `${item.name}: ${item.winRate}% WR, sec. media ${item.averageSecondary}`).join(", ") } : null,
    bestMissions.length ? { title: "Misiones favorables", body: bestMissions.map((item) => `${missionDisplayName(item.mission)} ${item.winRate}% (${item.games})`).join(", ") } : null,
    hardMissions.length ? { title: "Misiones menos favorables", body: hardMissions.map((item) => `${missionDisplayName(item.mission)} ${item.winRate}% (${item.games})`).join(", ") } : null,
    bestFactions.length ? { title: "Facciones favorables", body: bestFactions.map((item) => `${item.name} ${item.winRate}% (${item.games})`).join(", ") } : null,
    hardFactions.length ? { title: "Facciones dificiles", body: hardFactions.map((item) => `${item.name} ${item.winRate}% (${item.games})`).join(", ") } : null,
    bestStyles.length ? { title: "Arquetipos favorables", body: bestStyles.map((item) => `${archetypeDisplayName(item.name)} ${item.winRate}% (${item.games})`).join(", ") } : null,
    hardStyles.length ? { title: "Arquetipos dificiles", body: hardStyles.map((item) => `${archetypeDisplayName(item.name)} ${item.winRate}% (${item.games})`).join(", ") } : null,
  ].filter(Boolean);
}

function bestHistoryTurn() {
  const totals = [0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0];
  state.matchHistory.forEach((item) => {
    const turns = combinedTurnScores(item);
    turns.forEach((value, index) => {
      if (Number(value) > 0) {
        totals[index] += Number(value);
        counts[index] += 1;
      }
    });
  });
  const averages = totals.map((value, index) => counts[index] ? value / counts[index] : 0);
  const best = averages.reduce((winner, value, index) => value > averages[winner] ? index : winner, 0);
  return averages[best] ? best + 1 : null;
}

function combinedTurnScores(report) {
  return Array.from({ length: 5 }, (_, index) => Number(report.playerPrimaryTurns?.[index] || 0) + Number(report.playerSecondaryTurns?.[index] || 0));
}

function topHistorySecondaries() {
  const counts = new Map();
  state.matchHistory.forEach((report) => {
    (report.playerSecondaries || []).forEach((secondary) => counts.set(secondary, (counts.get(secondary) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function historySecondaryRecords() {
  const map = new Map();
  state.matchHistory.forEach((report) => {
    if (!["win", "loss", "draw"].includes(report.result)) return;
    (report.playerSecondaries || []).forEach((secondary) => {
      if (!map.has(secondary)) map.set(secondary, { name: secondary, games: 0, wins: 0, losses: 0, secondaryTotal: 0, diff: 0 });
      const item = map.get(secondary);
      item.games += 1;
      if (report.result === "win") item.wins += 1;
      if (report.result === "loss") item.losses += 1;
      item.secondaryTotal += Number(report.playerSecondary || 0);
      if (report.scoreKnown !== false) item.diff += Number(report.playerScore || 0) - Number(report.opponentScore || 0);
    });
  });
  return [...map.values()]
    .map((item) => {
      const winRate = Math.round((item.wins / Math.max(1, item.games)) * 100);
      const averageSecondary = Math.round(item.secondaryTotal / Math.max(1, item.games));
      const averageDiff = Math.round(item.diff / Math.max(1, item.games));
      return {
        ...item,
        winRate,
        averageSecondary,
        averageDiff,
        score: (winRate - 50) / 25 + (averageSecondary - 24) / 10 + averageDiff / 18,
      };
    })
    .sort((a, b) => b.score - a.score || b.games - a.games);
}

function historyMissionRecords() {
  const map = new Map();
  state.matchHistory.forEach((report) => {
    if (!report.mission || !["win", "loss", "draw"].includes(report.result)) return;
    if (!map.has(report.mission)) map.set(report.mission, { mission: report.mission, games: 0, wins: 0 });
    const item = map.get(report.mission);
    item.games += 1;
    if (report.result === "win") item.wins += 1;
  });
  return [...map.values()]
    .map((item) => ({ ...item, winRate: Math.round((item.wins / Math.max(1, item.games)) * 100) }))
    .sort((a, b) => b.winRate - a.winRate);
}

function historyOpponentRecords(kind) {
  const map = new Map();
  state.matchHistory.forEach((report) => {
    if (!["win", "loss", "draw"].includes(report.result)) return;
    const key = kind === "style" ? reportOpponentStyle(report) : reportOpponentFaction(report);
    if (!key) return;
    if (!map.has(key)) map.set(key, { name: key, games: 0, wins: 0, losses: 0, diff: 0 });
    const item = map.get(key);
    item.games += 1;
    if (report.result === "win") item.wins += 1;
    if (report.result === "loss") item.losses += 1;
    if (report.scoreKnown !== false) item.diff += Number(report.playerScore || 0) - Number(report.opponentScore || 0);
  });
  return [...map.values()]
    .map((item) => ({ ...item, winRate: Math.round((item.wins / Math.max(1, item.games)) * 100), averageDiff: Math.round(item.diff / Math.max(1, item.games)) }))
    .sort((a, b) => b.winRate - a.winRate || b.averageDiff - a.averageDiff || b.games - a.games);
}

function reportOpponentFaction(report) {
  return report.enemyList?.faction || report.opponentFaction || "";
}

function reportOpponentStyle(report) {
  return report.enemyStyle || inferMatchListStyle(report.enemyList) || "";
}

function inferMatchListStyle(list) {
  if (!list?.units?.length) return "";
  return inferRosterStyle(list.units, null);
}

function missionDisplayName(value) {
  const names = {
    takeHold: "Take and Hold",
    supplyDrop: "Supply Drop",
    purgeFoe: "Purge the Foe",
    scorchedEarth: "Scorched Earth",
    hiddenSupplies: "Hidden Supplies",
    linchpin: "Linchpin",
    terraform: "Terraform",
  };
  return names[value] || value || "Mision desconocida";
}

function parseMatchReport(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const compact = lines.join("\n");
  const score = extractReportScore(lines);
  if (!score) return null;
  const scoreIndex = score.index;
  const scoreLine = lines[scoreIndex] || "";
  const inlineScore = scoreLine.match(/^\s*([A-Za-z\u00C0-\u00FF' .-]{2,}?)\s+(\d{1,3})\s*[-\u2013]\s*(\d{1,3})\s+([A-Za-z\u00C0-\u00FF' .-]{2,})\s*$/);
  const playerScore = score.playerScore;
  const opponentScore = score.opponentScore;
  const date = lines.find((line) => /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i.test(line)) || "";
  const playerName = cleanReportName(inlineScore?.[1] || lines[Math.max(0, scoreIndex - 1)] || lines[0]);
  const opponentName = cleanReportName(inlineScore?.[4] || lines[scoreIndex + 1] || "");
  const playerBlock = reportPlayerBlock(lines, playerName, opponentName, true);
  const opponentBlock = reportPlayerBlock(lines, playerName, opponentName, false);
  const mission = detectKnownMission(compact);
  const deployment = detectKnownDeployment(compact);
  const result = playerScore > opponentScore ? "win" : playerScore < opponentScore ? "loss" : "draw";
  const playerPrimaryTurns = extractTurnScores(playerBlock.text, 50);
  const opponentPrimaryTurns = extractTurnScores(opponentBlock.text, 50);
  const playerSecondaryTurns = extractTurnScores(playerBlock.text, 40);
  const opponentSecondaryTurns = extractTurnScores(opponentBlock.text, 40);
  return {
    id: makeListId(),
    createdAt: new Date().toISOString(),
    date,
    playerName,
    opponentName,
    playerFaction: detectReportFaction(playerBlock.text) || detectReportFaction(compact, true),
    opponentFaction: detectReportFaction(opponentBlock.text) || detectReportFaction(compact, false),
    playerDetachment: detectReportDetachment(playerBlock.text),
    opponentDetachment: detectReportDetachment(opponentBlock.text),
    playerScore,
    opponentScore,
    rulesEdition: state.rulesEdition,
    result,
    playerWentFirst: playerBlock.wentFirst,
    opponentWentFirst: opponentBlock.wentFirst,
    mission,
    deployment,
    playerPrimary: extractSectionScore(playerBlock.text, 50),
    opponentPrimary: extractSectionScore(opponentBlock.text, 50),
    playerSecondary: extractSectionScore(playerBlock.text, 40),
    opponentSecondary: extractSectionScore(opponentBlock.text, 40),
    playerPrimaryTurns,
    opponentPrimaryTurns,
    playerSecondaryTurns,
    opponentSecondaryTurns,
    playerBattleReady: extractBattleReady(playerBlock.text),
    opponentBattleReady: extractBattleReady(opponentBlock.text),
    playerCpTurns: extractCpTurns(playerBlock.text),
    opponentCpTurns: extractCpTurns(opponentBlock.text),
    playerSecondaries: extractSecondaries(playerBlock.text),
    opponentSecondaries: extractSecondaries(opponentBlock.text),
    playerList: captureMatchList("player"),
    enemyList: captureMatchList("enemy"),
    raw: text.slice(0, 5000),
  };
}

function reportPlayerBlock(lines, playerName, opponentName, player) {
  const startName = player ? playerName : opponentName;
  const otherName = player ? opponentName : playerName;
  const start = findReportHeadingIndex(lines, startName, player);
  const otherIndex = findReportHeadingIndex(lines, otherName, !player);
  const end = otherIndex > start ? otherIndex : lines.findIndex((line, index) => index > start + 4 && reportLineLooksLikePlayerHeading(line));
  const blockLines = lines.slice(start, end > start ? end : lines.length);
  return {
    text: blockLines.join("\n"),
    wentFirst: /went first/i.test(blockLines.join(" ")) ? true : /went second/i.test(blockLines.join(" ")) ? false : null,
  };
}

function findReportHeadingIndex(lines, name, player) {
  const normalizedName = normalizeName(name);
  const exact = lines.findIndex((line, index) => index > 1 && normalizeName(line) === normalizedName);
  if (exact >= 0) return exact;
  const fuzzy = lines.findIndex((line, index) => index > 1 && reportLineMatchesName(line, normalizedName));
  if (fuzzy >= 0) return fuzzy;
  const wentIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter((item) => /went first|went second/i.test(item.line))
    .map((item) => item.index);
  if (wentIndexes.length >= 2) return player ? Math.max(0, wentIndexes[0] - 1) : Math.max(0, wentIndexes[1] - 1);
  if (wentIndexes.length === 1) return player ? Math.max(0, wentIndexes[0] - 1) : Math.min(lines.length - 1, wentIndexes[0] + 8);
  return player ? 0 : Math.floor(lines.length / 2);
}

function reportLineMatchesName(line, normalizedName) {
  const normalizedLine = normalizeName(line);
  if (!normalizedName || !normalizedLine || normalizedLine.length > 30) return false;
  if (normalizedLine.includes(normalizedName) || normalizedName.includes(normalizedLine)) return true;
  const nameTokens = normalizedName.split(" ").filter((token) => token.length > 1);
  const lineTokens = normalizedLine.split(" ").filter((token) => token.length > 1);
  if (!nameTokens.length || !lineTokens.length) return false;
  const common = nameTokens.filter((token) => lineTokens.includes(token)).length;
  return common / Math.max(nameTokens.length, lineTokens.length) >= 0.6;
}

function reportLineLooksLikePlayerHeading(line) {
  const normalized = normalizeName(line);
  if (!normalized || normalized.length > 28) return false;
  if (/went first|went second|battle ready|cp remaining|mission|deployment|victory|defeat|draw/.test(normalized)) return false;
  if (knownSecondaryNames().some((secondary) => normalizeName(secondary) === normalized)) return false;
  return /^[a-z0-9 ]+$/.test(normalized) && normalized.split(" ").length <= 4;
}

function cleanReportName(value = "") {
  return String(value || "").replace(/\bvictory\b|\bdefeat\b|\bdraw\b/gi, "").trim();
}

function detectKnownMission(text) {
  const key = normalizeName(text);
  const missions = [
    ["takeHold", "take and hold"],
    ["supplyDrop", "supply drop"],
    ["purgeFoe", "purge the foe"],
    ["scorchedEarth", "scorched earth"],
    ["hiddenSupplies", "hidden supplies"],
    ["linchpin", "linchpin"],
    ["terraform", "terraform"],
  ];
  return missions.find(([, label]) => key.includes(normalizeName(label)))?.[0] || "";
}

function detectKnownDeployment(text) {
  const key = normalizeName(text);
  const deployments = [
    ["dawn", "dawn of war"],
    ["search", "search and destroy"],
    ["crucible", "crucible of battle"],
    ["tippingPoint", "tipping point"],
    ["hammer", "hammer and anvil"],
    ["sweeping", "sweeping engagement"],
  ];
  return deployments.find(([, label]) => key.includes(normalizeName(label)))?.[0] || "";
}

function detectReportFaction(text, preferPlayer = true) {
  const haystack = normalizeName(text);
  const matched = factions.find((faction) => haystack.includes(normalizeName(faction.name)));
  if (matched) return matched.name;
  if (preferPlayer && state.faction?.name && haystack.includes(normalizeName(state.faction.name))) return state.faction.name;
  if (!preferPlayer && state.enemyFaction?.name && haystack.includes(normalizeName(state.enemyFaction.name))) return state.enemyFaction.name;
  return "";
}

function detectReportDetachment(text) {
  const haystack = normalizeName(text);
  for (const faction of factions) {
    const detachment = faction.detachments.find((item) => haystack.includes(normalizeName(item.name)));
    if (detachment) return detachment.name;
  }
  return "";
}

function extractSectionScore(text, total) {
  return extractScoreBeforeTotal(text, total);
}

function extractTurnScores(text, total) {
  const lines = normalizeOcrReportText(text).split(/\r?\n/);
  const totalLine = lines.map((line) => ({ line, parsed: extractScoreBeforeTotalLine(line, total) })).find((item) => item.parsed);
  if (!totalLine) return [0, 0, 0, 0, 0];
  const cells = ocrTurnCells(totalLine.parsed.before).map((value) => clampNumber(value, 0, total));
  const normalized = cells.slice(-5);
  while (normalized.length < 5) normalized.unshift(0);
  return normalized;
}

function extractBattleReady(text) {
  const line = normalizeOcrReportText(text).split(/\r?\n/).find((item) => /battle ready/i.test(item)) || "";
  return extractScoreBeforeTotal(line, 10);
}

function extractCpTurns(text) {
  const lines = normalizeOcrReportText(text).split(/\r?\n/);
  const index = lines.findIndex((line) => /cp remaining/i.test(line));
  const line = index >= 0 ? `${lines[index]} ${lines[index + 1] || ""}` : "";
  const cells = ocrTurnCells(line).map((value) => clampNumber(value, 0, 10));
  const normalized = cells.slice(-5);
  while (normalized.length < 5) normalized.unshift(0);
  return normalized;
}

function extractScoreBeforeTotal(text, total) {
  const normalized = normalizeOcrReportText(text);
  const lines = normalized.split(/\r?\n/);
  const parsed = lines.map((line) => extractScoreBeforeTotalLine(line, total)).find(Boolean);
  return parsed ? clampNumber(parsed.score, 0, total) : 0;
}

function totalPatternFor(total) {
  return new RegExp(`${ocrScoreNumberPattern()}\\s*\\/\\s*${ocrTotalPattern(total)}\\b.*$`, "i");
}

function extractScoreBeforeTotalLine(line, total) {
  const pattern = new RegExp(`(^|\\s)(${ocrScoreNumberPattern()})\\s*\\/\\s*${ocrTotalPattern(total)}\\b`, "i");
  const match = String(line || "").match(pattern);
  if (!match) return null;
  return {
    score: parseOcrScoreNumber(match[2]),
    before: String(line || "").slice(0, match.index + match[1].length),
    raw: match[0],
  };
}

function ocrScoreNumberPattern() {
  return "[0-9OoIlSBg](?:\\s*[0-9OoIlSBg,.])?";
}

function ocrTurnCells(line = "") {
  return [...String(line || "").matchAll(/-|\b[0-9OoIlSBg](?:\s*[0-9OoIlSBg,.])?\b/g)]
    .map((match) => match[0] === "-" ? 0 : parseOcrScoreNumber(match[0]))
    .filter((value) => Number.isFinite(value));
}

function ocrTotalPattern(total) {
  if (total === 50) return "[5S]\\s*[0Oo]";
  if (total === 40) return "4\\s*[0Oo]";
  if (total === 10) return "[1Il]\\s*[0Oo]";
  return String(total).split("").join("\\s*");
}

function extractSecondaries(text) {
  const key = normalizeName(text);
  return knownSecondaryNames().filter((secondary) => key.includes(normalizeName(secondary)));
}

function knownSecondaryNames() {
  return [
    "Area Denial", "Marked For Death", "Storm Hostile Objective", "Secure No Man's Land", "A Tempting Target",
    "Overwhelming Force", "No Prisoners", "Engage On All Fronts", "Recover Assets", "Display of Might",
    "Establish Locus", "Sabotage", "Bring It Down", "Defend Stronghold", "Behind Enemy Lines",
    "Assassination", "Extend Battle Lines", "Cleanse",
  ];
}

function captureMatchList(side) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const faction = currentFaction(side);
  const detachment = selectedDetachment(side);
  const detachments = activeDetachments(side);
  return {
    name: exportListName(side),
    faction: faction?.name || "",
    detachment: detachment?.name || "",
    detachmentLoadout: detachments.map((item) => item.name).join(" + "),
    detachmentPoints: detachments.reduce((sum, item) => sum + detachmentPointCost(item), 0),
    points: totalPoints(units),
    units: cloneData(units),
  };
}

function matchReportToEditableText(report) {
  return [
    report.date,
    `${report.playerName || "Jugador"} ${report.playerScore}-${report.opponentScore} ${report.opponentName || "Rival"}`,
    report.result,
    report.mission ? `Mission: ${missionDisplayName(report.mission)}` : "",
    report.deployment ? `Deployment: ${report.deployment}` : "",
    report.playerWentFirst === true ? `${report.playerName || "Jugador"} went first` : "",
    report.playerSecondaries?.length ? `Player secondaries: ${report.playerSecondaries.join(", ")}` : "",
    report.opponentSecondaries?.length ? `Opponent secondaries: ${report.opponentSecondaries.join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

function renderSimulation() {
  const winRate = calculateWinRate();
  $("#winRate").textContent = `${winRate}%`;
  $(".win-ring").style.setProperty("--win", `${winRate}%`);
  $("#simSummary").textContent = simulationSummary(winRate);
}

function renderMissionPresetSummary() {
  const summary = $("#missionPresetSummary");
  if (!summary) return;
  if (state.rulesEdition === "11e") {
    const own = $("#forceDisposition")?.value || inferForceDisposition("player");
    const enemy = $("#enemyForceDisposition")?.value || inferForceDisposition("enemy");
    const terrain = terrainProfileInfo($("#terrainProfile")?.value || "balancedAreas");
    summary.textContent = `11va: ${forceDispositionLabel(own)} contra ${forceDispositionLabel(enemy)}. Terreno: ${terrain.label}. Layout seleccionado: ${layoutLabel($("#layout").value)}. El calculo usa mision asimetrica, Hidden/terreno y rutas de puntaje.`;
    return;
  }
  const preset = selectedMissionPreset();
  if (!preset) {
    summary.textContent = "Configuracion manual de mision, deployment y layout.";
    return;
  }
  summary.textContent = `Mision ${preset.letter}: ${preset.missionName}, ${preset.deploymentName}. Layout seleccionado: ${layoutLabel($("#layout").value)}. Recomendados GW/CA: ${preset.layouts.join(", ")}.`;
}

function renderMissionRecommendations() {
  const container = $("#missionRecommendations");
  if (!container) return;
  container.replaceChildren();
  if (!state.roster.length) {
    container.append(emptyMini("Carga tu lista para ver recomendaciones especificas de mision y plan por turno."));
    return;
  }
  const turnPlan = missionTurnPlan();
  const turnAdvice = turnAdviceItems(turnPlan);
  const turnCard = document.createElement("article");
  turnCard.className = "mission-rec-card turn-plan";
  turnCard.innerHTML = `
    <strong>Variable por turno</strong>
    <p>${escapeHtml(turnPlan.summary)}</p>
    <p class="turn-scale-note">${escapeHtml(turnPlanScaleExplanation(turnPlan))}</p>
    <div class="turn-bars">
      ${turnPlan.turns.map((value, index) => `<span><b>T${index + 1}</b><i style="--value:${Math.round(value)}%"></i><em>${Math.round(value)}</em></span>`).join("")}
    </div>
    <div class="turn-advice-list">
      ${turnAdvice.map((item) => `<div class="turn-advice-item"><b>${escapeHtml(item.turn)} - ${escapeHtml(item.label)}</b><p>${escapeHtml(item.body)}</p></div>`).join("")}
    </div>
  `;
  container.append(turnCard);

  missionRecommendationItems(turnPlan).forEach((item) => {
    const card = document.createElement("article");
    card.className = "mission-rec-card";
    card.innerHTML = `<strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p>`;
    container.append(card);
  });
}

function missionTurnPlan() {
  const inferred = inferredTurnPlan();
  const historical = historicalTurnPlan();
  const turns = inferred.map((value, index) => historical.samples ? value * 0.55 + historical.turns[index] * 0.45 : value);
  const bestIndex = turns.reduce((winner, value, index) => value > turns[winner] ? index : winner, 0);
  const weakIndex = turns.reduce((loser, value, index) => value < turns[loser] ? index : loser, 0);
  return {
    turns,
    bestTurn: bestIndex + 1,
    weakTurn: weakIndex + 1,
    samples: historical.samples,
    summary: historical.samples
      ? `La memoria aporta ${historical.samples} partida(s) similares. Tu pico esperado esta en T${bestIndex + 1}; el punto mas delicado es T${weakIndex + 1}.`
      : `Estimacion por composicion. Tu pico esperado esta en T${bestIndex + 1}; el punto mas delicado es T${weakIndex + 1}.`,
  };
}

function turnPlanScaleExplanation(turnPlan) {
  const source = turnPlan.samples ? "memoria de partidas similares + composicion actual" : "composicion actual";
  return `Escala 0-100: no son puntos de victoria. Cada numero es un indice relativo de fuerza de ese turno calculado con ${source}: movilidad, scoring, resistencia, dano, arquetipo, riesgo, rival, mision y layout. La recomendacion util esta en la accion de cada turno, no solo en el numero.`;
}

function turnAdviceItems(turnPlan) {
  const player = armyProfile(state.roster);
  const enemy = armyProfile(state.enemyRoster);
  const mission = $("#mission").value;
  const deployment = $("#deployment").value;
  const layout = $("#layout").value;
  const playstyle = $("#playstyle").value;
  const risk = Number($("#risk").value || 5);
  const experience = $("#experience").value;
  const enemyStyle = currentEnemyStyle();
  return turnPlan.turns.map((value, index) => {
    const turn = index + 1;
    return {
      turn: `T${turn}`,
      label: turnActionLabel(value, turn, turnPlan),
      body: turnAdviceText({ turn, value, turnPlan, player, enemy, mission, deployment, layout, playstyle, risk, experience, enemyStyle }),
    };
  });
}

function turnActionLabel(value, turn, turnPlan) {
  if (turn === turnPlan.bestTurn) return `turno pico (${Math.round(value)})`;
  if (turn === turnPlan.weakTurn) return `turno delicado (${Math.round(value)})`;
  if (value >= 66) return `ventana activa (${Math.round(value)})`;
  if (value >= 52) return `preparacion (${Math.round(value)})`;
  return `conservacion (${Math.round(value)})`;
}

function turnAdviceText(context) {
  const beginner = context.experience === "new";
  const conservative = context.risk <= 3;
  const aggressive = context.risk >= 8;
  const dense = /dense|ca2|ca4|ca6|ca7|wtc|ftc/i.test(context.layout);
  const open = /open|ca3|ca5/i.test(context.layout);
  const pieces = turnPersonalPieces(context);
  const lines = [];
  if (context.turn === 1) {
    if (context.enemyStyle === "alphaStrike" || context.enemy.shooting > 66) lines.push(dense ? `Despliega negando lineas con ${pieces.screen}; deja visible solo una pieza prescindible y conserva ${pieces.damage}.` : `Usa reservas o esquinas con ${pieces.damage}: en layout abierto no regales esa respuesta antes de que tenga blanco real.`);
    else if (["meleeRush", "alphaStrike"].includes(context.playstyle) && context.value >= 58) lines.push(`Avanza con ${pieces.pressure} para amenazar dos zonas, pero deja ${pieces.counter} como segunda oleada fuera de cargas faciles.`);
    else lines.push(`Prioriza staging con ${pieces.scorer}: puntua seguro, mide amenazas y no cambies ${pieces.damage} por dano sin puntos.`);
  } else if (context.turn === 2) {
    if (["meleeRush", "alphaStrike"].includes(context.playstyle)) lines.push(`Convierte la presion de ${pieces.pressure} en un intercambio completo: el blanco debe afectar primaria, secundarias o antitanque rival.`);
    else if (context.enemy.melee > context.player.melee + 12) lines.push(`Juega al countercharge: ofrece ${pieces.screen} como pantalla y guarda ${pieces.counter} para matar despues de que el rival se exponga.`);
    else lines.push(`Busca el primer trade positivo con ${pieces.trade} y deja ${pieces.scorer} listo para recuperar centro en T3.`);
  } else if (context.turn === 3) {
    if (context.turnPlan.bestTurn === 3) lines.push(`Este es tu turno de compromiso: usa ${pieces.anchor} para sostener centro y ${pieces.damage} para romper el recurso que sostiene el plan rival.`);
    else lines.push(`Evalua recursos vivos: si vas arriba, niega con ${pieces.scorer}; si vas abajo, concentra ${pieces.damage} y ${pieces.trade} en un solo flanco.`);
  } else if (context.turn === 4) {
    if (["supplyDrop", "terraform"].includes(context.mission)) lines.push(`Guarda movilidad de ${pieces.scorer} para cerrar acciones/primaria: no gastes esa unidad por una baja irrelevante.`);
    else lines.push(`Empieza a convertir ventajas en puntos finales con ${pieces.scorer}: niega secundarias y usa ${pieces.damage} solo si cambia el marcador.`);
  } else {
    lines.push(`Cierra el diferencial con ${pieces.scorer}: prioriza OC, acciones y secundarias probables sobre dano que no cambie puntos.`);
  }
  lines.push(missionDeploymentTurnNote(context, pieces));
  if (state.rulesEdition === "11e") lines.push(edition11TurnNote(context, pieces));
  if (beginner) lines.push("Para principiante: elige una tarea por unidad antes de moverla y evita planes que dependan de medir tres amenazas a la vez.");
  if (conservative) lines.push("Con tolerancia baja al riesgo, no hagas all-in si el trade no te da primaria o secundaria inmediata.");
  if (aggressive && context.turn === context.turnPlan.bestTurn) lines.push("Tu tolerancia alta permite una jugada de tempo, pero guarda una unidad de rescate para el siguiente turno.");
  if (open && context.enemy.shooting > 62) lines.push("El layout abierto aumenta el castigo por exponerte: usa movimiento minimo hasta tener un objetivo claro.");
  return lines.join(" ");
}

function edition11TurnNote(context, pieces) {
  const terrain = $("#terrainProfile")?.value || "balancedAreas";
  const ownDisposition = $("#forceDisposition")?.value || inferForceDisposition("player");
  const enemyDisposition = $("#enemyForceDisposition")?.value || inferForceDisposition("enemy");
  const terrainInfo = terrainProfileInfo(terrain);
  const notes = [];
  if (context.turn === 1) {
    if (terrainInfo.hidden) notes.push(`En 11va, usa el terreno para preservar Hidden con ${pieces.scorer} o ${pieces.trade}; no dispares con una unidad si perder Hidden abre una activacion rival decisiva.`);
    if (terrain === "openLanes") notes.push(`Con lineas abiertas, protege ${pieces.damage} en reserva, detras de area o fuera de angulos; aqui el primer error de exposicion pesa mas que el dano temprano.`);
  }
  if (ownDisposition === "reconnaissance" && context.turn >= 2) notes.push(`Tu Force Disposition premia rutas: ${pieces.scorer} debe moverse antes de que ${pieces.damage} busque bajas.`);
  if (ownDisposition === "priorityTargets" && context.turn <= 3) notes.push(`Para Priority Targets, asigna ${pieces.damage} a la pieza rival que mas altere primaria o secundarias; matar una unidad irrelevante no sostiene la mision.`);
  if (ownDisposition === "disruption" && context.turn <= 2) notes.push(`Para Disruption, ${pieces.pressure} debe obligar al rival a puntuar mal, no solo a retroceder.`);
  if (enemyDisposition === "purgeFoe" && context.turn <= 2) notes.push(`Como el rival puntua por destruccion, sacrifica solo ${pieces.screen} y evita entregar unidades medianas sin ganar posicion.`);
  if (terrain === "objectiveStrongholds" && context.turn >= 2) notes.push(`Los objetivos como terreno hacen que ${pieces.anchor} y OC repartido sean mas valiosos que perseguir kills fuera de zona.`);
  return notes.join(" ");
}

function missionDeploymentTurnNote(context, pieces) {
  const preset = selectedMissionPreset();
  const missionName = preset?.missionName || missionDisplayName(context.mission);
  const deploymentName = preset?.deploymentName || deploymentDisplayName(context.deployment);
  const missionPlan = missionTurnInstruction(context.mission, context.turn, pieces);
  const deploymentPlan = deploymentTurnInstruction(context.deployment, context.turn, pieces);
  const prefix = preset ? `CA ${preset.letter}, ${missionName} / ${deploymentName}` : `${missionName} / ${deploymentName}`;
  return `${prefix}: ${missionPlan} ${deploymentPlan}`;
}

function missionDisplayName(value) {
  const found = chapterApprovedMissionPool.find((mission) => mission.mission === value);
  if (found) return found.missionName;
  const labels = {
    takeHold: "Take and Hold",
    supplyDrop: "Supply Drop",
    purgeFoe: "Purge the Foe",
    scorchedEarth: "Scorched Earth",
    hiddenSupplies: "Hidden Supplies",
    linchpin: "Linchpin",
    terraform: "Terraform",
  };
  return labels[value] || "Mision";
}

function missionTurnInstruction(mission, turn, pieces) {
  const plans = {
    takeHold: [
      `marca desde despliegue que objetivo toma ${pieces.scorer}.`,
      `usa ${pieces.trade} para negar primaria, no solo para matar.`,
      `si no controlas centro, compromete ${pieces.anchor} ahora.`,
      `recupera OC con ${pieces.scorer} antes de buscar kills.`,
      `cierra con OC; una baja sin primaria no vale el riesgo.`,
    ],
    supplyDrop: [
      `no gastes todas las piezas moviles; esta mision paga tarde.`,
      `cambia barato y conserva ${pieces.scorer} para T4-T5.`,
      `toma posicion, pero evita perder tu ultima unidad rapida.`,
      `este es turno clave: ${pieces.scorer} debe llegar a objetivo relevante.`,
      `todo movimiento debe convertir en primaria o secundaria final.`,
    ],
    purgeFoe: [
      `no regales MSU: cada baja puede mover el diferencial.`,
      `mata unidades completas con ${pieces.damage}; dejar heridas vivas suele perder valor.`,
      `elige un blanco que cambie kills y primaria al mismo tiempo.`,
      `si vas arriba, niega exposiciones; si vas abajo, concentra dano.`,
      `puntua el diferencial: mata lo seguro antes que lo espectacular.`,
    ],
    scorchedEarth: [
      `protege la unidad que hara accion, normalmente ${pieces.scorer}.`,
      `abre ruta con ${pieces.trade} antes de comprometer al runner.`,
      `si la accion esta disponible, priorizala sobre dano marginal.`,
      `usa ${pieces.scorer} para amenazar quemar o negar objetivo.`,
      `cierra acciones; no persigas bajas lejos de los objetivos.`,
    ],
    hiddenSupplies: [
      `hay mas mesa que cubrir: reparte ${pieces.screen} y ${pieces.scorer}.`,
      `pelea por dos zonas, no por todo el tablero a la vez.`,
      `el centro necesita relevo: guarda ${pieces.trade} para recuperar.`,
      `si tienes ventaja de OC, juega denial y no sobreexpongas.`,
      `mantente en objetivos; el rival necesita quitarte presencia real.`,
    ],
    linchpin: [
      `no abandones home: ${pieces.anchor} debe sostener tu base o centro.`,
      `usa ${pieces.screen} para impedir que te apaguen el ancla.`,
      `refuerza la zona clave con ${pieces.counter}; no persigas flancos malos.`,
      `si tu home cae, recuperala antes de buscar kills laterales.`,
      `cierra con ancla viva y una pieza movil para negar.`,
    ],
    terraform: [
      `define que unidad terraformara y cual solo la protege.`,
      `compra tiempo con ${pieces.screen}; la accion vale mas que una baja pequena.`,
      `si puedes terraformar sin perder ${pieces.scorer}, hazlo ahora.`,
      `protege zonas ya trabajadas; no reinicies el plan por una kill.`,
      `remata puntos de accion y niega al rival su ultimo intento.`,
    ],
  };
  return (plans[mission] || plans.takeHold)[Math.max(0, Math.min(4, turn - 1))];
}

function deploymentTurnInstruction(deployment, turn, pieces) {
  const plans = {
    hammer: [
      `En Hammer and Anvil, respeta lineas largas: reserva o esconde ${pieces.damage}.`,
      `cruza solo con cobertura; si corres por el centro, el rival elige el trade.`,
      `usa la profundidad para mantener ${pieces.anchor} fuera de amenazas faciles.`,
      `empuja cuando el rival ya gasto sus angulos buenos.`,
      `la distancia favorece cerrar con unidades moviles, no con persecuciones largas.`,
    ],
    search: [
      `En Search and Destroy, controla esquinas: ${pieces.scorer} debe amenazar cuadrantes.`,
      `no concentres todo en una esquina; abre dos rutas de scoring.`,
      `castiga el flanco que el rival dejo debil con ${pieces.pressure}.`,
      `si vas ganando, bloquea accesos diagonales con ${pieces.screen}.`,
      `usa la diagonal para negar lineas y robar el ultimo objetivo.`,
    ],
    tippingPoint: [
      `En Tipping Point, mide charges tempranas y deja pantalla delante de ${pieces.damage}.`,
      `el choque llega pronto: cambia ${pieces.trade} por posicion, no por orgullo.`,
      `refuerza el lado fuerte y concede el lado malo si cuesta demasiado.`,
      `mantente en dos objetivos; perseguir el tercero puede abrir tu backfield.`,
      `cierra el flanco que aun tenga OC, no el que solo tenga dano.`,
    ],
    crucible: [
      `En Crucible, no sobreextiendas diagonalmente; protege el angulo de contraataque.`,
      `usa ${pieces.screen} para cortar rutas hacia tu pieza clave.`,
      `rompe un lado del cruce con ${pieces.damage} antes de entrar al centro.`,
      `si el centro esta caro, puntua desde borde y obliga al rival a salir.`,
      `mantente compacto: separarte tarde da objetivos faciles.`,
    ],
    sweeping: [
      `En Sweeping Engagement, el tablero se abre lateralmente: asigna ${pieces.scorer} a flanco desde T1.`,
      `no cambies ambos flancos a la vez; gana uno y bloquea el otro.`,
      `usa ${pieces.pressure} para obligar al rival a girar su ejercito.`,
      `guarda una unidad movil para volver al centro.`,
      `el ultimo turno premia flanco vivo mas que dano central.`,
    ],
    dawn: [
      `En Dawn of War, el centro es honesto pero peligroso: entra con pantalla primero.`,
      `si el rival tiene mas disparo, no abras todas las lineas en T2.`,
      `usa ${pieces.anchor} para sostener centro y ${pieces.trade} para limpiar laterales.`,
      `mantente flexible: este deployment castiga comprometer todo en una sola banda.`,
      `cierra con la unidad de OC mas segura, no con la mas letal.`,
    ],
  };
  return (plans[deployment] || plans.dawn)[Math.max(0, Math.min(4, turn - 1))];
}

function turnPersonalPieces(context) {
  const fallback = "tu unidad mas eficiente";
  return {
    scorer: bestTurnUnitName(context, ["Scorer", "Objective holder", "Deep strike"], fallback),
    screen: bestTurnUnitName(context, ["Pantalla", "Scorer"], fallback),
    damage: bestTurnUnitName(context, context.enemy.durability > 62 ? ["Dano antitanque", "Disparo", "Melee"] : ["Disparo", "Dano antiinfanteria", "Melee"], fallback),
    pressure: bestTurnUnitName(context, ["Melee", "Deep strike", "Trading piece", "Scorer"], fallback),
    trade: bestTurnUnitName(context, ["Trading piece", "Melee", "Disparo"], fallback),
    counter: bestTurnUnitName(context, ["Countercharge", "Melee", "Ancla"], fallback),
    anchor: bestTurnUnitName(context, ["Ancla", "Objective holder", "Durabilidad"], fallback),
  };
}

function bestTurnUnitName(context, labels, fallback) {
  const roster = state.roster || [];
  if (!roster.length) return fallback;
  const scored = roster
    .map((unitData) => {
      const roleScore = labels.reduce((sum, label) => sum + unitRoleScoreValue(unitData, label), 0);
      const recommended = unitData.recommended ? 0.7 : 0;
      const aliveLateBonus = context.turn >= 4 && unitFeatures(unitData).speed ? 0.4 : 0;
      const riskTax = context.risk <= 3 && complexityScore(unitData) >= 3 ? -0.6 : 0;
      return { unitData, score: roleScore + recommended + aliveLateBonus + riskTax };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || unitTotalPoints(b.unitData) - unitTotalPoints(a.unitData));
  return scored[0]?.unitData?.name || fallback;
}

function unitRoleScoreValue(unitData, label) {
  const wanted = normalizeName(label);
  const match = unitRoleScores(unitData).find((score) => normalizeName(score.label) === wanted);
  return match ? match.value / 10 : 0;
}

function inferredTurnPlan() {
  const player = armyProfile(state.roster);
  const enemy = armyProfile(state.enemyRoster);
  const playstyle = $("#playstyle").value;
  const risk = Number($("#risk").value || 5);
  let early = player.mobility * 0.34 + player.melee * 0.22 + player.antiTank * 0.18 + player.control * 0.14 + (playstyle === "alphaStrike" ? 12 : 0) + (playstyle === "meleeRush" ? 10 : 0);
  let mid = player.scoring * 0.28 + player.control * 0.24 + player.durability * 0.22 + Math.max(player.melee, player.shooting) * 0.16 + (playstyle === "midrange" ? 8 : 0);
  let late = player.durability * 0.26 + player.scoring * 0.26 + player.control * 0.18 + player.mobility * 0.16 + (playstyle === "attrition" ? 10 : 0);
  if (state.rulesEdition === "11e") {
    const disposition = $("#forceDisposition")?.value || inferForceDisposition("player");
    const terrain = $("#terrainProfile")?.value || "balancedAreas";
    if (disposition === "disruption") early += 8;
    if (disposition === "priorityTargets") early += 5;
    if (disposition === "purgeFoe") mid += 7;
    if (disposition === "takeHold") {
      mid += 5;
      late += 4;
    }
    if (disposition === "reconnaissance") {
      early += 3;
      late += 7;
    }
    if (terrain === "denseHidden") {
      early -= player.shooting > player.melee ? 4 : 1;
      mid += 5;
    }
    if (terrain === "objectiveStrongholds") {
      mid += 4;
      late += 5;
    }
    if (terrain === "openLanes") early += player.shooting > 58 ? 4 : -3;
    if (terrain === "mixedVertical") {
      early += player.mobility > 58 ? 4 : -2;
      late += 3;
    }
  }
  const enemyEarlyTax = Math.max(enemy.melee, enemy.shooting) > 68 ? 6 : 0;
  const swing = risk >= 8 ? 4 : risk <= 3 ? -2 : 0;
  return [
    clampPercent(early * 0.95 + swing - enemyEarlyTax),
    clampPercent((early + mid) * 0.52),
    clampPercent(mid),
    clampPercent((mid + late) * 0.5),
    clampPercent(late),
  ];
}

function historicalTurnPlan() {
  const relevant = relevantHistoryMatches().filter((report) => ["win", "loss", "draw"].includes(report.result));
  const reports = relevant.length ? relevant : state.matchHistory.filter((report) => ["win", "loss", "draw"].includes(report.result)).slice(0, 10);
  if (!reports.length) return { samples: 0, turns: [0, 0, 0, 0, 0] };
  const totals = [0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0];
  reports.forEach((report) => {
    combinedTurnScores(report).forEach((value, index) => {
      if (Number(value) > 0) {
        totals[index] += Number(value);
        counts[index] += 1;
      }
    });
  });
  const maxAverage = Math.max(1, ...totals.map((value, index) => counts[index] ? value / counts[index] : 0));
  return {
    samples: reports.length,
    turns: totals.map((value, index) => counts[index] ? clampPercent((value / counts[index]) / maxAverage * 82) : 36),
  };
}

function missionRecommendationItems(turnPlan) {
  const preset = selectedMissionPreset();
  const mission = $("#mission").value;
  const deployment = $("#deployment").value;
  const layout = $("#layout").value;
  const player = armyProfile(state.roster);
  const enemy = armyProfile(state.enemyRoster);
  const enemyStyle = currentEnemyStyle();
  const history = historyAnalysisModifier();
  const items = [];

  items.push({ title: `Marco de reglas: ${currentEditionProfile().label}`, body: editionPlanText(player, enemy) });
  if (state.rulesEdition === "11e") {
    items.push({ title: "Mision 11va / Force Dispositions", body: forceDispositionAnalysisText(player, enemy) });
    items.push({ title: "Terreno 11va", body: terrainAnalysisText(player, enemy) });
  }
  items.push({ title: "Plan de mision", body: missionPlanText(mission, player, enemy, turnPlan) });
  if (state.enemyRoster.length) {
    items.push({ title: "Matchup directo", body: matchupPlanText(player, enemy) });
    items.push({ title: "Amenazas de la lista rival", body: enemyThreatPlanText(player, enemy) });
    items.push({ title: "Tus respuestas al rival", body: playerResponsePlanText(player, enemy) });
  }
  items.push({ title: "Secundarias sugeridas", body: missionSecondaryAdvice(mission, player, enemy) });
  items.push({ title: "Deployment y layout", body: deploymentPlanText(deployment, layout, player, enemy, enemyStyle) });
  items.push({ title: "Factores del calculo", body: analysisFactorText(player, enemy, turnPlan) });
  items.push({ title: "Secuencia sugerida", body: turnSequenceText(turnPlan, mission, player, enemy) });
  if (history.samples) items.push({ title: "Memoria historica", body: `${history.summary} Ajusta el plan: si el diferencial es negativo, juega mas conservador T1-T2 y fuerza scoring repetible antes de intercambiar caro.` });
  if (preset) items.push({ title: `Chapter Approved ${preset.letter}`, body: `Esta combinacion fija ${preset.missionName} con ${preset.deploymentName}. No evalues mision y deployment por separado: el plan debe resolver ambos al mismo tiempo.` });
  return items;
}

function editionPlanText(player, enemy) {
  const edition = currentEditionProfile();
  if (state.rulesEdition === "10e") return "Analisis en 10ma: se mantienen los pesos originales de OC, Chapter Approved, battleshock, estratagemas, reglas de faccion/detachment y datasheets actuales.";
  const enemyText = state.enemyRoster.length ? ` Contra el rival cargado, ${enemy.control > player.control ? "debes negar control de terreno antes de buscar dano" : "tu control de mesa no esta por debajo del rival, asi que puedes convertir trades en puntos"}.` : "";
  return `${edition.summary} ${forceDispositionPlanText()} ${terrainPlanText(player, enemy)}${enemyText}`;
}

function forceDispositionPlanText() {
  if (state.rulesEdition !== "11e") return "";
  const own = $("#forceDisposition")?.value || inferForceDisposition("player");
  const enemy = $("#enemyForceDisposition")?.value || inferForceDisposition("enemy");
  return `Mision asimetrica: tu Force Disposition es ${forceDispositionLabel(own)} y la rival ${forceDispositionLabel(enemy)}; el plan se evalua por cumplir tu condicion primaria sin regalar la condicion rival.`;
}

function terrainPlanText(player, enemy) {
  if (state.rulesEdition !== "11e") return "";
  const profile = terrainProfileInfo($("#terrainProfile")?.value || "balancedAreas");
  const warning = profile.hidden && enemy.shooting > player.durability + 10
    ? " Usa Hidden para negar disparo largo y obligar al rival a entrar en tu rango de respuesta."
    : "";
  return `Terreno: ${profile.label}. ${profile.advice}${warning}`;
}

function forceDispositionAnalysisText(player, enemy) {
  const own = $("#forceDisposition")?.value || inferForceDisposition("player");
  const rival = $("#enemyForceDisposition")?.value || inferForceDisposition("enemy");
  const ownScore = forceDispositionScore(player, own);
  const rivalScore = state.enemyRoster.length ? forceDispositionScore(enemy, rival) : 55;
  const denial = state.enemyRoster.length ? forceDispositionDenialScore(player, rival) : forceDispositionDenialScore(player, rival) * 0.72;
  const plan = [];
  if (own === "takeHold") plan.push("gana por OC repetible: no cambies tus unidades de puntaje antes de obligar al rival a entrar al terreno");
  if (own === "disruption") plan.push("usa presion y pantallas para que el rival tenga turnos incomodos de primaria, aunque no mates demasiado");
  if (own === "purgeFoe") plan.push("concentra dano: una unidad destruida vale mas que heridas repartidas");
  if (own === "priorityTargets") plan.push("marca desde despliegue que amenazas deben caer primero y conserva tus piezas de dano hasta tener blanco real");
  if (own === "reconnaissance") plan.push("prioriza rutas, reservas y unidades moviles; matar es secundario si no te abre una ruta de puntaje");
  return `Tu ajuste: ${forceDispositionLabel(own)} (${Math.round(ownScore)}) contra ${forceDispositionLabel(rival)} (${Math.round(rivalScore)}). Denial estimado ${Math.round(denial)}. Plan: ${plan.join("; ")}.`;
}

function terrainAnalysisText(player, enemy) {
  const terrainKey = $("#terrainProfile")?.value || "balancedAreas";
  const terrain = terrainProfileInfo(terrainKey);
  const ownFit = terrainFitScore(player, terrainKey);
  const enemyFit = state.enemyRoster.length ? terrainFitScore(enemy, terrainKey) : 55;
  const advice = [];
  if (terrain.hidden) advice.push("usa Hidden como recurso: decide que unidades disparan y cuales se quedan sin revelar para puntuar despues");
  if (terrainKey === "openLanes") advice.push("en lineas abiertas, reserva o esconde dano clave y no entregues unidades medianas sin puntaje inmediato");
  if (terrainKey === "objectiveStrongholds") advice.push("las unidades durables con OC deben entrar al terreno antes que las piezas puramente ofensivas");
  if (terrainKey === "denseHidden") advice.push("el valor sube para melee, trading y control de rutas; baja el alpha de disparo que no pueda reposicionarse");
  if (terrainKey === "mixedVertical") advice.push("prioriza deep strike, vuelo, infiltracion y piezas que puedan cambiar de ruta sin perder turnos");
  const enemyText = state.enemyRoster.length ? ` El rival calza ${Math.round(enemyFit)}; si supera tu valor, juega denial antes de buscar trades.` : " Sin lista rival, se compara contra una base neutral.";
  return `${terrain.label}: tu ajuste ${Math.round(ownFit)}.${enemyText} ${advice.join(" ")}`;
}

function missionSecondaryAdvice(mission, player, enemy) {
  const scored = missionSecondaryScores(mission, player, enemy);
  const good = scored.slice(0, 3).map((item) => `${item.secondary} (${signedDecimal(item.score)})`);
  const bad = scored.slice(-3).reverse().map((item) => `${item.secondary} (${signedDecimal(item.score)})`);
  return `Convienen: ${good.join(", ")}. Evita o toma con cuidado: ${bad.join(", ")}. La recomendacion cruza memoria, mision, movilidad, OC/control y perfil del rival.`;
}

function matchupPlanText(player, enemy) {
  const factors = matchupBreakdown(player, enemy).sort((a, b) => a.value - b.value);
  const worst = factors[0];
  const best = [...factors].sort((a, b) => b.value - a.value)[0];
  const advice = [];
  if (player.antiTank < enemy.durability - 12) advice.push("no intentes resolver todo por bajas: concentra anti-tank en una pieza por turno y puntua/niega el resto");
  if (enemy.mobility > player.control + 12) advice.push("usa pantallas para cortar rutas y reserva unidades de OC para recuperar objetivos, no para trades tempranos");
  if (enemy.scoring + enemy.control > player.scoring + player.control + 18) advice.push("la partida se gana negando primarias: prioriza move-block, OC y secundarias seguras sobre dano marginal");
  if (enemy.shooting > player.durability + 15) advice.push("evita lineas largas T1: staged deployment, reservas y sacrificar solo piezas baratas");
  if (!advice.length) advice.push("el matchup parece jugable: decide desde despliegue que recurso rival vas a negar primero");
  return `Mayor ventaja: ${best.label} (${signedDecimal(best.value)}, ${best.note}). Mayor riesgo: ${worst.label} (${signedDecimal(worst.value)}, ${worst.note}). Plan: ${advice.slice(0, 2).join("; ")}.`;
}

function enemyThreatPlanText(player, enemy) {
  const threats = enemyThreatItems(player, enemy);
  if (!threats.length) return "La lista rival no muestra una amenaza unica dominante. Juega por negar puntos, no por perseguir bajas aisladas.";
  return threats.slice(0, 3).map((item) => `${item.title}: ${item.body}`).join(" ");
}

function playerResponsePlanText(player, enemy) {
  const responses = playerResponseItems(player, enemy);
  if (!responses.length) return "Tu lista tiene respuestas razonablemente balanceadas. El valor esta en asignarlas por tarea: scorer para puntos, dano para amenazas y pantalla para negar tempo.";
  return responses.slice(0, 3).map((item) => `${item.title}: ${item.body}`).join(" ");
}

function enemyThreatItems(player, enemy) {
  if (!state.enemyRoster.length) return [];
  const items = [];
  const enemyStyle = currentEnemyStyle();
  if (enemy.antiTank > player.durability - 6 || enemy.shooting > 62) {
    items.push({
      title: "Disparo/anti-tank rival",
      body: `${topUnitNamesForRoles(state.enemyRoster, ["antiTank", "shooting"])} son las piezas que mas castigan exposicion. En despliegue, no les regales tu ancla ni tu respuesta principal antes de tener blanco de vuelta.`,
      urgency: enemy.antiTank + enemy.shooting - player.durability,
    });
  }
  if (enemy.melee > player.melee - 5 || enemyStyle === "meleeRush") {
    items.push({
      title: "Presion melee rival",
      body: `${topUnitNamesForRoles(state.enemyRoster, ["melee", "mobility"])} pueden convertir un error de pantalla en perdida de primaria. Deja una unidad barata como cebo y la respuesta real a 3-5 pulgadas detras.`,
      urgency: enemy.melee + enemy.mobility - player.control,
    });
  }
  if (enemy.scoring + enemy.control > player.scoring + player.control + 8 || ["horde", "mobilityTempo", "trading"].includes(enemyStyle)) {
    items.push({
      title: "Scoring y control rival",
      body: `${topUnitNamesForRoles(state.enemyRoster, ["scoring", "control", "mobility"])} son las piezas que ganan sin matar. Prioriza negarles rutas y OC, incluso si otra unidad parece mas peligrosa en dano.`,
      urgency: enemy.scoring + enemy.control - player.scoring - player.control,
    });
  }
  if (enemy.durability > player.antiTank + 10 || enemyStyle === "skew" || enemyStyle === "attrition") {
    items.push({
      title: "Resistencia/skew rival",
      body: `${topUnitNamesForRoles(state.enemyRoster, ["durability"])} no deben recibir dano disperso. Si no puedes matar una pieza completa, usa ese turno para puntuar, encerrar o aislar.`,
      urgency: enemy.durability - player.antiTank,
    });
  }
  return items.sort((a, b) => b.urgency - a.urgency);
}

function playerResponseItems(player, enemy) {
  if (!state.roster.length || !state.enemyRoster.length) return [];
  const items = [];
  if (enemy.durability > 58 || enemy.antiTank > 58) {
    items.push({
      title: "Respuesta a piezas duras",
      body: `${topUnitNamesForRoles(state.roster, ["antiTank", "shooting", "melee"])} deben concentrar activaciones en una amenaza por turno. No dividas dano si el resultado no cambia primaria o secundarias.`,
      urgency: enemy.durability - player.antiTank,
    });
  }
  if (enemy.mobility + enemy.scoring > 112) {
    items.push({
      title: "Respuesta a movilidad/scoring",
      body: `${topUnitNamesForRoles(state.roster, ["control", "scoring", "mobility"])} son tus piezas para cerrar rutas, recuperar objetivo y negar secundarias. Usalas antes de gastar dano premium.`,
      urgency: enemy.mobility + enemy.scoring - player.control - player.scoring,
    });
  }
  if (enemy.melee > 58) {
    items.push({
      title: "Respuesta a cargas",
      body: `${topUnitNamesForRoles(state.roster, ["durability", "control", "melee"])} deben jugar como pantalla y contra-carga. El primer contacto rival debe pegarle a algo que puedas permitirte perder.`,
      urgency: enemy.melee - player.control,
    });
  }
  if (enemy.shooting > 60) {
    items.push({
      title: "Respuesta a gunline/alpha",
      body: `${topUnitNamesForRoles(state.roster, ["mobility", "durability", "scoring"])} son las piezas para staging, reservas y puntuar sin exponerte. En layout abierto, tu primera meta es sobrevivir T1.`,
      urgency: enemy.shooting - player.durability,
    });
  }
  return items.sort((a, b) => b.urgency - a.urgency);
}

function topUnitNamesForRoles(units, roles, limit = 3) {
  const names = [...new Set(topUnitsForRoles(units, roles, limit + 3).map((item) => item.unit.name))].slice(0, limit);
  return names.length ? names.join(", ") : "las unidades clave de ese rol";
}

function topUnitsForRoles(units, roles, limit = 3) {
  return units
    .map((unitData) => {
      const profile = unitProfileScores(unitData);
      const roleScore = roles.reduce((sum, role) => sum + Number(profile[role] || 0), 0) / Math.max(1, roles.length);
      const pointBias = Math.min(0.12, unitTotalPoints(unitData) / Math.max(1, state.gameSize) * 0.35);
      return { unit: unitData, score: roleScore + pointBias };
    })
    .filter((item) => item.score >= 0.34)
    .sort((a, b) => b.score - a.score || unitTotalPoints(b.unit) - unitTotalPoints(a.unit))
    .slice(0, limit);
}

function missionSecondaryScores(mission, player, enemy) {
  const records = historySecondaryRecords();
  const recordMap = new Map(records.map((item) => [item.name, item]));
  return knownSecondaryNames().map((secondary) => {
    let score = 0;
    if (recordMap.has(secondary)) score += clampNumber(recordMap.get(secondary).score, -2, 2);
    const key = normalizeName(secondary);
    if (/cleanse|extend battle lines|secure no mans land|area denial/.test(key)) score += (player.scoring + player.control - enemy.control) / 70;
    if (/behind enemy lines|engage on all fronts|establish locus|sabotage/.test(key)) score += (player.mobility + player.control - enemy.mobility) / 75;
    if (/bring it down/.test(key)) score += enemy.antiTank > 58 || enemy.durability > 62 ? 1.2 : -0.7;
    if (/assassination/.test(key)) score += countCharacterLike(state.enemyRoster) >= 4 ? 1.2 : -0.6;
    if (/no prisoners/.test(key)) score += enemy.control > 58 || enemy.scoring > 62 ? 0.8 : -0.35;
    if (/overwhelming force|marked for death/.test(key)) score += Math.max(player.shooting, player.melee) > 62 ? 0.7 : -0.35;
    if (mission === "scorchedEarth" && /sabotage|behind enemy lines|establish locus/.test(key)) score += 0.7;
    if (mission === "takeHold" && /cleanse|secure no mans land|area denial/.test(key)) score += 0.6;
    if (mission === "purgeFoe" && /bring it down|assassination|no prisoners|marked for death/.test(key)) score += 0.55;
    if (mission === "supplyDrop" && /extend battle lines|engage on all fronts|secure no mans land/.test(key)) score += 0.45;
    if (mission === "linchpin" && /defend stronghold|area denial|secure no mans land/.test(key)) score += 0.55;
    if (mission === "terraform" && /cleanse|extend battle lines|establish locus/.test(key)) score += 0.6;
    return { secondary, score };
  }).sort((a, b) => b.score - a.score);
}

function signedDecimal(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function secondaryPlanModifier(player, enemy) {
  if (!state.enemyRoster.length) return 0;
  const scored = missionSecondaryScores($("#mission").value, player, enemy);
  if (!scored.length) return 0;
  const top = scored.slice(0, 3).reduce((sum, item) => sum + item.score, 0) / Math.min(3, scored.length);
  const bottomRisk = Math.abs(Math.min(0, scored.slice(-3).reduce((sum, item) => sum + item.score, 0) / Math.min(3, scored.length)));
  return clampNumber(top * 1.35 - bottomRisk * 0.35, -4.5, 4.5);
}

function turnPlanModifier(turnPlan = missionTurnPlan()) {
  const mission = $("#mission").value;
  const turns = turnPlan.turns || [50, 50, 50, 50, 50];
  const early = (turns[0] + turns[1]) / 2;
  const mid = turns[2];
  const late = (turns[3] + turns[4]) / 2;
  let target = (early + mid + late) / 3;
  if (["supplyDrop", "terraform"].includes(mission)) target = late * 0.5 + mid * 0.3 + early * 0.2;
  if (["purgeFoe", "scorchedEarth"].includes(mission)) target = early * 0.42 + mid * 0.38 + late * 0.2;
  if (["takeHold", "hiddenSupplies", "linchpin"].includes(mission)) target = mid * 0.42 + late * 0.33 + early * 0.25;
  return clampNumber((target - 54) / 4.8, -5.5, 5.5);
}

function analysisFactorItems(player, enemy, turnPlan) {
  return analysisWeightedFactors(player, enemy, turnPlan).map((item) => ({
    label: item.label,
    value: item.contribution,
    note: `${item.note}; peso ${item.weight}%`,
  }));
}

function matchupFactorSummary(player, enemy) {
  const factors = matchupBreakdown(player, enemy).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 2);
  return factors.map((item) => `${item.label.toLowerCase()} ${signedDecimal(item.value)}`).join(", ") || "sin diferencial claro";
}

function analysisFactorText(player, enemy, turnPlan) {
  const items = analysisFactorItems(player, enemy, turnPlan);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return `${items.map((item) => `${item.label} ${signedDecimal(item.value)}: ${item.note}`).join(" / ")}. Impacto total ${signedDecimal(total)} puntos de probabilidad.`;
}

function missionPlanText(mission, player, enemy, turnPlan) {
  if (state.rulesEdition === "11e") {
    const own = $("#forceDisposition")?.value || inferForceDisposition("player");
    const rival = $("#enemyForceDisposition")?.value || inferForceDisposition("enemy");
    const missionPlans = {
      takeHold: "Tu primaria pide presencia estable: conserva OC, entra a objetivos con redundancia y no cambies tu ultima pieza de mesa por dano.",
      disruption: "Tu primaria pide incomodar al rival: pantallas, move-block y presion lateral valen tanto como matar.",
      purgeFoe: "Tu primaria pide destruir recursos: concentra activaciones y evita dano disperso que no retire unidades completas.",
      priorityTargets: "Tu primaria pide elegir bien los blancos: mata lo que altera puntos, no lo que se ve mas facil.",
      reconnaissance: "Tu primaria pide rutas: movilidad, reservas y unidades de accion deben vivir mas que tus piezas puramente ofensivas.",
    };
    const denialPlans = {
      takeHold: "Al rival le niegas OC sacandolo de objetivos antes de que consolide dos turnos.",
      disruption: "Al rival le niegas valor evitando entregarle cargas o bloqueos gratis.",
      purgeFoe: "Al rival le niegas valor no regalando unidades medianas sin ganar primaria o secundaria.",
      priorityTargets: "Al rival le niegas valor escondiendo sus objetivos prioritarios hasta que puedas responder.",
      reconnaissance: "Al rival le niegas valor cerrando rutas con pantallas y control lateral.",
    };
    const timing = turnPlan.bestTurn >= 4 ? " Como tu pico es tardio, T1-T2 deben comprar tiempo." : " Como tu pico llega temprano/medio, conviertelo en ventaja de mesa antes de quedarte sin recursos.";
    return `${missionPlans[own] || missionPlans.takeHold} ${denialPlans[rival] || denialPlans.takeHold}${timing}`;
  }
  const plans = {
    takeHold: "Prioriza OC y trading en medio campo. No basta matar: necesitas dos turnos buenos de primaria y una pieza que pueda recuperar objetivo despues del primer intercambio.",
    supplyDrop: "La mision se vuelve mas exigente al final. Conserva recursos moviles para T4-T5 y evita gastar todas las piezas de trading en los dos primeros turnos.",
    purgeFoe: "El diferencial de bajas importa mas. Evita regalar unidades pequenas si no compran puntos; busca intercambios donde destruyas una pieza completa o niegues activacion clave.",
    scorchedEarth: "Necesitas movilidad y ventanas para acciones. Protege unidades que puedan cruzar mesa y no comprometas todas tus piezas de accion antes de abrir rutas.",
    hiddenSupplies: "Hay mas presion sobre mesa y objetivos. Pantallas, OC y control lateral suben de valor; si el rival tiene mas control, juega denial antes de buscar kills.",
    linchpin: "Tu home y el centro pesan mucho. Deja una ancla real atras y usa piezas moviles para no partir tu castillo cuando el rival presione flancos.",
    terraform: "El plan premia presencia sostenida y acciones. Elige desde despliegue que unidades van a puntuar y cuales solo existen para comprarles un turno.",
  };
  const warning = enemy.durability > player.antiTank + 18 ? " Contra esta lista, tu anti-tank va justo: no dispares por comodidad, concentra activaciones." : "";
  const timing = turnPlan.bestTurn >= 4 ? " Tu plan parece mejorar tarde, asi que evita all-in temprano." : " Tu plan tiene pico temprano/medio, convierte presion en puntos antes de quedarte sin recursos.";
  return `${plans[mission] || "Juega la primaria con redundancia y no dependas de una sola unidad para puntuar."}${warning}${timing}`;
}

function deploymentPlanText(deployment, layout, player, enemy, enemyStyle) {
  const wide = ["hammer", "search"].includes(deployment);
  const close = ["tippingPoint", "crucible", "sweeping"].includes(deployment);
  const dense = /dense|ca2|ca4|ca6|ca7|wtc|ftc/i.test(layout);
  if (state.rulesEdition === "11e") {
    const terrain = terrainProfileInfo($("#terrainProfile")?.value || "balancedAreas");
    const hiddenNote = terrain.hidden ? "Hidden hace que el staging sea parte del plan: decide que unidad revela posicion y cual se queda viva para puntuar despues." : "Sin tanto Hidden, las lineas abiertas castigan despliegues ambiciosos: reserva dano y usa angulos cortos.";
    if (enemyStyle === "alphaStrike" || enemy.shooting > 68) return `${hiddenNote} Contra alpha/disparo rival, tu primera prioridad es que la pieza clave no pueda ser elegida sin que el rival se exponga.`;
    if (enemyStyle === "meleeRush" || enemy.melee > 68) return `${hiddenNote} Contra melee, usa terreno como embudo y deja countercharge detras del objetivo, no encima de el.`;
    if (terrain.label.includes("fortificados")) return `${hiddenNote} Los objetivos como terreno premian entrar con durabilidad y OC; despliega para ocupar dos zonas, no para perseguir el primer kill.`;
  }
  if (enemyStyle === "alphaStrike" || enemy.shooting > 68) return dense ? "Usa el terreno para negar el alpha. Despliega con redundancia: una pieza visible debe ser cebo, no tu unica respuesta." : "Layout abierto contra dano alto: reserva o esconde piezas clave, y acepta puntuar menos T1 si eso conserva recursos.";
  if (enemyStyle === "meleeRush" || enemy.melee > 68) return close ? "Deployment cercano contra melee: pantalla en capas, mide consolidaciones y deja countercharge detras, no al frente." : "Aprovecha la distancia para obligar charges largas y castigar el segundo oleaje.";
  if (wide && player.mobility < 52) return "Deployment ancho con movilidad baja: no sobreextiendas. Elige dos zonas de mesa y concede la tercera hasta tener intercambio favorable.";
  if (dense) return "Layout denso: valora unidades que atraviesan, hacen deep strike o puntuan sin linea directa. Evita atascar tus anclas detras de tus propias pantallas.";
  return "Deployment estable: define desde el inicio que unidad puntua, que unidad amenaza y que unidad se sacrifica para negar primarias.";
}

function turnSequenceText(turnPlan, mission, player, enemy) {
  const weak = `T${turnPlan.weakTurn}`;
  const peak = `T${turnPlan.bestTurn}`;
  if (turnPlan.bestTurn <= 2) return `Tu pico esta en ${peak}. Presiona temprano, pero deja una unidad de scoring para ${weak}; si no, la mision puede voltearse aunque ganes el primer intercambio.`;
  if (turnPlan.bestTurn >= 4) return `Tu pico esta en ${peak}. Juega T1-T2 a conservacion, trading barato y denial. La prioridad es llegar con recursos vivos al final.`;
  if (mission === "supplyDrop" || mission === "terraform") return `Tu mejor ventana esta en ${peak}. Usa T1 para posicion, T2-T3 para estabilizar primarias y reserva movilidad para cerrar T4-T5.`;
  return `Tu mejor ventana esta en ${peak}. Busca un intercambio positivo antes de ${weak}, y no gastes tus piezas de counterpunch solo para sumar dano sin puntos.`;
}

function layoutLabel(value) {
  const labels = {
    gw: "GW balanced",
    dense: "Denso",
    open: "Abierto",
    wtc: "WTC balanced",
    wtcDense: "WTC denso",
    wtcOpen: "WTC abierto",
    ftc: "FTC balanced",
    ftcDense: "FTC denso",
    ftcOpen: "FTC abierto",
    flg: "FLG balanced",
    flgDense: "FLG denso",
    flgOpen: "FLG abierto",
  };
  if (/^ca[1-8]$/.test(value || "")) return `CA Layout ${String(value).replace("ca", "")}`;
  return labels[value] || value || "Sin layout";
}

function sortedUnits(side) {
  const isEnemy = side === "enemy";
  const faction = isEnemy ? state.enemyFaction : state.faction;
  const playstyle = isEnemy ? $("#enemyStyle").value : $("#playstyle").value;
  return [...faction.units].sort((a, b) => unitFit(side, b, playstyle) - unitFit(side, a, playstyle));
}

function filteredUnits(side) {
  const isEnemy = side === "enemy";
  const query = normalizeSearch($(isEnemy ? "#enemyUnitSearch" : "#unitSearch").value);
  const units = sortedUnits(side);
  if (!query) return units;
  return units.filter((unitData) => {
    const haystack = normalizeSearch(`${unitData.name} ${unitData.section || ""} ${unitData.tags.join(" ")} ${unitData.styles.join(" ")}`);
    return query.split(" ").every((part) => haystack.includes(part));
  });
}

function groupBySection(units) {
  const groups = new Map(sectionOrder.map((section) => [section, []]));
  units.forEach((unitData) => {
    const section = sectionOrder.includes(unitData.section) ? unitData.section : "Other";
    groups.get(section).push(unitData);
  });
  return groups;
}

function groupIndexedRosterBySection(indexedUnits) {
  const groups = new Map(sectionOrder.map((section) => [section, []]));
  indexedUnits.forEach((item) => {
    const section = sectionOrder.includes(item.unitData.section) ? item.unitData.section : "Other";
    groups.get(section).push(item);
  });
  return groups;
}

function normalizeSearch(value) {
  return value.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function unitFit(side, unitData, playstyle) {
  const isEnemy = side === "enemy";
  const detachment = isEnemy ? state.enemyDetachment : state.detachment;
  const profile = isEnemy ? "competitive" : state.profile;
  const styleBonus = archetypeLegacyStyles(playstyle).some((style) => unitData.styles.includes(style)) ? 2 : 0;
  const detachmentStyles = activeDetachmentStyles(side);
  const detachmentBonus = unitData.styles.some((style) => detachmentStyles.includes(style)) ? 1.25 : 0;
  const metaBonus = isEnemy ? 0 : metaFit(unitData);
  const characterBonus = characterPlanScore(unitData, { side, profile, playstyle, baseUnits: [], needsWarlord: true, characterCount: 0 });
  const identityBonus = archetypeIdentityScore(unitData, { side, profile, playstyle, baseUnits: [], structure: {}, minimums: (archetypes[playstyle] || archetypes.midrange).minimums }) * 1.2;
  return unitData.ratings[profile] + styleBonus + identityBonus + detachmentBonus + metaBonus + characterBonus + editionUnitFit(unitData, playstyle);
}

function editionUnitFit(unitData, playstyle = "midrange") {
  if (state.rulesEdition !== "11e") return 0;
  const features = unitFeatures(unitData);
  let score = 0;
  score += (features.scoring || 0) * 0.45;
  score += (features.boardControl || 0) * 0.4;
  score += (features.speed || 0) * 0.35;
  score += (features.deepStrike || 0) * 0.3;
  score += (features.transport || 0) * 0.22;
  score += (features.independent || 0) * 0.28;
  if (features.shooting && !features.mobility && !features.independent && ["mobilityTempo", "trading", "meleeRush"].includes(playstyle)) score -= 0.35;
  if (features.buff && !features.independent && currentEditionProfile().features.noStratStacking) score -= 0.18;
  return clampNumber(score, -0.7, 1.25);
}

function metaFit(unitData) {
  const meta = $("#meta").value;
  const tagText = unitData.tags.join(" ");
  if (meta === "horde" && /blast|horde|screen|scoring|control/.test(tagText)) return 0.8;
  if (meta === "elite" && /anti-elite|mortal|elite|centerpiece/.test(tagText)) return 0.8;
  if (meta === "vehicle" && /anti-tank|vehicle|monster|threat/.test(tagText)) return 0.8;
  if (meta === "indirect" && /mobility|deep strike|infiltrate|scout/.test(tagText)) return 0.8;
  return 0;
}

function addUnit(side, unitData) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  if (totalPoints(units) + unitData.points <= state.gameSize * 1.1) {
    const added = rosterUnit(unitData, "manual");
    if (canBeWarlord(added) && !units.some((unit) => unit.config?.warlord)) added.config.warlord = true;
    units.push(added);
    syncInferredContext(side === "enemy");
    render();
  }
}

function autoPick(side) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  const context = autoPickContext(side, units);
  const additions = bestAutoPickAdditions(side, units);
  const added = additions.map((unitData, index) => {
    const rosterSoFar = [...units, ...additions.slice(0, index + 1)];
    const recommended = rosterUnit(unitData, "recommended");
    recommended.recommendation = buildRecommendationExplanation(unitData, context, rosterSoFar);
    return recommended;
  });
  if (!units.some((unit) => unit.config?.warlord)) {
    const warlord = added.find(canBeWarlord);
    if (warlord) warlord.config.warlord = true;
  }
  units.push(...added);
  syncInferredContext(side === "enemy");
  render();
}

function rosterUnit(unitData, source) {
  const detail = unitDetailForAny(unitData);
  return {
    ...unitData,
    basePoints: Number(unitData.basePoints || unitData.points || 0),
    instanceId: unitData.instanceId || makeUnitInstanceId(),
    imported: source === "imported",
    recommended: source === "recommended",
    recommendation: unitData.recommendation ? cloneData(unitData.recommendation) : null,
    config: {
      warlord: Boolean(unitData.config?.warlord),
      enhancement: unitData.config?.enhancement || "",
      enhancementPoints: Number(unitData.config?.enhancementPoints || 0),
      wargear: [...(unitData.config?.wargear || [])],
      wargearSelections: { ...(unitData.config?.wargearSelections || {}) },
      importedWargearCounts: { ...(unitData.config?.importedWargearCounts || {}) },
      modelCount: unitData.config?.modelCount || compositionModelRange(detail).min,
      leaderRef: unitData.config?.leaderRef || "",
    },
  };
}

function makeUnitInstanceId() {
  unitInstanceCounter += 1;
  return `unit-${Date.now()}-${unitInstanceCounter}`;
}

function bestAutoPickAdditions(side, baseUnits) {
  const remainingPoints = state.gameSize - totalPoints(baseUnits);
  const context = autoPickContext(side, baseUnits);
  const candidates = expandedAutoPickCandidates(side, baseUnits, context);
  if (remainingPoints <= 0 || !candidates.length) return [];
  const openPlan = searchBestCompletion(candidates, context);
  const characterPlan = searchWithPriorityCharacter(candidates, context, openPlan);
  return characterPlan || openPlan;
}

function searchWithPriorityCharacter(candidates, context, openPlan) {
  if ([...context.baseUnits, ...openPlan].some(isPriorityCharacter)) return null;
  const characterPlans = candidates
    .filter((unitData) => isPriorityCharacter(unitData))
    .filter((unitData) => totalPoints(context.baseUnits) + unitData.points <= state.gameSize)
    .filter((unitData) => canAddToCandidate([], unitData, context))
    .sort((a, b) => characterPlanScore(b, context) - characterPlanScore(a, context))
    .slice(0, 5)
    .map((character) => {
      const lockedBase = [...context.baseUnits, character];
      const lockedContext = { ...autoPickContext(context.side, lockedBase), baseUnits: lockedBase };
      const lockedPlan = [character, ...searchBestCompletion(candidates.filter((unitData) => unitData.name !== character.name), lockedContext)];
      return {
        plan: lockedPlan,
        points: totalPoints([...context.baseUnits, ...lockedPlan]),
        score: evaluateList([...context.baseUnits, ...lockedPlan], context),
      };
    })
    .sort((a, b) => b.score - a.score);
  if (!characterPlans.length) return null;

  const locked = characterPlans[0];
  const openScore = evaluateList([...context.baseUnits, ...openPlan], context);
  return locked.points >= state.gameSize * 0.9 && locked.score >= openScore - 12 ? locked.plan : null;
}

function searchBestCompletion(candidates, context) {
  const allCandidates = candidates;
  candidates = prioritizedCandidatePool(candidates, context);
  const beamWidth = context.experience === "expert" ? 20 : context.experience === "new" ? 12 : 16;
  const maxSteps = Math.min(state.gameSize >= 2000 ? 12 : 9, candidates.length);
  let beam = [{ additions: [], roster: context.baseUnits, points: totalPoints(context.baseUnits), score: evaluateList(context.baseUnits, context) }];

  for (let step = 0; step < maxSteps; step += 1) {
    const next = [...beam];
    beam.forEach((candidate) => {
      candidates.forEach((unitData) => {
        if (candidate.points + unitData.points > state.gameSize) return;
        const dynamicContext = contextForRoster(context, candidate.roster);
        if (!canAddToCandidate(candidate.additions, unitData, context)) return;
        const roster = [...candidate.roster, unitData];
        const additions = [...candidate.additions, unitData];
        const marginal = marginalAutoPickScore(unitData, candidate.roster, dynamicContext);
        if (candidate.points >= state.gameSize * 0.72 && marginal < -2.5) return;
        next.push({
          additions,
          roster,
          points: candidate.points + unitData.points,
          score: evaluateList(roster, contextForRoster(context, roster)) + marginal,
        });
      });
    });

    beam = uniqueCandidateLists(next)
      .sort((a, b) => b.score - a.score)
      .slice(0, beamWidth);
    if (beam[0]?.points >= state.gameSize * 0.985) break;
  }

  const best = beam
    .filter((candidate) => candidate.additions.length)
    .sort((a, b) => b.score - a.score)[0];
  return best ? fillRemainingPoints(best.additions, allCandidates, context) : [];
}

function prioritizedCandidatePool(candidates, context) {
  const sorted = [...candidates].sort((a, b) => autoPickValue(b, context) - autoPickValue(a, context));
  const coreLimit = context.experience === "expert" ? 36 : context.experience === "new" ? 24 : 30;
  const core = sorted.slice(0, coreLimit);
  const archetypeCore = [...candidates]
    .filter((unitData) => archetypeIdentityScore(unitData, context) > 1 || isUtilityAllowance(unitData, context))
    .sort((a, b) => archetypeIdentityScore(b, context) - archetypeIdentityScore(a, context))
    .slice(0, context.experience === "expert" ? 18 : 12);
  const epicHeroes = sorted
    .filter((unitData) => isEpicHero(unitData) && canAddToCandidate([], unitData, context))
    .slice(0, context.experience === "expert" ? 8 : 5);
  const priorityCharacters = sorted
    .filter((unitData) => isPriorityCharacter(unitData) && canAddToCandidate([], unitData, context))
    .sort((a, b) => characterPlanScore(b, context) - characterPlanScore(a, context))
    .slice(0, context.experience === "expert" ? 10 : 6);
  return [...new Map([...core, ...archetypeCore, ...epicHeroes, ...priorityCharacters].map((unitData) => [unitData.name, unitData])).values()];
}

function fillRemainingPoints(additions, candidates, context) {
  let currentAdditions = [...additions];
  let currentRoster = [...context.baseUnits, ...currentAdditions];
  let currentScore = evaluateList(currentRoster, contextForRoster(context, currentRoster));
  let attempts = 0;

  while (totalPoints(currentRoster) < state.gameSize * 0.985 && attempts < 8) {
    attempts += 1;
    const next = candidates
      .filter((unitData) => totalPoints(currentRoster) + unitData.points <= state.gameSize)
      .filter((unitData) => canAddToCandidate(currentAdditions, unitData, context))
      .map((unitData) => {
        const roster = [...currentRoster, unitData];
        const points = totalPoints(roster);
        const fillBonus = Math.min(points / state.gameSize, 1) * 10;
        const dynamicContext = contextForRoster(context, currentRoster);
        const marginal = marginalAutoPickScore(unitData, currentRoster, dynamicContext);
        return {
          unitData,
          points,
          score: evaluateList(roster, contextForRoster(context, roster)) + fillBonus + marginal,
        };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (!next) break;
    const currentPoints = totalPoints(currentRoster);
    if (currentPoints >= state.gameSize * 0.92 && next.score < currentScore - 1.5) break;
    currentAdditions = [...currentAdditions, next.unitData];
    currentRoster = [...currentRoster, next.unitData];
    currentScore = evaluateList(currentRoster, contextForRoster(context, currentRoster));
  }

  return currentAdditions;
}

function canAddToCandidate(additions, unitData, context) {
  const roster = [...context.baseUnits, ...additions];
  const dynamicContext = contextForRoster(context, roster);
  if (countUnit(roster, unitData.name) >= datasheetLimit(unitData)) return false;
  if (countUnit(roster, unitData.name) >= maxAutoPickCopies(unitData, dynamicContext)) return false;
  if (wouldExceedArchetypeRoleCap(roster, unitData, dynamicContext)) return false;
  if (!passesArchetypeSanityGate(roster, unitData, dynamicContext)) return false;
  if (isPriorityCharacter(unitData) && roster.some((item) => item !== unitData && legendaryHeroKey(item) === legendaryHeroKey(unitData))) return false;
  if (countUnit(additions, unitData.name) >= maxAutoPickCopies(unitData, dynamicContext)) return false;
  if (isCharacterLike(unitData) && countUnit(roster, unitData.name) > 0) return false;
  if (isDedicatedTransport(unitData) && countDedicatedTransports(roster) >= maxUsefulTransportSlots(roster)) return false;
  if (isDedicatedTransport(unitData) && countUnit(additions, unitData.name) >= usefulTransportCopies(context.side, unitData, roster)) return false;
  if (isCharacterLike(unitData) && countCharacterLike(roster) >= maxCharacterSlots()) return false;
  return true;
}

function passesArchetypeSanityGate(roster, unitData, context) {
  const features = unitFeatures(unitData);
  const structure = rosterStructure(roster);
  const identity = archetypeIdentityScore(unitData, context);
  const structural = fillsCurrentStructuralNeed(unitData, context);
  const currentPoints = totalPoints(roster);
  if (structural && currentPoints < state.gameSize * 0.45) return true;
  if (identity < -1.2 && currentPoints >= state.gameSize * 0.35) return false;

  if (context.playstyle === "alphaStrike") {
    const weapons = unitWeaponFeatureScores(unitData);
    const mobileThreat = features.speed && (features.deepStrike || features.charge || weapons.shooting >= 0.45 || weapons.antiTank >= 0.45 || weapons.melee >= 0.45);
    const alphaTool = features.antiTank || features.rangedAntiTank || features.deepStrike || features.shooting || mobileThreat;
    if (unitData.section === "Battleline" && !alphaTool && structure.scoring >= 1) return false;
    if (!alphaTool && !structural && currentPoints >= state.gameSize * 0.25) return false;
  }

  if (context.playstyle === "gunline") {
    const gunlineTool = features.shooting || features.rangedAntiTank || features.anchor || features.indirect || features.screens;
    if (!gunlineTool && features.melee && !structural) return false;
  }

  if (context.playstyle === "meleeRush") {
    const pressureTool = features.charge || features.melee || features.speed || isDedicatedTransport(unitData) || features.pressure;
    if (!pressureTool && features.shooting && !structural && currentPoints >= state.gameSize * 0.3) return false;
  }

  if (context.playstyle === "horde") {
    const hordeTool = features.cheap || features.boardControl || features.screens || features.scoring;
    if (!hordeTool && (features.elite || features.monsterVehicle) && !structural) return false;
  }

  if (context.playstyle === "skew") {
    if (unitData.section === "Battleline" && !features.monsterVehicle && !features.elite && structure.scoring >= 1) return false;
  }

  if (context.playstyle === "combo") {
    const comboTool = features.synergy || features.buff || isCharacterLike(unitData) || features.anchor;
    if (!comboTool && !structural && currentPoints >= state.gameSize * 0.35) return false;
  }

  return true;
}

function contextForRoster(baseContext, roster) {
  const next = autoPickContext(baseContext.side, roster);
  return {
    ...next,
    playstyle: baseContext.playstyle,
    profile: baseContext.profile,
    detachment: baseContext.detachment,
    activeDetachments: baseContext.activeDetachments,
    detachmentStyles: baseContext.detachmentStyles,
    risk: baseContext.risk,
    experience: baseContext.experience,
    isEnemy: baseContext.isEnemy,
  };
}

function marginalAutoPickScore(unitData, roster, context) {
  const before = contextForRoster(context, roster);
  const afterRoster = [...roster, unitData];
  const after = contextForRoster(context, afterRoster);
  const beforeStructure = before.structure || rosterStructure(roster);
  const afterStructure = after.structure || rosterStructure(afterRoster);
  const features = unitFeatures(unitData);
  const weapons = unitWeaponFeatureScores(unitData);
  let score = 0;

  Object.entries(after.minimums || {}).forEach(([need, target]) => {
    const beforeGap = Math.max(0, target - (beforeStructure[need] || 0));
    const afterGap = Math.max(0, target - (afterStructure[need] || 0));
    score += (beforeGap - afterGap) * 4.8;
  });

  score += archetypePlanFit(unitData, context.playstyle) * 0.8;
  score += archetypeIdentityScore(unitData, context) * 1.65;
  score += coherenceFitScore(unitData, before) * 1.25;
  score += characterPackageScore(unitData, roster, context) * 1.4;
  score += logisticsPackageScore(unitData, roster, context) * 1.1;
  score += counterMetaPackageScore(unitData, roster, context);

  if (countUnit(roster, unitData.name) > 0) score += repeatMarginalScore(unitData, roster, context);
  const fillsNeed = fillsCurrentStructuralNeed(unitData, before);
  if (unitData.section === "Battleline" && !fillsNeed && archetypePlanFit(unitData, context.playstyle) < weakArchetypeFitThreshold(context.playstyle)) score -= 3.6;
  if (!fillsNeed && archetypeIdentityScore(unitData, context) < -0.6) score -= 4.8;
  if (!fillsNeed && features.screens && features.cheap && beforeStructure.screens >= (before.minimums?.screens || 1)) score -= 3.2;
  if (context.playstyle === "alphaStrike" && features.speed && !features.deepStrike && Math.max(weapons.shooting, weapons.antiTank, weapons.melee) < 0.45) score -= 4.2;
  if (isCharacterLike(unitData) && !isIndependentOperative(unitData, context.side) && !afterRoster.some((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard))) score -= 5;
  if (isDedicatedTransport(unitData) && !transportableBaseUnits(context.side, unitData, roster).length) score -= 7;
  if (context.experience === "new" && complexityScore(unitData) >= 3 && !fillsCurrentStructuralNeed(unitData, before)) score -= 2.8;
  if (context.risk <= 3 && swingScore(unitData) >= 3 && !fillsCurrentStructuralNeed(unitData, before)) score -= 2.4;
  return score;
}

function characterPackageScore(unitData, roster, context) {
  if (!isCharacterLike(unitData)) {
    const compatibleLeaders = roster.filter((leader) => canLeadUnit(context.side, leader, unitData));
    return compatibleLeaders.length ? 2.2 : 0;
  }
  if (isIndependentOperative(unitData, context.side)) return context.needsScoring || context.needsScreens ? 2 : 0.8;
  const bodyguards = roster.filter((bodyguard) => canLeadUnit(context.side, unitData, bodyguard));
  if (!bodyguards.length) return 0;
  const bestBodyguard = bodyguards
    .map((bodyguard) => unitFeatures(bodyguard))
    .reduce((best, features) => Math.max(best, features.shooting + features.melee + features.durability + features.scoring), 0);
  return 1.5 + Math.min(2.8, bestBodyguard * 0.65);
}

function logisticsPackageScore(unitData, roster, context) {
  if (isDedicatedTransport(unitData)) {
    const passengers = transportableBaseUnits(context.side, unitData, roster);
    const valuablePassengers = passengers.filter((passenger) => unitFeatures(passenger).melee || unitFeatures(passenger).trading || unitFeatures(passenger).antiTank);
    return passengers.length ? 1 + Math.min(3, valuablePassengers.length * 1.1 + passengers.length * 0.35) : -4;
  }
  const transports = roster.filter(isDedicatedTransport);
  if (!transports.length || !isTransportableBody(unitData)) return 0;
  return transports.some((transport) => transportableBaseUnits(context.side, transport, [...roster, unitData]).includes(unitData)) ? 1.2 : 0;
}

function counterMetaPackageScore(unitData, roster, context) {
  const enemyProfile = context.side === "player" ? armyProfile(state.enemyRoster) : armyProfile(state.roster);
  if (!state.enemyRoster.length && context.side === "player") return 0;
  const features = unitFeatures(unitData);
  let score = 0;
  if (enemyProfile.durability > armyProfile(roster).antiTank + 18 && features.antiTank) score += 2.5;
  if (enemyProfile.mobility > armyProfile(roster).control + 18 && features.screens) score += 1.8;
  if (enemyProfile.control > armyProfile(roster).shooting + 18 && (features.shooting || features.melee)) score += 1.6;
  return score;
}

function repeatMarginalScore(unitData, roster, context) {
  const repeatFit = archetypeRepeatFit(unitData, context.playstyle);
  if (!canRepeatForArchetype(unitData, context.playstyle)) return -4.5;
  if (repeatFit < repeatFitThreshold(context.playstyle)) return -3;
  const sameCount = countUnit(roster, unitData.name);
  return Math.max(-2, 1.6 - sameCount * 1.1);
}

function uniqueCandidateLists(candidates) {
  const byKey = new Map();
  candidates.forEach((candidate) => {
    const key = candidate.roster.map((unitData) => unitData.name).sort().join("|");
    const current = byKey.get(key);
    if (!current || candidate.score > current.score) byKey.set(key, candidate);
  });
  return [...byKey.values()];
}

function expandedAutoPickCandidates(side, baseUnits, context = autoPickContext(side, baseUnits)) {
  const candidates = [];
  const transportSlots = Math.max(0, maxUsefulTransportSlots(baseUnits) - countDedicatedTransports(baseUnits));
  const hasPotentialPassengers = currentFaction(side).units.some(isTransportableBody);
  const speculativeTransportSlots = hasPotentialPassengers && ["meleeRush", "trading", "midrange", "mobilityTempo", "combo"].includes(context.playstyle) ? 2 : hasPotentialPassengers ? 1 : 0;
  let queuedTransports = 0;
  sortedUnits(side).forEach((unitData) => {
    const availableCopies = datasheetLimit(unitData) - countUnit(baseUnits, unitData.name);
    let copies = Math.max(0, Math.min(availableCopies, maxAutoPickCopies(unitData, context)));
    if (isCharacterLike(unitData)) {
      if (countUnit(baseUnits, unitData.name) > 0) copies = 0;
    }
    if (isDedicatedTransport(unitData)) {
      const usefulCopies = Math.max(usefulTransportCopies(side, unitData, baseUnits), speculativeTransportSlots ? 1 : 0);
      const remainingTransportSlots = Math.min(Math.max(transportSlots, speculativeTransportSlots), usefulCopies) - queuedTransports;
      copies = Math.max(0, Math.min(copies, remainingTransportSlots));
      queuedTransports += copies;
    }
    for (let copy = 0; copy < copies; copy += 1) {
      candidates.push(unitData);
    }
  });
  return candidates;
}

function autoPickContext(side, baseUnits) {
  const isEnemy = side === "enemy";
  const playstyle = isEnemy ? $("#enemyStyle").value : $("#playstyle").value;
  const profile = isEnemy ? "competitive" : state.profile;
  const profileData = armyProfile(baseUnits);
  const roles = rosterRoles(baseUnits);
  const transportSlots = Math.max(0, maxUsefulTransportSlots(baseUnits) - countDedicatedTransports(baseUnits));
  const structure = rosterStructure(baseUnits);
  return {
    side,
    isEnemy,
    playstyle,
    profile,
    detachment: isEnemy ? state.enemyDetachment : state.detachment,
    activeDetachments: activeDetachments(side),
    detachmentStyles: activeDetachmentStyles(side),
    risk: isEnemy ? 6 : Number($("#risk").value),
    experience: isEnemy ? "mid" : $("#experience").value,
    needsWarlord: !baseUnits.some(canBeWarlord),
    needsScoring: profileData.scoring < 48,
    needsAntiTank: profileData.antiTank < 42,
    needsScreens: !baseUnits.some((unitData) => hasAnyText(unitData, ["screen", "infiltrate", "scout"])),
    roles,
    transportSlots,
    structure,
    minimums: (archetypes[playstyle] || archetypes.midrange).minimums,
    baseUnits,
    characterCount: countCharacterLike(baseUnits),
    repeatedNames: new Set(baseUnits.filter((unitData, index) => baseUnits.findIndex((item) => item.name === unitData.name) !== index).map((unitData) => unitData.name)),
    fillWeight: isEnemy ? 8 : $("#experience").value === "new" ? 7 : Number($("#risk").value) >= 8 ? 6 : 8,
  };
}

function autoPickValue(unitData, context) {
  const baseRating = unitData.ratings[context.profile] * 0.72;
  const planScore = playstyleScore(unitData, context.playstyle) * 1.55;
  const identityScore = archetypeIdentityScore(unitData, context) * 2.35;
  const detachmentScore = unitData.styles.some((style) => (context.detachmentStyles || context.detachment.styles || []).includes(style)) ? 1.4 : 0;
  const metaScore = context.isEnemy ? 0 : metaFit(unitData) * 0.9;
  const gapScore = listGapScore(unitData, context);
  const riskScore = riskFitScore(unitData, context.risk);
  const experienceScore = experienceFitScore(unitData, context.experience);
  const coherenceScore = coherenceFitScore(unitData, context);
  const repetitionScore = repetitionFitScore(unitData, context);
  const disciplineScore = recommendationDisciplineScore(unitData, context);
  const efficiencyScore = Math.max(0.15, 1 - unitData.points / Math.max(600, state.gameSize)) * 1.25;
  const characterScore = characterPlanScore(unitData, context);
  const enhancementScore = enhancementCarrierScore(unitData, context) * 0.85;
  const historyScore = historyAutopickScore(unitData, context);
  return baseRating + planScore + identityScore + detachmentScore + metaScore + gapScore + riskScore + experienceScore + coherenceScore + repetitionScore + disciplineScore + efficiencyScore + characterScore + enhancementScore + historyScore;
}

function recommendationDisciplineScore(unitData, context) {
  const playstyle = playstyleScore(unitData, context.playstyle);
  const planFit = archetypePlanFit(unitData, context.playstyle);
  const gap = listGapScore(unitData, context);
  const complexity = complexityScore(unitData);
  const swing = swingScore(unitData);
  const structural = fillsCurrentStructuralNeed(unitData, context) ? 1 : 0;
  let score = structural * 2.2;
  if (playstyle < 0.5 && !structural && !canBeWarlord(unitData)) score -= 2.6;
  if (archetypeIdentityScore(unitData, context) < -0.7 && !structural && !canBeWarlord(unitData)) score -= 3.8;
  if (planFit < weakArchetypeFitThreshold(context.playstyle) && !structural && !isUtilityAllowance(unitData, context)) score -= 2.8;
  if (unitData.section === "Battleline" && planFit < weakArchetypeFitThreshold(context.playstyle) && !["horde", "trading", "midrange"].includes(context.playstyle)) score -= 2.4;
  if (context.experience === "new" && complexity >= 3 && !structural) score -= 2.4;
  if (context.experience === "new" && isDedicatedTransport(unitData) && !transportableBaseUnits(context.side, unitData, context.baseUnits).length) score -= 5;
  if (context.risk <= 3 && swing >= 3 && !structural) score -= 2.2;
  if (context.risk >= 8 && swing >= 2 && playstyle > 1) score += 1.1;
  if (gap >= 2) score += 1.2;
  return score;
}

function historyAutopickScore(unitData, context) {
  if (context.side !== "player" || !state.matchHistory.length) return 0;
  const profile = playerHistoryNeeds();
  const matchup = historyMatchupNeeds();
  const features = unitFeatures(unitData);
  let score = 0;
  if (profile.needsScoring && features.scoring) score += 1.8;
  if (profile.needsSecondaries && (features.speed || features.deepStrike || features.scoring)) score += 1.5;
  if (profile.needsAntiTank && features.antiTank) score += 1.6;
  if (profile.needsScreens && features.screens) score += 1.4;
  if (profile.strugglesGoingSecond && (features.screens || features.durability || features.indirect)) score += 1.2;
  if (profile.badMissionMatch && archetypeIdentityScore(unitData, context) > 1.8) score += 0.8;
  if (matchup.needsAntiTank && features.antiTank) score += 1.7;
  if (matchup.needsAntiHorde && (features.shooting || features.melee || features.boardControl)) score += 1.4;
  if (matchup.needsMobility && (features.speed || features.deepStrike || features.transport)) score += 1.5;
  if (matchup.needsScreens && (features.screens || features.infiltrate || features.scoring)) score += 1.3;
  if (matchup.needsDurability && (features.durability || features.anchor)) score += 1.2;
  return Math.min(6.2, score);
}

function playerHistoryNeeds() {
  const recent = state.matchHistory.filter((item) => item.result !== "unknown").slice(0, 12);
  const losses = recent.filter((item) => item.result === "loss");
  const avgPlayerSecondary = averageNonZero(recent.map((item) => item.playerSecondary));
  const avgPlayerPrimary = averageNonZero(recent.map((item) => item.playerPrimary));
  const bringItDownLosses = losses.filter((item) => item.opponentSecondaries?.includes("Bring It Down")).length;
  const noPrisonersLosses = losses.filter((item) => item.opponentSecondaries?.includes("No Prisoners")).length;
  const goingSecondLosses = losses.filter((item) => item.playerWentFirst === false).length;
  const relevantMission = relevantHistoryMatches();
  const relevantLossRate = relevantMission.length ? relevantMission.filter((item) => item.result === "loss").length / relevantMission.length : 0;
  return {
    needsScoring: avgPlayerPrimary > 0 && avgPlayerPrimary < 30,
    needsSecondaries: avgPlayerSecondary > 0 && avgPlayerSecondary < 24,
    needsAntiTank: bringItDownLosses >= 2,
    needsScreens: noPrisonersLosses >= 2 || goingSecondLosses >= 2,
    strugglesGoingSecond: goingSecondLosses >= 2,
    badMissionMatch: relevantLossRate >= 0.6,
  };
}

function historyMatchupNeeds() {
  const relevant = relevantHistoryMatches().filter((item) => item.result === "loss");
  const enemyProfile = armyProfile(state.enemyRoster);
  const enemyStyle = currentEnemyStyle();
  const hardRecord = historyAnalysisModifier();
  const active = relevant.length || hardRecord.score < -0.15;
  const needs = {
    needsAntiTank: active && (enemyProfile.durability >= 58 || enemyProfile.antiTank >= 55 || ["skew", "attrition"].includes(enemyStyle)),
    needsAntiHorde: active && (enemyProfile.control >= 58 || enemyProfile.scoring >= 62 || enemyStyle === "horde"),
    needsMobility: active && (enemyStyle === "gunline" || enemyProfile.shooting >= 62 || enemyStyle === "mobilityTempo"),
    needsScreens: active && (enemyStyle === "meleeRush" || enemyStyle === "alphaStrike" || enemyProfile.melee >= 62),
    needsDurability: active && (enemyStyle === "alphaStrike" || enemyProfile.shooting >= 66 || enemyProfile.melee >= 66),
    tips: [],
  };
  if (needs.needsAntiTank) needs.tips.push({ title: "Memoria vs resistencia", body: "Tus partidas similares sugieren problemas contra perfiles resistentes o skew. El autopick dara mas peso a anti-tank redundante y dano fiable." });
  if (needs.needsAntiHorde) needs.tips.push({ title: "Memoria vs mesa", body: "La memoria marca riesgo contra listas que ocupan mesa. Suben de valor piezas de limpieza, pantallas y scoring barato." });
  if (needs.needsMobility) needs.tips.push({ title: "Memoria vs gunline/tempo", body: "Contra este tipo de rival, la memoria favorece movilidad, deep strike, reservas y amenazas por flanco para no jugar solo por lineas de tiro." });
  if (needs.needsScreens) needs.tips.push({ title: "Memoria vs presion", body: "La memoria sugiere proteger despliegue y turno 1-2. Pantallas, infiltradores y countercharge pesaran mas en recomendaciones." });
  if (needs.needsDurability) needs.tips.push({ title: "Memoria vs alpha", body: "La memoria favorece anclas o piezas que sobrevivan la primera activacion rival, especialmente si vas segundo." });
  needs.tips = needs.tips.slice(0, 2);
  return needs;
}

function averageNonZero(values) {
  const filtered = values.map(Number).filter((value) => value > 0);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function buildRecommendationExplanation(unitData, context, rosterAfter = []) {
  const reasons = [];
  const roleScores = unitRoleScores(unitData).filter((score) => score.value >= 6).sort((a, b) => b.value - a.value).slice(0, 3);
  const archetypeName = archetypeDisplayName(context.playstyle);
  const playstyleValue = playstyleScore(unitData, context.playstyle);
  const gapValue = listGapScore(unitData, context);
  const riskValue = riskFitScore(unitData, context.risk);
  const experienceValue = experienceFitScore(unitData, context.experience);
  const coherenceValue = coherenceFitScore(unitData, { ...context, baseUnits: rosterAfter.filter((item) => item !== unitData) });
  const historyValue = historyAutopickScore(unitData, context);

  if (playstyleValue >= 2) reasons.push(`Encaja con el arquetipo ${archetypeName}: aporta ${roleScores.map((score) => score.label.toLowerCase()).join(", ") || "herramientas clave del plan"}.`);
  else reasons.push(`No es una pieza central del arquetipo ${archetypeName}, pero cubre una necesidad estructural de la lista.`);

  if (gapValue >= 2 || fillsCurrentStructuralNeed(unitData, context)) {
    reasons.push(`Ayuda a cerrar huecos actuales: ${structuralNeedLabels(unitData, context).join(", ") || "roles minimos de la lista"}.`);
  }

  if (coherenceValue > 1.5) reasons.push(coherenceReason(unitData, context, rosterAfter));
  const packageReason = recommendationPackageReason(unitData, context, rosterAfter);
  if (packageReason) reasons.push(packageReason);
  if (riskValue > 1) reasons.push(`Va bien con tu tolerancia al riesgo (${context.risk}/10): acepta una pieza mas swingy si el plan lo recompensa.`);
  if (riskValue < -1) reasons.push(`Aunque es algo swingy para tu riesgo (${context.risk}/10), se mantuvo porque cubre un hueco importante.`);
  if (experienceValue > 1) reasons.push(`Es razonable para experiencia ${experienceLabel(context.experience)}: su funcion en mesa es facil de identificar.`);
  if (experienceValue < -1) reasons.push(`Tiene mas micro-decisiones de lo ideal para experiencia ${experienceLabel(context.experience)}, asi que conviene practicar su rol antes de depender de ella.`);
  if (historyValue >= 1.5) reasons.push("Tambien responde a patrones de tu historial reciente: ayuda en areas donde tus reportes muestran perdida de puntos o matchups dificiles.");
  if (enhancementCarrierScore(unitData, context) >= 2) reasons.push("Tambien puede ser buen portador de enhancement para este detachment.");
  if (!reasons.length) reasons.push("Sube el score total de la lista sin romper los limites de puntos ni los cupos de datasheet.");

  return {
    summary: `${unitData.name} fue elegida porque mejora el plan ${archetypeName} y aumenta la coherencia global de la lista.`,
    reasons: reasons.slice(0, 5),
    usage: tacticalUseTips(unitData, context, rosterAfter),
    caution: recommendationCaution(unitData, context, rosterAfter),
  };
}

function tacticalUseTips(unitData, context, rosterAfter) {
  const text = unitText(unitData);
  const features = unitFeatures(unitData);
  const tips = [];
  const beginner = context.experience === "new";

  if (/techmarine|warpsmith|big mek/.test(text)) {
    const vehicles = rosterAfter.filter((unit) => unit !== unitData && (unit.section === "Vehicle" || hasAnyText(unit, ["vehicle", "dreadnought", "tank", "engine", "walker"]))).slice(0, 2);
    tips.push(`Empieza cerca de ${vehicles.map((unit) => unit.name).join(" o ") || "tu vehiculo mas importante"}; su trabajo no es pelear solo, es mantener viva y eficiente esa pieza.`);
    tips.push("Mantenlo detras de ruinas o detras del vehiculo: si el rival lo ve facil, normalmente lo estas regalando.");
    tips.push("Si el vehiculo va a tomar el centro, acompanalo a distancia segura; si el vehiculo se queda atras, usalo como guardian del home objective.");
    return tips;
  }

  if (isDedicatedTransport(unitData)) {
    const passengers = transportableBaseUnits(context.side, unitData, rosterAfter).slice(0, 2);
    tips.push(`Asignale pasajeros antes de desplegar: ${passengers.map((unit) => unit.name).join(" o ") || "una unidad que necesite llegar viva al centro"}.`);
    tips.push("Usalo para esconder la unidad hasta que pueda intercambiar o tomar un objetivo, no como tanque principal.");
    if (beginner) tips.push("Plan simple: turno 1 avanza y tapa linea de vision; turno 2 baja pasajeros donde puedan puntuar o cargar.");
    return tips;
  }

  if (isCharacterLike(unitData) && !isIndependentOperative(unitData, context.side)) {
    const bodyguards = rosterAfter.filter((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard)).slice(0, 2);
    tips.push(`Antes de jugar, decide su unidad acompanante: ${bodyguards.map((unit) => unit.name).join(" o ") || "una unidad compatible de la lista"}.`);
    tips.push("No lo despliegues como pieza suelta si no tiene plan: su valor sale de buffear, proteger o activar mejor a su unidad.");
    if (features.melee) tips.push("Busca una amenaza de contra-carga: no siempre debe cargar primero, a veces castiga al enemigo que entra al centro.");
    return tips;
  }

  if (isIndependentOperative(unitData, context.side)) {
    tips.push("Juegala como pieza de utilidad: puntuar, molestar angulos y forzar al rival a gastar recursos de mas.");
    tips.push("No la cambies por cualquier unidad enemiga; su valor suele estar en sobrevivir y hacer acciones durante varios turnos.");
    if (beginner) tips.push("Regla practica: si no sabes que hacer con ella, ponla segura cerca de un objetivo lateral o una ruta de secundaria.");
    return tips;
  }

  if (context.playstyle === "alphaStrike") {
    if (features.deepStrike || features.speed) tips.push("Usala para amenazar una pieza clave desde flanco, reserva o movimiento rapido; no la gastes en una pantalla barata si puedes alcanzar algo importante.");
    if (features.shooting || features.antiTank) tips.push("Elige su primer objetivo antes de desplegar: debe ayudar a borrar o inutilizar una amenaza enemiga en turno 1-2.");
    tips.push("Si no tiene tiro o carga clara al inicio, colocalo donde obligue al rival a esconderse y perder mesa.");
    return tips;
  }

  if (features.scoring || unitData.section === "Battleline") {
    tips.push("Su primera responsabilidad es puntuar: home, objetivo lateral o secundaria sencilla, no perseguir kills.");
    if (beginner) tips.push("Evita ponerla en medio sin apoyo; usala para obligar al rival a gastar una unidad mejor en quitarte puntos.");
  }
  if (features.antiTank) tips.push("Guardala hasta que tenga linea contra vehiculos, monstruos o elites caros; no desperdicies su activacion en infanteria barata.");
  if (features.melee) tips.push("Usala como amenaza de intercambio: escondida primero, expuesta solo cuando pueda cargar o tomar el centro con apoyo.");
  if (features.shooting && !features.antiTank) tips.push("Busca angulos seguros y objetivos de infanteria; su trabajo es limpiar pantallas para abrir camino a tus piezas clave.");
  if (!tips.length) tips.push("Dale una tarea concreta antes de desplegar: puntuar, tradear, proteger home o apoyar una pieza mas importante.");
  return tips.slice(0, beginner ? 4 : 3);
}

function structuralNeedLabels(unitData, context) {
  const labels = {
    scoring: "puntuar secundarias y objetivos",
    trading: "hacer intercambios positivos",
    antiTank: "responder a tanques o monstruos",
    antiHorde: "limpiar horda",
    screens: "pantallas contra movimiento y deep strike",
    home: "defender home objective",
    midboard: "pelear el centro",
  };
  const features = unitFeatures(unitData);
  const needs = [];
  if (context.needsWarlord && canBeWarlord(unitData)) needs.push("tener un warlord posible");
  Object.entries(context.minimums || {}).forEach(([need, target]) => {
    if ((context.structure?.[need] || 0) >= target) return;
    if (featuresForNeed(need).some((feature) => features[feature])) needs.push(labels[need] || need);
  });
  return [...new Set(needs)];
}

function coherenceReason(unitData, context, rosterAfter) {
  if (isDedicatedTransport(unitData)) return "Tiene sentido logistico: hay cuerpos que puede transportar y proteger.";
  if (isIndependentOperative(unitData, context.side)) return "Funciona sin liderar una unidad: puede jugar mision, pantalla o utilidad por su cuenta.";
  if (isCharacterLike(unitData) && rosterAfter.some((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard))) return "Tiene una unidad compatible que puede liderar, asi que no queda como personaje sin plan.";
  if (!isCharacterLike(unitData) && rosterAfter.some((leader) => leader !== unitData && canLeadUnit(context.side, leader, unitData))) return "Mejora una pieza de personaje existente porque puede recibir lider compatible.";
  return "Tiene buena coherencia con las piezas que ya hay en la lista.";
}

function recommendationPackageReason(unitData, context, rosterAfter) {
  const previousRoster = rosterAfter.filter((item) => item !== unitData);
  if (isDedicatedTransport(unitData)) {
    const passengers = transportableBaseUnits(context.side, unitData, previousRoster).slice(0, 3);
    if (passengers.length) return `Paquete logistico: puede llevar o proteger a ${passengers.map((unit) => unit.name).join(", ")}.`;
  }
  if (isCharacterLike(unitData) && !isIndependentOperative(unitData, context.side)) {
    const bodyguards = previousRoster.filter((bodyguard) => canLeadUnit(context.side, unitData, bodyguard)).slice(0, 3);
    if (bodyguards.length) return `Paquete de liderazgo: tiene objetivo claro con ${bodyguards.map((unit) => unit.name).join(", ")}.`;
  }
  if (!isCharacterLike(unitData)) {
    const leaders = previousRoster.filter((leader) => canLeadUnit(context.side, leader, unitData)).slice(0, 2);
    if (leaders.length) return `Encaja como unidad escolta para ${leaders.map((unit) => unit.name).join(" o ")}.`;
  }
  if (context.side === "player" && state.enemyRoster.length) {
    const enemy = armyProfile(state.enemyRoster);
    const own = armyProfile(previousRoster);
    const features = unitFeatures(unitData);
    if (enemy.durability > own.antiTank + 18 && features.antiTank) return "Respuesta de matchup: sube anti-tank contra una lista rival resistente.";
    if (enemy.mobility > own.control + 18 && features.screens) return "Respuesta de matchup: ayuda a frenar movilidad rival con pantallas o control.";
  }
  return "";
}

function recommendationCaution(unitData, context, rosterAfter) {
  if (isCharacterLike(unitData) && !isIndependentOperative(unitData, context.side) && !rosterAfter.some((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard))) {
    return "Ojo: revisa que tenga una unidad compatible para liderar o que su valor justifique jugarlo solo.";
  }
  if (isDedicatedTransport(unitData) && !transportableBaseUnits(context.side, unitData, rosterAfter).length) return "Ojo: no conviene sumar transportes si no hay suficientes pasajeros utiles.";
  if (context.experience === "new" && complexityScore(unitData) >= 3) return "Ojo: para alguien nuevo puede requerir mas practica de posicionamiento o timing.";
  return "Su rol principal deberia ser claro desde el despliegue para no desperdiciar puntos.";
}

function archetypeDisplayName(playstyle) {
  const names = {
    meleeRush: "Melee Rush / Pressure",
    trading: "Trading",
    gunline: "Anchor / Castle / Gunline",
    skew: "Skew",
    horde: "Horde / Board Control",
    alphaStrike: "Alpha Strike",
    midrange: "Midrange",
    attrition: "Attrition",
    mobilityTempo: "Mobility / Tempo",
    combo: "Combo / Synergy Engine",
  };
  return names[playstyle] || "Midrange";
}

function experienceLabel(experience) {
  if (experience === "new") return "nueva";
  if (experience === "expert") return "experta";
  return "intermedia";
}

function characterPlanScore(unitData, context) {
  if (!isPriorityCharacter(unitData)) return 0;
  const pointShare = unitData.points / Math.max(1, state.gameSize);
  if (state.gameSize <= 1000 && pointShare > 0.22) return -3.5;

  let score = context.profile === "competitive" ? 1.8 : 0.9;
  if (isEpicHero(unitData)) score += 2.2;
  if (context.needsWarlord) score += 2.1;
  if (["midrange", "attrition", "combo", "skew", "meleeRush"].includes(context.playstyle)) score += 1.1;
  if (isCenterpieceCharacter(unitData)) score += 2.6;
  if (hasLeaderTargets(context.side || "player", unitData)) score += 0.9;
  if (isIndependentOperative(unitData, context.side)) score += independentOperativeScore(unitData, context);
  if (pointShare <= 0.15) score += 1.2;
  if (pointShare > 0.2) score -= (pointShare - 0.2) * 18;
  if (leaderTargets(context.side || "player", unitData).length && context.baseUnits?.some((bodyguard) => canLeadUnit(context.side || "player", unitData, bodyguard))) score += 1.8;
  if ((context.characterCount || 0) >= maxCharacterSlots() - 1 && !context.needsWarlord) score -= 1.8;
  return score;
}

function independentOperativeScore(unitData, context) {
  let score = 2.2;
  if (unitData.points <= state.gameSize * 0.055) score += 1.1;
  if (["trading", "mobilityTempo", "midrange", "combo"].includes(context.playstyle)) score += 1;
  if (context.needsScoring || context.needsScreens) score += 1.1;
  if (hasAnyText(unitData, ["techmarine", "warpsmith", "big mek"]) && context.baseUnits?.some((unit) => unit.section === "Vehicle" || hasAnyText(unit, ["vehicle", "dreadnought", "tank", "engine"]))) score += 1.5;
  return score;
}

function isCenterpieceCharacter(unitData) {
  return isEpicHero(unitData) && (
    unitData.points >= state.gameSize * 0.06 ||
    unitData.ratings.competitive >= 7 ||
    hasAnyText(unitData, ["primarch", "supreme", "ctan", "c'tan", "avatar", "daemon prince", "greater daemon", "phoenix lord", "chapter master", "warlord"])
  );
}

function isEpicHero(unitData) {
  if (unitData.section !== "Epic Hero") return false;
  return !isLikelyNonCharacterUnit(unitData);
}

function isPriorityCharacter(unitData) {
  return isEpicHero(unitData) || unitData.section === "Character" || unitData.tags.includes("leader");
}

function isIndependentOperative(unitData, side = "player") {
  if (!isPriorityCharacter(unitData)) return false;
  if (hasAnyText(unitData, [
    "lone operative",
    "lone op",
    "cypher",
    "techmarine",
    "warpsmith",
    "lieutenant with combi-weapon",
    "solitaire",
    "deathleaper",
    "neurolictor",
    "lictor",
    "callidus assassin",
    "culexus assassin",
    "eversor assassin",
    "vindicare assassin",
    "illic nightspear",
    "snikrot",
  ])) return true;
  return unitData.section === "Character" && !hasLeaderTargets(side, unitData) && unitData.points <= state.gameSize * 0.08;
}

function hasLeaderTargets(side, unitData) {
  return leaderTargets(side, unitData).length > 0;
}

function isLikelyNonCharacterUnit(unitData) {
  if (unitData.section !== "Epic Hero") return false;
  if (unitData.tags.includes("leader")) return false;
  return /\b(squad|team|mob|swarm|brood|battery|turret|gunship|jetfighter|transport|carrier|rhino|raider|speeder|predator|land raider|repulsor|dreadnought|intercessor|veteran|terminator|centurion|outrider|aggressor|eradicator|hellblaster|desolation|devastator|scout)\b/i.test(unitData.name);
}

function legendaryHeroKey(unitData) {
  if (!isPriorityCharacter(unitData)) return "";
  return unitData.name
    .toLowerCase()
    .replace(/\s+in\s+armou?r.*$/i, "")
    .replace(/\s+with\s+.*$/i, "")
    .replace(/[^a-z0-9' ]/g, "")
    .trim();
}

function evaluateList(units, context) {
  const archetypeScore = adjustForArchetype(units, context);
  const roleScore = evaluateRoles(units, context);
  const synergyScore = evaluateSynergies(units, context);
  const epicScore = evaluateEpicHeroes(units, context);
  const enhancementScore = evaluateEnhancements(units, context);
  const missionScore = evaluateMissionPlan(units, context);
  const redundancyScore = evaluateRedundancy(units, context);
  const matchupScore = evaluateMatchups(units, context);
  const parameterScore = evaluatePlayerParameters(units, context);
  const archetypeIdentityScoreValue = evaluateArchetypeIdentity(units, context);
  const editionScore = evaluateEditionPlan(units, context);
  const fillScore = Math.min(totalPoints(units) / state.gameSize, 1) * 16;

  return (
    roleScore +
    synergyScore +
    epicScore +
    enhancementScore +
    missionScore +
    redundancyScore +
    matchupScore +
    parameterScore +
    archetypeIdentityScoreValue +
    editionScore +
    fillScore +
    archetypeScore -
    penalizeGaps(units, context) -
    penalizeOffPlanArchetype(units, context) -
    penalizeOverinvestment(units) -
    penalizeComboDependence(units, context) -
    penalizeInvalidList(units, context)
  );
}

function evaluateEditionPlan(units, context) {
  if (state.rulesEdition !== "11e" || !units.length) return 0;
  const profile = armyProfile(units);
  const roleCounts = units.reduce((counts, unitData) => {
    const features = unitFeatures(unitData);
    if (features.scoring || features.speed || features.deepStrike) counts.scoring += 1;
    if (features.screens || features.infiltrate || features.boardControl) counts.screens += 1;
    if (features.trading || features.cheap || features.pressure) counts.trading += 1;
    return counts;
  }, { scoring: 0, screens: 0, trading: 0 });
  let score = 0;
  score += Math.min(6, roleCounts.scoring * 0.9);
  score += Math.min(5, roleCounts.screens * 0.75);
  score += Math.min(4, roleCounts.trading * 0.6);
  score += (profile.mobility + profile.control + profile.scoring - 165) / 18;
  if (context.playstyle === "gunline" && profile.mobility < 44) score -= 2.5;
  if (context.playstyle === "meleeRush" && profile.control < 44) score -= 1.6;
  const enhancementCount = units.filter((unitData) => unitData.config?.enhancement).length;
  if (currentEditionProfile().features.noStratStacking && enhancementCount >= 4) score -= 1.4;
  return clampNumber(score, -5, 10);
}

function evaluateEpicHeroes(units, context) {
  return units.reduce((score, unitData) => {
    if (!isPriorityCharacter(unitData)) return score;
    const support = units.some((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard)) ? 2.5 : 0;
    const centerpiece = isCenterpieceCharacter(unitData) ? 5 : isEpicHero(unitData) ? 3 : 1.4;
    return score + centerpiece + support;
  }, 0);
}

function evaluateEnhancements(units, context) {
  const carriers = units.filter(canCarryEnhancement);
  const enhancementPlans = detachmentEnhancements(context.activeDetachments || context.detachment);
  if (!enhancementPlans.length) return 0;
  if (!carriers.length) return -4;

  const assigned = new Set();
  const values = enhancementPlans
    .map((enhancement) => {
      const carrier = carriers
        .filter((unitData) => !assigned.has(unitData.name))
        .map((unitData) => ({ unitData, score: enhancementCarrierFit(unitData, enhancement, context, units) }))
        .sort((a, b) => b.score - a.score)[0];
      if (!carrier || carrier.score <= 0) return 0;
      assigned.add(carrier.unitData.name);
      return carrier.score;
    })
    .filter(Boolean)
    .sort((a, b) => b - a)
    .slice(0, 3);

  const quality = values.reduce((sum, value) => sum + Math.min(5, value), 0);
  const coverage = Math.min(3, values.length) * 1.1;
  return quality + coverage;
}

function enhancementCarrierScore(unitData, context) {
  if (!canCarryEnhancement(unitData)) return 0;
  return detachmentEnhancements(context.activeDetachments || context.detachment).reduce(
    (best, enhancement) => Math.max(best, enhancementCarrierFit(unitData, enhancement, context, context.baseUnits || [])),
    0
  );
}

function canCarryEnhancement(unitData) {
  return canBeWarlord(unitData) && !isEpicHero(unitData);
}

function detachmentEnhancements(detachment) {
  if (Array.isArray(detachment)) {
    return [...new Map(detachment.flatMap((item) => detachmentEnhancements(item)).map((item) => [`${item.detachmentName}-${item.name}`, item])).values()];
  }
  if (!detachment) return [];
  if (Array.isArray(detachment.enhancements) && detachment.enhancements.length) return detachment.enhancements;
  const styles = detachment.styles || [];
  const name = detachment.name || "";
  const plans = [];
  if (styles.includes("shooting")) plans.push(makeEnhancementPlan("fire discipline", ["shooting", "antiTank", "buff"], name));
  if (styles.includes("melee") || styles.includes("pressure")) plans.push(makeEnhancementPlan("melee pressure", ["melee", "charge", "speed", "trading"], name));
  if (styles.includes("durable")) plans.push(makeEnhancementPlan("durable anchor", ["durability", "anchor", "recovery"], name));
  if (styles.includes("mobility")) plans.push(makeEnhancementPlan("mobility tempo", ["speed", "deepStrike", "scoring"], name));
  plans.push(makeEnhancementPlan("mission utility", ["scoring", "screens", "buff", "synergy"], name));
  return [...new Map(plans.map((plan) => [plan.name, plan])).values()].slice(0, 4);
}

function makeEnhancementPlan(name, features, detachmentName) {
  return {
    name,
    features,
    detachmentName,
    cost: 20,
  };
}

function enhancementCarrierFit(unitData, enhancement, context, roster) {
  if (!canCarryEnhancement(unitData)) return 0;
  const features = unitFeatures(unitData);
  let score = (enhancement.features || []).reduce((sum, feature) => sum + (features[feature] || 0), 0);
  if (isIndependentOperative(unitData, context.side) && (enhancement.features || []).some((feature) => ["scoring", "screens", "speed", "deepStrike"].includes(feature))) score += 1.6;
  if (hasLeaderTargets(context.side, unitData) && roster.some((bodyguard) => canLeadUnit(context.side, unitData, bodyguard))) score += 1.8;
  if (hasAnyText(unitData, ["captain", "lieutenant", "farseer", "autarch", "lord", "overlord", "warboss", "canoness", "archon", "kahl", "commander"])) score += 0.8;
  if ((enhancement.features || []).includes("shooting") && hasAnyText(unitData, ["combi", "phobos", "gravis", "terminator", "technomancer", "farseer", "commander"])) score += 0.7;
  if ((enhancement.features || []).includes("melee") && hasAnyText(unitData, ["jump", "blade", "sword", "claw", "hammer", "warboss", "succubus", "champion"])) score += 0.9;
  if ((enhancement.features || []).includes("durability") && hasAnyText(unitData, ["terminator", "gravis", "mounted", "lord", "overlord", "custodian"])) score += 0.8;
  if (unitData.points > state.gameSize * 0.12) score -= 0.7;
  return score;
}

function evaluateRoles(units, context) {
  const structure = rosterStructure(units);
  return Object.entries(context.minimums).reduce((score, [need, target]) => {
    const current = structure[need] || 0;
    return score + Math.min(current, target) / Math.max(1, target) * 5;
  }, 0);
}

function evaluateSynergies(units, context) {
  let score = 0;
  units.forEach((unitData) => {
    if (isCharacterLike(unitData) && units.some((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard))) score += 5;
    if (!isCharacterLike(unitData) && units.some((leader) => leader !== unitData && canLeadUnit(context.side, leader, unitData))) score += 2.2;
    if (isIndependentOperative(unitData, context.side)) score += 2.8;
    if (isDedicatedTransport(unitData)) score += Math.min(3, transportableBaseUnits(context.side, unitData, units).length * 1.2);
  });
  return score;
}

function evaluateMissionPlan(units, context) {
  const profile = armyProfile(units);
  const mission = $("#mission").value;
  let score = profile.scoring / 14 + profile.mobility / 18 + profile.control / 18;
  if (mission === "takeHold") score += (profile.durability + profile.scoring) / 24;
  if (mission === "supplyDrop") score += (profile.mobility + profile.scoring) / 22;
  if (mission === "purgeFoe") score += (profile.shooting + profile.melee) / 24;
  if (mission === "scorchedEarth") score += (profile.mobility + profile.control) / 22;
  if (mission === "hiddenSupplies") score += (profile.control + profile.scoring + profile.mobility) / 34;
  if (mission === "linchpin") score += (profile.durability + profile.control + profile.scoring) / 36;
  if (mission === "terraform") score += (profile.mobility + profile.control + profile.scoring) / 34;
  return score;
}

function evaluateRedundancy(units, context) {
  const structure = rosterStructure(units);
  let score = 0;
  if (structure.antiTank >= 2) score += 5;
  if (structure.scoring >= 3) score += 5;
  if (structure.trading >= 2) score += 4;
  if (structure.screens >= 2) score += 4;
  const duplicateUseful = duplicateUnitNames(units).filter((name) => {
    const unitData = units.find((unit) => unit.name === name);
    if (!canRepeatForArchetype(unitData, context.playstyle)) return false;
    if (archetypeRepeatFit(unitData, context.playstyle) < repeatFitThreshold(context.playstyle)) return false;
    return unitData && !isCharacterLike(unitData) && !isDedicatedTransport(unitData);
  }).length;
  return score + Math.min(6, duplicateUseful * 1.5);
}

function evaluateMatchups(units, context) {
  const profile = armyProfile(units);
  const horde = (profile.shooting + profile.melee + profile.control) / 35;
  const tanks = profile.antiTank / 12;
  const elite = (profile.antiTank + profile.melee + profile.durability) / 35;
  const fastMelee = (profile.control + profile.shooting + profile.mobility) / 36;
  const gunline = (profile.mobility + profile.durability + profile.control) / 36;
  const skew = Math.min(profile.antiTank, profile.scoring, profile.control) / 12;
  const mobility = (profile.control + profile.mobility + profile.scoring) / 36;
  return horde + tanks + elite + fastMelee + gunline + skew + mobility;
}

function evaluatePlayerParameters(units, context) {
  if (!units.length) return 0;
  const roster = [...units];
  const average = roster.reduce((score, unitData) => {
    const risk = riskFitScore(unitData, context.risk) * 0.45;
    const experience = experienceFitScore(unitData, context.experience) * 0.65;
    const archetype = Math.min(4, playstyleScore(unitData, context.playstyle)) * 0.22;
    return score + risk + experience + archetype;
  }, 0) / roster.length;
  let score = average * 2.4;
  if (context.experience === "new") {
    const unsupportedCharacters = roster.filter((unitData) => isCharacterLike(unitData) && !isIndependentOperative(unitData, context.side) && leaderTargets(context.side, unitData).length && !roster.some((bodyguard) => bodyguard !== unitData && canLeadUnit(context.side, unitData, bodyguard))).length;
    score -= unsupportedCharacters * 4;
    if (roster.filter(isDedicatedTransport).length > maxUsefulTransportSlots(roster)) score -= 5;
  }
  if (context.risk <= 3) {
    const swingyShare = totalPoints(roster.filter((unitData) => swingScore(unitData) >= 3)) / Math.max(1, totalPoints(roster));
    score -= Math.max(0, swingyShare - 0.22) * 18;
  }
  return score;
}

function evaluateArchetypeIdentity(units, context) {
  if (!units.length) return 0;
  const total = Math.max(1, totalPoints(units));
  const weighted = units.reduce((score, unitData) => {
    const share = unitData.points / total;
    return score + archetypeIdentityScore(unitData, context) * share;
  }, 0);
  const strongPieces = units.filter((unitData) => archetypeIdentityScore(unitData, context) >= 2.2).length;
  const structure = rosterStructure(units);
  return weighted * 8 + Math.min(8, strongPieces * 1.4) + archetypeStructureBonus(context.playstyle, structure);
}

function archetypeStructureBonus(playstyle, structure) {
  const bonuses = {
    meleeRush: structure.midboard + structure.trading,
    trading: structure.trading + structure.scoring,
    gunline: structure.home + structure.antiTank,
    skew: structure.antiTank + structure.midboard,
    horde: structure.scoring + structure.screens,
    alphaStrike: structure.antiTank + structure.trading,
    midrange: structure.scoring + structure.antiTank + structure.midboard,
    attrition: structure.home + structure.midboard,
    mobilityTempo: structure.scoring + structure.screens,
    combo: structure.home + structure.antiTank,
  };
  return Math.min(6, (bonuses[playstyle] || bonuses.midrange) * 0.85);
}

function penalizeGaps(units, context) {
  const structure = rosterStructure(units);
  return Object.entries(context.minimums).reduce((penalty, [need, target]) => {
    const missing = Math.max(0, target - (structure[need] || 0));
    return penalty + missing * 5.5;
  }, 0);
}

function penalizeOffPlanArchetype(units, context) {
  const total = Math.max(1, totalPoints(units));
  const offPlanShare = units.reduce((sum, unitData) => {
    if (isUtilityAllowance(unitData, { ...context, structure: rosterStructure(units) })) return sum;
    const identity = archetypeIdentityScore(unitData, context);
    if (identity >= -0.3) return sum;
    return sum + unitData.points / total;
  }, 0);
  const tolerance = ["midrange", "trading"].includes(context.playstyle) ? 0.32 : context.playstyle === "combo" ? 0.28 : 0.22;
  return Math.max(0, offPlanShare - tolerance) * 36;
}

function penalizeOverinvestment(units) {
  const total = Math.max(1, totalPoints(units));
  let penalty = 0;
  units.forEach((unitData) => {
    const share = unitData.points / total;
    if (share > 0.22) penalty += (share - 0.22) * 55;
  });
  const characterShare = totalPoints(units.filter(isCharacterLike)) / total;
  if (characterShare > 0.28) penalty += (characterShare - 0.28) * 45;
  const transportShare = totalPoints(units.filter(isDedicatedTransport)) / total;
  if (transportShare > 0.16) penalty += (transportShare - 0.16) * 55;
  return penalty;
}

function penalizeComboDependence(units, context) {
  const leaders = units.filter((unitData) => isCharacterLike(unitData) && leaderTargets(context.side, unitData).length && !isIndependentOperative(unitData, context.side));
  const unsupportedLeaders = leaders.filter((leader) => !units.some((unitData) => unitData !== leader && canLeadUnit(context.side, leader, unitData))).length;
  const supportedCombos = leaders.length - unsupportedLeaders;
  let penalty = unsupportedLeaders * 7;
  if ((context.playstyle === "combo" || context.playstyle === "gunline") && supportedCombos === 1) penalty += 4;
  return penalty;
}

function penalizeInvalidList(units, context) {
  let penalty = 0;
  if (!units.some(canBeWarlord)) penalty += 18;
  if (totalPoints(units) > state.gameSize) penalty += 100;
  const grouped = new Map();
  units.forEach((unitData) => grouped.set(unitData.name, (grouped.get(unitData.name) || 0) + 1));
  grouped.forEach((count, name) => {
    const unitData = units.find((unit) => unit.name === name);
    if (unitData && count > datasheetLimit(unitData)) penalty += (count - datasheetLimit(unitData)) * 30;
  });
  return penalty;
}

function adjustForArchetype(units, context) {
  return units.reduce((score, unitData) => score + playstyleScore(unitData, context.playstyle), 0) / Math.max(1, units.length) * 2.5;
}

function duplicateUnitNames(units) {
  const counts = units.reduce((map, unitData) => map.set(unitData.name, (map.get(unitData.name) || 0) + 1), new Map());
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}

function playstyleScore(unitData, playstyle) {
  const archetype = archetypes[playstyle] || archetypes.midrange;
  const features = unitFeatures(unitData);
  const styleHit = archetypeLegacyStyles(playstyle).some((style) => unitData.styles.includes(style)) ? 2.4 : 0;
  return styleHit + Object.entries(archetype.weights).reduce((score, [feature, weight]) => score + (features[feature] || 0) * weight, 0);
}

function archetypeIdentityScore(unitData, context = {}) {
  const playstyle = context.playstyle || "midrange";
  const f = unitFeatures(unitData);
  const battleline = unitData.section === "Battleline" ? 1 : 0;
  const character = isCharacterLike(unitData) ? 1 : 0;
  const transport = isDedicatedTransport(unitData) ? 1 : 0;
  const utility = isUtilityAllowance(unitData, context) ? 0.8 : 0;
  const plans = {
    meleeRush: f.charge * 2.4 + f.melee * 2.1 + f.speed * 1.6 + f.pressure * 1.5 + transport * 0.9 + utility - f.indirect * 1.4 - (f.anchor && !f.speed ? 1.1 : 0),
    trading: f.trading * 2.4 + f.cheap * 1.6 + f.speed * 1.4 + f.scoring * 1.1 + f.deepStrike * 0.8 + utility - f.elite * 0.9,
    gunline: f.shooting * 2.2 + f.rangedAntiTank * 2.1 + f.anchor * 1.8 + f.indirect * 1.5 + f.screens * 0.8 + utility - (f.charge && !f.shooting ? 1.4 : 0),
    skew: f.monsterVehicle * 2.2 + f.elite * 2 + f.durability * 1.5 + f.antiTank * 1.1 - f.cheap * 1.2 - battleline * 0.7 + utility,
    horde: f.cheap * 2.4 + f.boardControl * 2.2 + f.screens * 1.7 + f.scoring * 1.5 + battleline * 0.9 - f.elite * 1.6 - f.monsterVehicle * 0.8,
    alphaStrike: f.rangedAntiTank * 2.5 + f.antiTank * 1.8 + f.shooting * 1.8 + f.deepStrike * 1.4 + f.speed * 1.2 + f.pressure * 1 - battleline * 1.3 - (f.scoring && !f.shooting && !f.antiTank ? 1.4 : 0),
    midrange: f.scoring * 1.4 + f.trading * 1.3 + f.antiTank * 1.2 + f.shooting + f.melee + f.durability + utility,
    attrition: f.durability * 2.3 + f.anchor * 2 + f.recovery * 1.5 + f.scoring + f.screens * 0.8 - f.cheap * 0.7 + utility,
    mobilityTempo: f.speed * 2.5 + f.deepStrike * 1.9 + f.scoring * 1.4 + f.trading + f.screens * 0.9 - (f.anchor && !f.speed ? 1.4 : 0),
    combo: f.synergy * 2.2 + f.buff * 2 + f.anchor + f.shooting * 0.8 + f.melee * 0.8 + character * 0.8 + utility - f.cheap * 0.5,
  };
  const raw = plans[playstyle] ?? plans.midrange;
  const rolePenalty = archetypeRolePenalty(unitData, playstyle, f);
  return raw - rolePenalty;
}

function archetypeRolePenalty(unitData, playstyle, features) {
  if (playstyle === "alphaStrike" && unitData.section === "Battleline" && !features.antiTank && !features.deepStrike && !features.shooting) return 2.2;
  if (playstyle === "gunline" && features.melee && !features.shooting && !features.anchor) return 1.8;
  if (playstyle === "meleeRush" && features.shooting && !features.charge && !features.speed) return 1.6;
  if (playstyle === "horde" && (features.elite || features.monsterVehicle) && !features.boardControl) return 1.5;
  if (playstyle === "skew" && features.cheap && !features.monsterVehicle && !features.elite) return 1.6;
  if (playstyle === "mobilityTempo" && features.anchor && !features.speed && !features.deepStrike) return 1.7;
  return 0;
}

function archetypeLegacyStyles(playstyle) {
  return archetypes[playstyle]?.legacy || [playstyle];
}

function unitFeatures(unitData) {
  const cacheKey = [
    state.gameSize,
    unitData.name,
    unitData.points,
    unitData.section,
    (unitData.tags || []).join(","),
    (unitData.styles || []).join(","),
  ].join("|");
  if (unitFeatureCache.has(cacheKey)) return unitFeatureCache.get(cacheKey);
  const text = unitText(unitData);
  const traitText = unitTraitText(unitData);
  const traitHit = (needles) => featureHitIn(traitText, needles);
  const weaponProfile = unitWeaponFeatureScores(unitData);
  const cheap = unitData.points <= state.gameSize * 0.055 ? 1 : 0;
  const elite = unitData.points >= state.gameSize * 0.12 || isEpicHero(unitData) ? 1 : 0;
  const independent = isIndependentOperative(unitData) ? 1 : 0;
  const fortification = unitData.section === "Fortification" || /\bfortification\b/i.test(text) ? 1 : 0;
  const features = {
    speed: traitHit(["mobility", "deep strike", "infiltrate", "scout", "jump", "bike", "mounted", "transport", "tempo", "venom", "raider", "reaver", "hellion", "scourge", "mandrake", "gargoyle", "warp spider", "swooping hawk", "piranha", "starweaver"]),
    charge: traitHit(["melee", "charge", "jump", "mounted", "deep strike", "assault", "wych", "genestealer", "berzerker", "eightbound", "squighog", "sanguinary", "death company", "hellion", "incubi"]),
    melee: Math.max(weaponProfile.melee, traitHit(["melee", "trading", "blade", "claw", "talon", "sword", "hammer", "fist", "incubi", "chosen", "eightbound", "wych", "hellion", "berserk", "beserk", "daemonette", "flayed", "skorpekh", "death company", "sanguinary"])),
    shooting: Math.max(weaponProfile.shooting, traitHit(["shooting", "fire support", "indirect", "gunline", "destroyer", "doomsday", "hammerhead", "broadside", "exocrine", "desolator", "desolation"])),
    antiTank: Math.max(weaponProfile.antiTank, traitHit(["anti-tank", "anti tank", "eradicator", "heavy weapons", "scourge", "lokhust", "void dragon", "hammerstrike", "ballistus"])),
    rangedAntiTank: weaponProfile.rangedAntiTank,
    durability: traitHit(["durable", "anchor", "vehicle", "monster", "fortification", "terminator", "wraith", "custodian", "death guard", "c'tan", "ctan", "norn", "knight", "land raider", "monolith", "avatar"]),
    anchor: traitHit(["anchor", "durable", "fortification", "terminator", "wraith", "custodian", "heavy", "fortress", "c'tan", "ctan", "norn", "land raider", "monolith"]),
    scoring: Math.max(independent, traitHit(["scoring", "objectives", "battleline", "mission"])),
    screens: Math.max(independent, traitHit(["screen", "scout", "infiltrate", "battleline", "nurglings", "cultist", "gretchin", "termagant", "hormagaunt", "neurogaunt", "ripper", "guardsmen", "kabalite"])),
    trading: Math.max(independent, traitHit(["trading", "threat", "cheap", "jump", "incubi", "mandrake", "chosen", "venom", "reaver", "hellion", "scourge", "flayed", "assault intercessor"])),
    boardControl: traitHit(["battleline", "screen", "swarm", "horde", "gaunt", "gant", "cultist", "guardsmen", "boyz", "gretchin", "neophyte", "kabalite", "daemonette"]),
    deepStrike: traitHit(["deep strike", "teleport", "warp", "jump", "reserve", "drop pod", "scourge", "mandrake", "terminator"]),
    transport: isDedicatedTransport(unitData) ? 1 : traitHit(["transport"]),
    independent,
    fortification,
    monsterVehicle: fortification ? 0 : unitData.section === "Vehicle" || unitData.section === "Monster" ? 1 : traitHit(["vehicle", "monster", "knight", "ctan", "c'tan", "norn", "avatar", "daemon prince", "greater daemon"]),
    buff: isCharacterLike(unitData) || traitHit(["leader", "ancient", "apothecary", "lieutenant", "technomancer", "farseer"]) ? 1 : 0,
    synergy: isCharacterLike(unitData) || isDedicatedTransport(unitData) ? 1 : 0,
    pressure: traitHit(["pressure", "threat", "melee", "mobility", "deep strike"]),
    recovery: traitHit(["necron", "reanimation", "death guard", "durable", "anchor"]),
    indirect: Math.max(weaponProfile.indirect, traitHit(["indirect", "artillery", "mortar", "biovore", "desolator", "desolation"])),
    cheap,
    elite,
  };
  unitFeatureCache.set(cacheKey, features);
  return features;
}

function unitWeaponFeatureScores(unitData) {
  const detail = unitDetailForAny(unitData);
  const weapons = effectiveWargear(detail || {}, unitData.config || {}, unitData);
  const ranged = weapons.filter((weapon) => normalizeName(weapon.type || weapon.range) !== "melee");
  const melee = weapons.filter((weapon) => normalizeName(weapon.type || weapon.range) === "melee");
  return {
    shooting: weaponBucketScore(ranged, "shooting"),
    rangedAntiTank: weaponBucketScore(ranged, "antiTank"),
    antiTank: Math.max(weaponBucketScore(ranged, "antiTank"), weaponBucketScore(melee, "antiTank") * 0.75),
    melee: weaponBucketScore(melee, "melee"),
    indirect: ranged.some((weapon) => normalizeName(weapon.abilities).includes("indirect fire")) ? 1 : 0,
  };
}

function weaponBucketScore(weapons, role) {
  if (!weapons.length) return 0;
  const weighted = weapons.map((weapon) => {
    const count = Math.max(1, Number(weapon.count || 1));
    return { score: weaponProfileScore(weapon, role), count };
  });
  const totalCount = weighted.reduce((sum, weapon) => sum + weapon.count, 0);
  const average = weighted.reduce((sum, weapon) => sum + weapon.score * weapon.count, 0) / Math.max(1, totalCount);
  const best = Math.max(...weighted.map((weapon) => weapon.score));
  const bestCount = weighted.find((weapon) => weapon.score === best)?.count || 1;
  const bestShare = bestCount / Math.max(1, totalCount);
  const depth = Math.min(0.18, Math.log2(totalCount + 1) * 0.045);
  return clamp01(average * 0.56 + best * (0.24 + bestShare * 0.16) + depth);
}

function weaponProfileScore(weapon, role) {
  const text = normalizeName(`${weapon.name} ${weapon.abilities || ""}`);
  const strength = weaponNumericValue(weapon.S);
  const ap = Math.abs(weaponNumericValue(weapon.AP));
  const damage = weaponNumericValue(weapon.D);
  const attacks = weaponNumericValue(weapon.A);
  if (role === "antiTank") {
    let score = 0;
    if (strength >= 9) score += 0.42;
    else if (strength >= 7) score += 0.25;
    if (ap >= 2) score += 0.22;
    if (damage >= 3) score += 0.28;
    if (/melta|lascannon|krak|rail|bright lance|doomsday|volcano|demolisher|hunter-killer/.test(text)) score += 0.25;
    return clamp01(score);
  }
  if (role === "melee") {
    let score = 0.2;
    if (attacks >= 4) score += 0.22;
    if (strength >= 6) score += 0.2;
    if (ap >= 1) score += 0.16;
    if (damage >= 2) score += 0.18;
    if (/hammer|fist|claw|blade|sword|talon|chain/.test(text)) score += 0.12;
    return clamp01(score);
  }
  let score = 0;
  if (attacks >= 2) score += 0.16;
  if (strength >= 5) score += 0.14;
  if (ap >= 1) score += 0.14;
  if (damage >= 2) score += 0.14;
  if (/blast|torrent|rapid fire|sustained hits|indirect fire|launcher|missile|rocket|cannon|bolter|rifle/.test(text)) score += 0.22;
  if (/frag|flamer|torrent|blast/.test(text)) score += 0.12;
  return clamp01(score);
}

function weaponNumericValue(value) {
  const text = String(value || "").toLowerCase();
  if (!text || text === "-") return 0;
  const die = text.match(/d(\d)(?:\s*\+\s*(\d+))?/);
  if (die) return (Number(die[1]) + 1) / 2 + Number(die[2] || 0);
  const number = text.match(/-?\d+/);
  return Number(number?.[0] || 0);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function featureHit(unitData, needles) {
  return featureHitIn(unitText(unitData), needles);
}

function featureHitIn(text, needles) {
  return needles.some((needle) => text.includes(needle)) ? 1 : 0;
}

function listGapScore(unitData, context) {
  let score = 0;
  const features = unitFeatures(unitData);
  if (context.needsWarlord && canBeWarlord(unitData)) score += 4.2;
  if (context.needsScoring && hasAnyText(unitData, ["objectives", "scoring", "battleline"])) score += 2.2;
  if (context.needsAntiTank && hasAnyText(unitData, ["anti-tank", "lascannon", "melta", "railgun", "doomsday", "bright lance"])) score += 2.4;
  if (context.needsScreens && hasAnyText(unitData, ["screen", "infiltrate", "scout", "battleline"])) score += 1.4;
  Object.entries(context.minimums).forEach(([need, target]) => {
    if ((context.structure[need] || 0) >= target) return;
    if (featuresForNeed(need).some((feature) => features[feature])) score += 1.4;
  });
  return score;
}

function fillsCurrentStructuralNeed(unitData, context) {
  if (context.needsWarlord && canBeWarlord(unitData)) return true;
  const features = unitFeatures(unitData);
  return Object.entries(context.minimums || {}).some(([need, target]) => {
    if ((context.structure?.[need] || 0) >= target) return false;
    return featuresForNeed(need).some((feature) => features[feature]);
  });
}

function featuresForNeed(need) {
  const mapping = {
    scoring: ["scoring"],
    trading: ["trading", "cheap"],
    antiTank: ["antiTank"],
    antiHorde: ["shooting", "melee"],
    screens: ["screens"],
    home: ["anchor", "durability", "scoring"],
    midboard: ["durability", "melee", "pressure", "boardControl"],
  };
  return mapping[need] || [];
}

function coherenceFitScore(unitData, context) {
  if (!isCharacterLike(unitData)) {
    if (isDedicatedTransport(unitData)) {
      const passengers = transportableBaseUnits(context.side, unitData, context.baseUnits);
      return passengers.length ? 0.75 + Math.min(1.5, passengers.length * 0.35) : -8;
    }
    if (context.baseUnits.some((leader) => canLeadUnit(context.side, leader, unitData))) return 1.25;
    return 0;
  }

  if (isIndependentOperative(unitData, context.side)) return 2.2 + (context.needsScoring || context.needsScreens ? 0.8 : 0);
  if (isStandaloneCharacter(unitData)) return 1.1;
  const explicitTargets = leaderTargets(context.side, unitData);
  if (explicitTargets.length) {
    const hasBodyguard = context.baseUnits.some((bodyguard) => explicitTargets.includes(bodyguard.name));
    return hasBodyguard ? 2.4 : context.needsWarlord ? 0.1 : -4.2;
  }
  const role = leaderRole(unitData);
  if (role && context.roles[role]) return 1.4;
  if (context.roles.battleline || context.roles.infantry) return 0.35;
  return context.needsWarlord ? 0.2 : -2.8;
}

function repetitionFitScore(unitData, context) {
  const alreadyRepeated = context.repeatedNames.has(unitData.name);
  const planFit = archetypePlanFit(unitData, context.playstyle);
  const repeatFit = archetypeRepeatFit(unitData, context.playstyle);
  const weakFit = weakArchetypeFitThreshold(context.playstyle);
  const strongFit = strongArchetypeFitThreshold(context.playstyle);
  if (isCharacterLike(unitData)) return alreadyRepeated ? -3.5 : context.characterCount >= 3 ? -1.6 : 0;
  if (alreadyRepeated && !canRepeatForArchetype(unitData, context.playstyle)) return -4.8;
  if (unitData.section === "Battleline" && planFit < weakFit && !["horde", "trading", "midrange"].includes(context.playstyle)) return alreadyRepeated ? -5 : -1.4;
  if (alreadyRepeated && repeatFit < repeatFitThreshold(context.playstyle)) return -3.9;
  if (unitData.section === "Battleline") return alreadyRepeated ? (repeatFit >= repeatFitThreshold(context.playstyle) ? 0.25 : -1.1) : 0.25;
  if (unitData.section === "Dedicated Transport") return alreadyRepeated ? -0.15 : 0.25;
  return alreadyRepeated ? (repeatFit >= repeatFitThreshold(context.playstyle) ? 0.35 : -1.1) : 0.15;
}

function riskFitScore(unitData, risk) {
  const swing = swingScore(unitData);
  const stability = stabilityScore(unitData);
  const appetite = (risk - 5) / 5;
  if (appetite >= 0) return swing * appetite * 1.35 + stability * 0.25;
  return stability * Math.abs(appetite) * 1.35 - swing * Math.abs(appetite) * 1.1;
}

function experienceFitScore(unitData, experience) {
  const complexity = complexityScore(unitData);
  const simplicity = simplicityScore(unitData);
  if (experience === "new") return simplicity * 1.35 - complexity * 1.45;
  if (experience === "expert") return complexity * 0.9 + swingScore(unitData) * 0.35;
  return simplicity * 0.35 - Math.max(0, complexity - 2) * 0.25;
}

function swingScore(unitData) {
  let score = tagHits(unitText(unitData), ["deep strike", "indirect", "infiltrate", "scout", "mortal", "charge", "lone operative", "glass", "reserve"]);
  if (unitData.points >= state.gameSize * 0.12) score += 1;
  if (isEpicHero(unitData)) score += 0.8;
  if (unitData.styles.includes("melee")) score += 0.5;
  return score;
}

function stabilityScore(unitData) {
  let score = tagHits(unitText(unitData), ["durable", "anchor", "battleline", "objectives", "scoring", "screen", "transport"]);
  if (unitData.points <= state.gameSize * 0.06) score += 0.8;
  if (unitData.section === "Battleline") score += 0.8;
  return score;
}

function complexityScore(unitData) {
  let score = tagHits(unitText(unitData), ["deep strike", "infiltrate", "scout", "indirect", "transport", "lone operative", "aura", "leader", "move block"]);
  if (unitData.styles.length > 1) score += 0.7;
  if (unitData.section === "Character" || isEpicHero(unitData)) score += 0.7;
  if (unitData.points >= state.gameSize * 0.14) score += 0.8;
  return score;
}

function simplicityScore(unitData) {
  let score = tagHits(unitText(unitData), ["battleline", "durable", "anchor", "objectives", "shooting", "scoring"]);
  if (unitData.section === "Battleline") score += 1;
  if (unitData.points <= state.gameSize * 0.07) score += 0.5;
  return score;
}

function archetypePlanFit(unitData, playstyle = "midrange") {
  const features = unitFeatures(unitData);
  const archetype = archetypes[playstyle] || archetypes.midrange;
  const weighted = Object.entries(archetype.weights || {}).reduce((score, [feature, weight]) => {
    if (weight <= 0) return score;
    return score + (features[feature] || 0) * weight;
  }, 0);
  const styleHit = archetypeLegacyStyles(playstyle).some((style) => unitData.styles.includes(style)) ? 1.2 : 0;
  return weighted + styleHit;
}

function archetypeRepeatFit(unitData, playstyle = "midrange") {
  const features = unitFeatures(unitData);
  const mapping = {
    meleeRush: features.charge * 1.6 + features.melee * 1.6 + features.speed + features.pressure,
    trading: features.trading * 1.7 + features.cheap * 1.2 + features.speed + features.scoring * 0.8,
    gunline: features.shooting * 1.7 + features.rangedAntiTank * 1.8 + features.anchor + features.indirect * 1.2 + features.screens * 0.7,
    skew: features.monsterVehicle * 1.8 + features.elite * 1.5 + features.durability + features.antiTank * 0.8,
    horde: features.cheap * 1.6 + features.boardControl * 1.6 + features.screens * 1.3 + features.scoring,
    alphaStrike: features.antiTank * 1.6 + features.shooting * 1.1 + features.speed * 0.8 + features.deepStrike * 1.2 + features.pressure * 1.2 + features.trading * 0.6,
    midrange: features.trading + features.scoring + features.antiTank + features.shooting * 0.8 + features.melee * 0.8 + features.durability * 0.8,
    attrition: features.durability * 1.6 + features.anchor * 1.5 + features.recovery + features.scoring * 0.7,
    mobilityTempo: features.speed * 1.7 + features.deepStrike * 1.5 + features.scoring + features.screens * 0.8 + features.trading * 0.7,
    combo: features.synergy * 1.7 + features.buff * 1.6 + features.anchor * 0.8 + features.shooting * 0.5 + features.melee * 0.5,
  };
  const styleHit = archetypeLegacyStyles(playstyle).some((style) => unitData.styles.includes(style)) ? 0.8 : 0;
  return (mapping[playstyle] ?? mapping.midrange) + styleHit;
}

function repeatFitThreshold(playstyle = "midrange") {
  const thresholds = {
    meleeRush: 3.4,
    trading: 3.1,
    gunline: 3.3,
    skew: 3.1,
    horde: 2.6,
    alphaStrike: 3.2,
    midrange: 3.4,
    attrition: 3.0,
    mobilityTempo: 3.2,
    combo: 2.7,
  };
  return thresholds[playstyle] || 3.2;
}

function weakArchetypeFitThreshold(playstyle = "midrange") {
  const thresholds = {
    meleeRush: 3.4,
    trading: 3.0,
    gunline: 3.1,
    skew: 3.2,
    horde: 2.6,
    alphaStrike: 3.5,
    midrange: 2.9,
    attrition: 3.0,
    mobilityTempo: 3.2,
    combo: 2.8,
  };
  return thresholds[playstyle] || 3;
}

function strongArchetypeFitThreshold(playstyle = "midrange") {
  return weakArchetypeFitThreshold(playstyle) + (playstyle === "horde" ? 0.8 : 1.1);
}

function isUtilityAllowance(unitData, context = {}) {
  if (context.needsWarlord && canBeWarlord(unitData)) return true;
  const features = unitFeatures(unitData);
  if (context.needsScoring && features.scoring) return true;
  if (context.needsScreens && features.screens) return true;
  if (context.needsAntiTank && features.antiTank) return true;
  return Object.entries(context.minimums || {}).some(([need, target]) => {
    if ((context.structure?.[need] || 0) >= target) return false;
    return featuresForNeed(need).some((feature) => features[feature]);
  });
}

function wouldExceedArchetypeRoleCap(roster, unitData, context = {}) {
  if (isCharacterLike(unitData) || isDedicatedTransport(unitData)) return false;
  const playstyle = context.playstyle || "midrange";
  const features = unitFeatures(unitData);
  const fit = archetypePlanFit(unitData, playstyle);
  const weakFit = weakArchetypeFitThreshold(playstyle);
  if (unitData.section === "Battleline") {
    const currentBattleline = roster.filter((unit) => unit.section === "Battleline").length;
    if (currentBattleline >= battlelineArchetypeCap(playstyle)) return true;
  }
  if (fit >= weakFit || isUtilityAllowance(unitData, context)) return false;

  if (unitData.section === "Battleline" || features.scoring) {
    const cap = genericScoringCap(playstyle);
    const current = roster.filter((unit) => {
      const unitFeaturesValue = unitFeatures(unit);
      return (unit.section === "Battleline" || unitFeaturesValue.scoring) && archetypePlanFit(unit, playstyle) < weakFit;
    }).length;
    return current >= cap;
  }

  if (features.screens) {
    const cap = playstyle === "horde" ? 4 : ["trading", "mobilityTempo", "midrange"].includes(playstyle) ? 2 : 1;
    const current = roster.filter((unit) => unitFeatures(unit).screens && archetypePlanFit(unit, playstyle) < weakFit).length;
    return current >= cap;
  }

  return false;
}

function genericScoringCap(playstyle = "midrange") {
  const caps = {
    meleeRush: 2,
    trading: 3,
    gunline: 2,
    skew: 1,
    horde: 6,
    alphaStrike: 1,
    midrange: 3,
    attrition: 2,
    mobilityTempo: 2,
    combo: 2,
  };
  return caps[playstyle] || 2;
}

function battlelineArchetypeCap(playstyle = "midrange") {
  const caps = {
    meleeRush: 3,
    trading: 4,
    gunline: 2,
    skew: 1,
    horde: 8,
    alphaStrike: 2,
    midrange: 4,
    attrition: 3,
    mobilityTempo: 3,
    combo: 2,
  };
  const base = caps[playstyle] || 3;
  if (playstyle === "horde") return base + Math.floor(Math.max(0, state.gameSize - 1000) / 500);
  return base + Math.floor(Math.max(0, state.gameSize - 1000) / 1000);
}

function maxAutoPickCopies(unitData, context = {}) {
  if (isEpicHero(unitData)) return 1;
  if (isCharacterLike(unitData)) return 1;
  if (unitData.section === "Dedicated Transport") return 1;
  const playstyle = context.playstyle || "midrange";
  const features = unitFeatures(unitData);
  const weapons = unitWeaponFeatureScores(unitData);
  const lowOutputScreen = features.screens && features.cheap && Math.max(weapons.shooting, weapons.antiTank, weapons.melee) < 0.45;
  if (lowOutputScreen && !["horde", "mobilityTempo"].includes(playstyle)) return 1;
  const fit = archetypePlanFit(unitData, playstyle);
  const repeatFit = archetypeRepeatFit(unitData, playstyle);
  const weakFit = weakArchetypeFitThreshold(playstyle);
  const strongFit = strongArchetypeFitThreshold(playstyle);
  if (fit < weakFit && !isUtilityAllowance(unitData, context)) return 1;
  if (!canRepeatForArchetype(unitData, playstyle)) return 1;
  if (playstyle === "horde") {
    if (unitData.section === "Battleline" || unitFeatures(unitData).boardControl || unitFeatures(unitData).screens) return fit >= strongFit ? 4 : 3;
    return fit >= strongFit ? 2 : 1;
  }
  if (playstyle === "skew") return repeatFit >= 3.2 ? 3 : 1;
  if (playstyle === "combo") return repeatFit >= 2.6 ? 2 : 1;
  if (unitData.section === "Battleline") return ["trading", "midrange", "attrition"].includes(playstyle) && repeatFit >= 2.6 ? 2 : 1;
  return repeatFit >= repeatFitThreshold(playstyle) ? 2 : 1;
}

function canRepeatForArchetype(unitData, playstyle = "midrange") {
  const features = unitFeatures(unitData);
  const weapons = unitWeaponFeatureScores(unitData);
  if (isCharacterLike(unitData) || isDedicatedTransport(unitData)) return false;
  if (playstyle === "gunline") {
    if (hasAnyText(unitData, ["jump pack", "vanguard veteran", "assault squad", "assault intercessor"]) && !hasAnyText(unitData, ["inceptor", "suppressor"])) return false;
    const rangedCore = features.shooting + features.rangedAntiTank + features.anchor + features.indirect + features.screens;
    const meleeSkirmisher = features.melee + features.charge + features.speed > rangedCore + 0.2 && !features.indirect && features.rangedAntiTank < 0.8;
    return rangedCore >= 1.4 && !meleeSkirmisher;
  }
  if (playstyle === "combo") return features.synergy || features.buff || features.anchor;
  if (playstyle === "skew") return features.monsterVehicle || features.elite || features.durability;
  if (playstyle === "attrition") return features.durability || features.anchor || features.recovery;
  if (playstyle === "mobilityTempo") return features.speed || features.deepStrike || features.scoring || features.screens;
  if (playstyle === "meleeRush") return features.melee || features.charge || features.speed;
  if (playstyle === "alphaStrike") return features.antiTank || features.shooting || features.deepStrike || features.pressure || features.speed && Math.max(weapons.shooting, weapons.antiTank, weapons.melee) >= 0.45;
  if (playstyle === "trading") return features.trading || features.cheap || features.speed || features.scoring;
  if (playstyle === "horde") return features.cheap || features.boardControl || features.screens || features.scoring;
  return features.trading || features.scoring || features.antiTank || features.durability || features.shooting || features.melee;
}

function isCharacterLike(unitData) {
  return canBeWarlord(unitData);
}

function countCharacterLike(units) {
  return units.filter(isCharacterLike).length;
}

function isDedicatedTransport(unitData) {
  return unitData.section === "Dedicated Transport";
}

function countDedicatedTransports(units) {
  return units.filter(isDedicatedTransport).length;
}

function maxUsefulTransportSlots(units) {
  const transportableUnits = units.filter(isTransportableBody).length;
  if (!transportableUnits) return 0;
  if (transportableUnits <= 2) return 1;
  if (transportableUnits <= 4) return 2;
  return Math.min(4, Math.ceil(transportableUnits / 2));
}

function usefulTransportCopies(side, transport, baseUnits) {
  const passengerCount = transportableBaseUnits(side, transport, baseUnits).length;
  if (!passengerCount) return 0;
  return Math.min(2, Math.ceil(passengerCount / 2));
}

function transportableBaseUnits(side, transport, baseUnits) {
  const rule = transportRule(side, transport);
  if (rule?.eligibleUnits?.length) {
    return baseUnits.filter((unitData) => rule.eligibleUnits.includes(unitData.name));
  }
  return baseUnits.filter(isTransportableBody);
}

function isTransportableBody(unitData) {
  if (!["Infantry", "Battleline"].includes(unitData.section)) return false;
  return !hasAnyText(unitData, ["jump", "mounted", "bike", "cavalry", "terminator", "gravis", "centurion", "monster", "vehicle"]);
}

function currentFaction(side) {
  return side === "enemy" ? state.enemyFaction : state.faction;
}

function leaderTargets(side, leader) {
  return currentFaction(side).synergy?.leaders?.[leader.name] || [];
}

function transportRule(side, transport) {
  return currentFaction(side).synergy?.transports?.[transport.name] || null;
}

function canLeadUnit(side, leader, bodyguard) {
  const targets = leaderTargets(side, leader);
  return targets.length ? targets.includes(bodyguard.name) : false;
}

function compatibleRosterLeaders(side, bodyguard) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  return units
    .map((leader, index) => ({ leader, index }))
    .filter(({ leader }) => leader.instanceId !== bodyguard.instanceId && canLeadUnit(side, leader, bodyguard));
}

function reconcileLeaderRefs(units) {
  const ids = new Set(units.filter(isCharacterLike).map((unitData) => unitData.instanceId));
  units.forEach((unitData) => {
    if (unitData.config?.leaderRef && !ids.has(unitData.config.leaderRef)) {
      unitData.config.leaderRef = "";
    }
  });
}

function maxCharacterSlots() {
  if (state.gameSize <= 1000) return 2;
  if (state.gameSize >= 3000) return 5;
  return 3;
}

function rosterRoles(units) {
  return units.reduce(
    (roles, unitData) => {
      roles.infantry ||= ["Infantry", "Battleline"].includes(unitData.section);
      roles.battleline ||= unitData.section === "Battleline";
      roles.gravis ||= hasAnyText(unitData, ["gravis", "heavy intercessor", "aggressor", "eradicator", "indomitor"]);
      roles.terminator ||= hasAnyText(unitData, ["terminator", "deathwing", "blightlord", "scarab occult"]);
      roles.jump ||= hasAnyText(unitData, ["jump", "inceptor", "suppressor", "swooping", "scourge", "gargoyle"]);
      roles.phobos ||= hasAnyText(unitData, ["phobos", "infiltrator", "incursor", "reiver", "combi-weapon", "scout"]);
      roles.mounted ||= unitData.section === "Mounted" || hasAnyText(unitData, ["bike", "outrider", "reaver", "pioneer", "cavalry"]);
      roles.transportable ||= ["Infantry", "Battleline"].includes(unitData.section) && !hasAnyText(unitData, ["jump", "terminator", "gravis", "mounted"]);
      return roles;
    },
    { infantry: false, battleline: false, gravis: false, terminator: false, jump: false, phobos: false, mounted: false, transportable: false }
  );
}

function rosterStructure(units) {
  return units.reduce(
    (structure, unitData) => {
      const features = unitFeatures(unitData);
      Object.keys(structure).forEach((key) => {
        if (featuresForNeed(key).some((feature) => features[feature])) structure[key] += 1;
      });
      return structure;
    },
    { scoring: 0, trading: 0, antiTank: 0, antiHorde: 0, screens: 0, home: 0, midboard: 0 }
  );
}

function leaderRole(unitData) {
  if (hasAnyText(unitData, ["jump pack", "with wings", "winged"])) return "jump";
  if (hasAnyText(unitData, ["gravis"])) return "gravis";
  if (hasAnyText(unitData, ["terminator"])) return "terminator";
  if (hasAnyText(unitData, ["phobos", "combi-weapon", "reiver"])) return "phobos";
  if (hasAnyText(unitData, ["bike", "mounted", "cavalry"])) return "mounted";
  return "infantry";
}

function isStandaloneCharacter(unitData) {
  return isIndependentOperative(unitData) || isEpicHero(unitData) || hasAnyText(unitData, [
    "ctan",
    "c'tan",
    "daemon prince",
    "avatar",
    "solitaire",
    "deathleaper",
    "vashtorr",
    "be'lakor",
    "kairos",
    "lord of change",
    "keeper of secrets",
    "bloodthirster",
    "great unclean one",
  ]);
}

function clearRoster(side) {
  if (side === "enemy") {
    state.enemyRoster = [];
    $("#enemyPaste").value = "";
  } else {
    state.roster = [];
    $("#playerPaste").value = "";
  }
  syncInferredContext(side === "enemy");
  render();
}

function parseEnemyList() {
  parseList("enemy");
}

function parseList(side) {
  const isEnemy = side === "enemy";
  const text = $(isEnemy ? "#enemyPaste" : "#playerPaste").value;
  if (!text.trim()) return;
  const result = importRosterTextToSide(side, text);
  renderImportStatus(side, result);
  render();
}

function importRosterTextToSide(side, text) {
  const isEnemy = side === "enemy";
  let meta = detectRosterMeta(text, isEnemy ? state.enemyFaction : state.faction);
  const parsed = parseRosterTextWithFactionFallback(text, meta.faction || (isEnemy ? state.enemyFaction : state.faction));
  if (parsed.faction && (!meta.faction || parsed.faction.id !== meta.faction.id)) {
    meta = {
      faction: parsed.faction,
      detachment: findDetachmentMention(text, parsed.faction) || parsed.faction.detachments[0],
    };
  }
  applyRosterMeta(side, meta);
  const faction = isEnemy ? state.enemyFaction : state.faction;
  const result = { ...parsed.result, meta: { ...meta, faction } };
  result.units.forEach((unitData) => resolveImportedEnhancement(side, unitData));
  if (isEnemy) {
    state.enemyRoster = result.units;
  } else {
    state.roster = result.units;
  }
  syncInferredContext(isEnemy);
  return result;
}

function syncInferredContext(resetWhenEmpty = false) {
  if (!state.enemyRoster.length) {
    if (resetWhenEmpty) {
      $("#meta").value = "balanced";
      $("#enemyStyle").value = "midrange";
    }
    return;
  }
  $("#meta").value = inferLocalMeta(state.enemyRoster);
  $("#enemyStyle").value = inferRosterStyle(state.enemyRoster, state.enemyDetachment);
}

function inferLocalMeta(units) {
  if (!units.length) return "balanced";

  const profile = armyProfile(units);
  const composition = rosterComposition(units);

  if (composition.indirectShare >= 0.18 || composition.indirectCount >= 3 && profile.shooting >= 58) return "indirect";
  if (composition.hordeCount >= expectedHordeCount(composition.points) || composition.boardControlShare >= 0.38 && composition.averagePoints <= 120) return "horde";
  if (composition.vehicleMonsterShare >= 0.34 || composition.bigThreatCount >= 4 || profile.durability >= 72 && profile.antiTank >= 46) return "vehicle";
  if (composition.averagePoints >= 145 || composition.eliteShare >= 0.44 || composition.durableShare >= 0.58) return "elite";
  return "balanced";
}

function inferRosterStyle(units, detachment = null) {
  if (!units.length) return "midrange";

  const composition = rosterComposition(units);
  const totals = Object.fromEntries(Object.keys(archetypes).map((key) => [key, 0]));

  units.forEach((unitData) => {
    const features = unitFeatures(unitData);
    const weight = Math.max(0.45, unitData.points / Math.max(1, composition.points) * units.length);
    Object.entries(archetypes).forEach(([key, archetype]) => {
      totals[key] += Object.entries(archetype.weights).reduce((sum, [feature, featureWeight]) => sum + (features[feature] || 0) * featureWeight * weight, 0);
    });
  });

  const addScore = (key, value) => {
    totals[key] = (totals[key] || 0) + value;
  };

  if (detachment?.styles?.includes("pressure")) addScore("meleeRush", 3);
  if (detachment?.styles?.includes("mission")) addScore("trading", 2.5);
  if (detachment?.styles?.includes("shooting")) addScore("gunline", 3);
  if (detachment?.styles?.includes("durable")) addScore("attrition", 3);
  if (detachment?.styles?.includes("mobility")) addScore("mobilityTempo", 3);

  if (composition.fastShare >= 0.34 && composition.scoringShare >= 0.18) addScore("mobilityTempo", 14);
  if (composition.msuShare >= 0.42 && composition.tradingShare >= 0.22) addScore("trading", 13);
  if (composition.meleeShare >= 0.34 && composition.fastShare >= 0.22) addScore("meleeRush", 15);
  if (composition.shootingShare >= 0.42 && (composition.durableShare >= 0.24 || composition.indirectShare >= 0.12)) addScore("gunline", 14);
  if (composition.vehicleMonsterShare >= 0.45 || composition.bigThreatCount >= 4 || composition.repeatedMax >= 3 && composition.repeatedPointsShare >= 0.34) addScore("skew", 16);
  if (composition.hordeCount >= expectedHordeCount(composition.points) || composition.boardControlShare >= 0.38) addScore("horde", 15);
  if (composition.durableShare >= 0.44 && composition.fastShare < 0.28) addScore("attrition", 13);
  if (composition.characterCount >= 4 && composition.buffShare >= 0.16 || composition.leaderSupportedShare >= 0.24) addScore("combo", 12);
  if (composition.spread >= 5 && composition.bigThreatCount <= 3 && composition.vehicleMonsterShare < 0.44 && composition.hordeCount < expectedHordeCount(composition.points)) addScore("midrange", 9);

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

function rosterComposition(units) {
  const points = Math.max(1, totalPoints(units));
  const counts = units.reduce((map, unitData) => map.set(unitData.name, (map.get(unitData.name) || 0) + 1), new Map());
  const repeatedMax = Math.max(0, ...counts.values());
  const repeatedNames = new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  const featureRows = units.map((unitData) => ({ unitData, features: unitFeatures(unitData), text: unitText(unitData) }));
  const pointsWhere = (predicate) => featureRows.filter(predicate).reduce((sum, row) => sum + row.unitData.points, 0);
  const countWhere = (predicate) => featureRows.filter(predicate).length;
  const shareWhere = (predicate) => pointsWhere(predicate) / points;
  const featureShare = (feature) => shareWhere((row) => row.features[feature]);
  const sectionOrText = (row, needles) => needles.some((needle) => row.text.includes(needle));

  return {
    points,
    averagePoints: points / Math.max(1, units.length),
    fastShare: featureShare("speed"),
    scoringShare: featureShare("scoring"),
    tradingShare: featureShare("trading"),
    meleeShare: featureShare("melee"),
    shootingShare: featureShare("shooting"),
    durableShare: featureShare("durability"),
    indirectShare: featureShare("indirect"),
    boardControlShare: featureShare("boardControl"),
    eliteShare: featureShare("elite"),
    buffShare: featureShare("buff"),
    vehicleMonsterShare: featureShare("monsterVehicle"),
    msuShare: shareWhere((row) => row.unitData.points <= 115 && !isCharacterLike(row.unitData)),
    repeatedPointsShare: shareWhere((row) => repeatedNames.has(row.unitData.name)),
    leaderSupportedShare: shareWhere((row) => isCharacterLike(row.unitData) && !isIndependentOperative(row.unitData) && hasLeaderTargets("enemy", row.unitData)),
    hordeCount: countWhere((row) => row.features.boardControl || row.unitData.points <= 75 && !isCharacterLike(row.unitData) && !isDedicatedTransport(row.unitData)),
    bigThreatCount: countWhere((row) => row.unitData.points >= 180 || row.features.monsterVehicle && row.unitData.points >= 145 || sectionOrText(row, ["c'tan", "ctan", "primarch", "avatar", "greater daemon"])),
    indirectCount: countWhere((row) => row.features.indirect),
    characterCount: countWhere((row) => isCharacterLike(row.unitData)),
    repeatedMax,
    spread: ["speed", "scoring", "trading", "melee", "shooting", "durability", "antiTank", "screens"].filter((feature) => featureShare(feature) >= 0.16).length,
  };
}

function hasAnyText(unitData, needles) {
  const text = unitText(unitData);
  return needles.some((needle) => text.includes(needle));
}

function unitText(unitData) {
  const detail = unitDetailForAny(unitData);
  const detailText = [
    detail.role,
    detail.legend,
    detail.loadout,
    detail.transport,
    ...(detail.composition || []),
    ...(detail.keywords || []),
    ...(detail.factionKeywords || []),
    ...(detail.abilities || []).flatMap((ability) => [ability.name, ability.type, ability.description]),
    ...(detail.wargear || []).flatMap((weapon) => [weapon.name, weapon.abilities]),
  ].filter(Boolean).join(" ");
  return `${unitData.name} ${unitData.section || ""} ${unitData.tags.join(" ")} ${(unitData.styles || []).join(" ")} ${detailText}`.toLowerCase();
}

function unitTraitText(unitData) {
  const detail = unitDetailForAny(unitData);
  const detailText = [
    detail.role,
    detail.legend,
    detail.loadout,
    detail.transport,
    ...(detail.composition || []),
    ...(detail.keywords || []),
    ...(detail.factionKeywords || []),
    ...(detail.abilities || []).flatMap((ability) => [ability.name, ability.type, ability.description]),
  ].filter(Boolean).join(" ");
  return `${unitData.name} ${unitData.section || ""} ${(unitData.tags || []).join(" ")} ${(unitData.styles || []).join(" ")} ${detailText}`.toLowerCase();
}

function tagHits(text, needles) {
  return needles.filter((needle) => text.includes(needle)).length;
}

function expectedHordeCount(points) {
  if (points <= 1100) return 9;
  if (points >= 2600) return 19;
  return 14;
}

function detectRosterMeta(text, currentFaction) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const factionLine = lines.find((line) => /^(army faction|faction keyword|faction|faccion|faccion clave|army)\s*:/i.test(line));
  const detachmentLine = lines.find((line) => /^(detachment|destacamento)\s*:/i.test(line));
  let faction = findFactionMention(factionLine || text) || null;
  let detachment = faction ? findDetachmentMention(detachmentLine || text, faction) : null;

  if (!detachment) {
    const globalMatch = findDetachmentAcrossFactions(detachmentLine || text);
    if (globalMatch?.faction && !faction) faction = globalMatch.faction;
    if (globalMatch?.detachment && (!faction || faction.id === globalMatch.faction.id || faction.detachments.some((item) => item.name === globalMatch.detachment.name))) {
      detachment = faction?.detachments.find((item) => item.name === globalMatch.detachment.name) || globalMatch.detachment;
    }
  }

  const inferred = inferFactionFromRosterText(text);
  if (!faction && inferred?.faction) faction = inferred.faction;
  if (faction && inferred?.faction && inferred.score >= 18 && faction.id !== inferred.faction.id && !factionLine) faction = inferred.faction;
  if (!faction && currentFaction) faction = currentFaction;
  if (faction && !detachment) detachment = findDetachmentMention(detachmentLine || text, faction);
  return { faction, detachment };
}

function inferFactionFromRosterText(text) {
  const scored = factions
    .map((faction) => ({ faction, ...scoreFactionRosterFit(text, faction) }))
    .filter((item) => item.matches >= 2 || item.score >= 14)
    .sort((a, b) => b.score - a.score || b.matches - a.matches || b.pointsMatched - a.pointsMatched);
  if (!scored.length) return null;
  const [best, second] = scored;
  if (second && best.score - second.score < 3 && best.matches === second.matches) return null;
  return best;
}

function scoreFactionRosterFit(text, faction) {
  const seen = new Set();
  let matches = 0;
  let pointsMatched = 0;
  let score = 0;
  text.split(/\r?\n/).forEach((rawLine) => {
    const parsed = parsePointLine(rawLine.trim(), faction);
    if (!parsed.unit) return;
    const key = parsed.unit.name;
    seen.add(key);
    matches += 1;
    if (parsed.hasPoints) pointsMatched += 1;
    score += 4 + (pointsCompatible(parsed.unit, parsed.unit.points) ? 0.5 : 0);
  });
  score += seen.size * 1.7 + Math.min(8, pointsMatched * 0.8);
  return { score, matches, unique: seen.size, pointsMatched };
}

function applyRosterMeta(side, meta) {
  const isEnemy = side === "enemy";
  if (!meta.faction) return;
  if (isEnemy) {
    state.enemyFaction = meta.faction;
    state.enemyDetachment = meta.detachment || meta.faction.detachments[0];
    state.detachmentRulesExpanded.enemy = false;
    $("#enemyFaction").value = meta.faction.id;
    renderDetachments("enemy");
    $("#enemyDetachment").value = state.enemyDetachment.id;
  } else {
    state.faction = meta.faction;
    state.detachment = meta.detachment || meta.faction.detachments[0];
    state.factionRulesExpanded = false;
    state.detachmentRulesExpanded.player = false;
    $("#faction").value = meta.faction.id;
    renderDetachments("player");
    $("#detachment").value = state.detachment.id;
  }
}

function findFactionMention(text) {
  const normalizedText = normalizeName(text);
  return factionAliases()
    .filter((entry) => normalizedText.includes(entry.alias))
    .sort((a, b) => b.priority - a.priority || b.alias.length - a.alias.length)[0]?.faction || null;
}

function factionAliases() {
  const aliases = [];
  factions.forEach((faction) => {
    aliases.push({ alias: normalizeName(faction.name), faction, priority: 20 });
  });
  const extras = {
    spaceMarines: [["adeptus astartes", 5], ["marines espaciales", 18]],
    adeptusCustodes: [["custodes", 18], ["adeptus custodes", 20]],
    adeptusMechanicus: [["admech", 18], ["mechanicus", 14], ["adeptus mechanicus", 20]],
    astraMilitarum: [["imperial guard", 18], ["guardia imperial", 18]],
    adeptaSororitas: [["sisters of battle", 18], ["hermanas de batalla", 18]],
    aeldari: [["craftworlds", 18], ["asuryani", 18], ["eldar", 12]],
    tAuEmpire: [["tau empire", 18], ["tau", 12]],
    chaosSpaceMarines: [["heretic astartes", 5], ["csm", 16], ["chaos marines", 16]],
    drukhari: [["dark eldar", 18]],
    leaguesOfVotann: [["votann", 18]],
    imperialKnights: [["knights", 8], ["caballeros imperiales", 18]],
    chaosKnights: [["chaos knights", 20], ["caballeros del caos", 18]],
    greyKnights: [["grey knights", 20], ["caballeros grises", 18]],
    bloodAngels: [["angeles sangrientos", 24]],
    darkAngels: [["angeles oscuros", 24]],
    spaceWolves: [["lobos espaciales", 24]],
    blackTemplars: [["templarios negros", 24]],
    tyranids: [["tiranidos", 18]],
    necrons: [["necrones", 18]],
    orks: [["orcos", 18]],
    genestealerCults: [["gsc", 18], ["cultos genestealer", 18]],
    chaosDaemons: [["demonios del caos", 18]],
    deathGuard: [["guardia de la muerte", 18]],
    thousandSons: [["mil hijos", 18], ["thousand sons", 20]],
    worldEaters: [["devoradores de mundos", 18]],
    emperorsChildren: [["hijos del emperador", 18]],
  };
  factions.forEach((faction) => {
    (extras[faction.id] || []).forEach(([alias, priority]) => aliases.push({ alias: normalizeName(alias), faction, priority }));
  });
  return aliases.filter((entry) => entry.alias);
}

function findDetachmentMention(text, faction) {
  const normalizedText = normalizeName(text);
  return [...faction.detachments]
    .sort((a, b) => normalizeName(b.name).length - normalizeName(a.name).length)
    .find((detachment) => normalizedText.includes(normalizeName(detachment.name))) || null;
}

function findDetachmentAcrossFactions(text) {
  const normalizedText = normalizeName(text);
  const matches = [];
  factions.forEach((faction) => {
    faction.detachments.forEach((detachment) => {
      if (normalizedText.includes(normalizeName(detachment.name))) matches.push({ faction, detachment });
    });
  });
  const uniqueNames = new Set(matches.map((match) => normalizeName(match.detachment.name)));
  return uniqueNames.size === 1 ? matches[0] : null;
}

function parseRosterText(text, faction) {
  const result = parsePointLines(text, faction);
  if (result.units.length) return { ...result, units: result.units.slice(0, 60) };
  const fallbackUnits = parseNameOnlyLines(text, faction).slice(0, 60);
  return {
    units: fallbackUnits,
    ignored: result.ignored,
    knownLines: fallbackUnits.length,
    unknownLines: result.unknownLines,
  };
}

function parseRosterTextWithFactionFallback(text, preferredFaction = null) {
  const primary = preferredFaction ? parseRosterText(text, preferredFaction) : emptyRosterParse();
  const best = inferBestRosterParse(text, preferredFaction);
  if (!preferredFaction && best) return { faction: best.faction, result: best.result };
  if (best && shouldUseFactionFallback(best.result, primary, best.faction, preferredFaction)) {
    return { faction: best.faction, result: best.result };
  }
  return { faction: preferredFaction || best?.faction || null, result: preferredFaction ? primary : best?.result || emptyRosterParse() };
}

function inferBestRosterParse(text, preferredFaction = null) {
  const candidates = factions
    .map((faction) => {
      const result = parseRosterText(text, faction);
      return { faction, result, score: rosterParseScore(result) + (preferredFaction?.id === faction.id ? 1.5 : 0) };
    })
    .filter((candidate) => candidate.result.units.length >= 2 || candidate.score >= 12)
    .sort((a, b) => b.score - a.score || b.result.units.length - a.result.units.length);
  if (!candidates.length) return null;
  const [best, second] = candidates;
  if (!preferredFaction && second && best.score - second.score < 3 && best.result.units.length === second.result.units.length) return null;
  return best;
}

function emptyRosterParse() {
  return { units: [], ignored: [], knownLines: 0, unknownLines: 0 };
}

function rosterParseScore(result) {
  const uniqueUnits = new Set((result.units || []).map((unitData) => unitData.name)).size;
  const pointTotal = totalPoints(result.units || []);
  const pointBonus = pointTotal >= 450 ? 4 : pointTotal >= 250 ? 2 : 0;
  const ignoredPenalty = Math.min(12, (result.unknownLines || 0) * 0.9);
  return (result.knownLines || 0) * 4 + uniqueUnits * 2 + pointBonus - ignoredPenalty;
}

function shouldUseFactionFallback(candidate, primary, candidateFaction, preferredFaction) {
  if (!candidateFaction || candidateFaction.id === preferredFaction?.id) return false;
  const candidateScore = rosterParseScore(candidate);
  const primaryScore = rosterParseScore(primary);
  if (!primary.units.length && candidate.units.length) return true;
  if (candidate.units.length >= primary.units.length + 2) return true;
  return candidateScore >= primaryScore + 6;
}

function parsePointLines(text, faction) {
  const result = { units: [], ignored: [], knownLines: 0, unknownLines: 0 };
  let currentUnit = null;
  let currentSection = "";
  const enhancementRefs = [];
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const sectionHeader = rosterSectionHeader(line);
    if (sectionHeader) {
      currentSection = sectionHeader;
      currentUnit = null;
      return;
    }
    const enhancementRef = parseEnhancementReference(line);
    if (enhancementRef) enhancementRefs.push(enhancementRef);
    const parsed = parsePointLine(line, faction);
    if (parsed.unit) {
      currentUnit = parsed.unit;
      const importedSection = parsed.sectionHint || currentSection;
      if (["Allied Units", "Legends"].includes(importedSection)) currentUnit.section = importedSection;
      currentUnit.importLabel = parsed.label || "";
      applyPendingEnhancementRefs(currentUnit, parsed.label, enhancementRefs);
      result.units.push(parsed.unit);
      result.knownLines += 1;
      parseImportedWargearLine(line, currentUnit, faction);
    } else if (currentUnit && isImportedEnhancementLine(line)) {
      parseImportedWargearLine(line, currentUnit, faction);
    } else if (parsed.hasPoints) {
      currentUnit = null;
      result.unknownLines += 1;
      if (parsed.reason) result.ignored.push(parsed.reason);
    } else if (currentUnit) {
      parseImportedWargearLine(line, currentUnit, faction);
    }
  });
  result.units.forEach((unitData) => applyPendingEnhancementRefs(unitData, unitData.importLabel, enhancementRefs));
  result.units.forEach((unitData) => delete unitData.importLabel);
  result.units.forEach((unitData) => applyImportedWargearSelections(unitData, faction));
  return result;
}

function rosterSectionHeader(line = "") {
  const text = normalizeName(line.replace(/[:]+$/g, ""));
  const headers = {
    "epic heroes": "Epic Hero",
    "epic hero": "Epic Hero",
    characters: "Character",
    character: "Character",
    battleline: "Battleline",
    "dedicated transports": "Dedicated Transport",
    "dedicated transport": "Dedicated Transport",
    fortifications: "Fortification",
    fortification: "Fortification",
    infantry: "Infantry",
    mounted: "Mounted",
    monsters: "Monster",
    monster: "Monster",
    vehicles: "Vehicle",
    vehicle: "Vehicle",
    "allied units": "Allied Units",
    "allied unit": "Allied Units",
    allies: "Allied Units",
    legends: "Legends",
    legend: "Legends",
    "other datasheets": "Other",
  };
  return headers[text] || "";
}

function parsePointLine(line, faction) {
  if (shouldIgnoreRosterLine(line)) return { unit: null, hasPoints: false };
  const pointMatch = line.match(/(?:^|\D)(\d{1,4})\s*(?:pts?|points?|puntos)\b/i);
  if (!pointMatch) return { unit: null, hasPoints: false };
  const points = Number(pointMatch[1]);
  if (!Number.isFinite(points) || points <= 0) return { unit: null, hasPoints: true, reason: compactLine(line) };
  const inlineSectionMatch = line.match(/^\s*(char|epic hero|character|battleline|infantry|vehicle|mounted|monster|dedicated transport|fortification|other datasheets|allied units|legends?)\s*\d*\s*:/i);
  const sectionHint = inlineSectionMatch ? rosterSectionHeader(inlineSectionMatch[1]) : "";

  const cleaned = line
    .replace(/^\s*(?:char|epic hero|character|battleline|infantry|vehicle|mounted|monster|dedicated transport|fortification|other datasheets|allied units|legends?)\s*\d*\s*:\s*/i, "")
    .replace(/^\s*\d+\s*x\s+/i, "")
    .replace(/^\s*x\s*\d+\s+/i, "")
    .replace(/^\s*\d+\.\s+/, "")
    .replace(/\([^)]*(?:pts?|points?|puntos)[^)]*\)/gi, "")
    .replace(/\[[^\]]*(?:pts?|points?|puntos)[^\]]*\]/gi, "")
    .replace(/\b\d{1,4}\s*(?:pts?|points?|puntos)\b/gi, "")
    .replace(/^[+\-*\s]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[-:;,]+$/g, "")
    .trim();

  if (!cleaned || shouldIgnoreCleanedName(cleaned)) return { unit: null, hasPoints: true, reason: compactLine(line) };

  const known = bestUnitMatch(cleaned, faction, points);
  if (known) {
    const detail = unitDetailForFaction(faction, known);
    const inferredCount = inferModelCountFromPoints(points, known, detail);
    return {
      unit: rosterUnit({
        ...known,
        basePoints: known.points,
        config: {
          warlord: /\bwarlord\b/i.test(line),
          modelCount: inferredCount,
        },
      }, "imported"),
      hasPoints: true,
      label: unitImportLabel(line),
      sectionHint,
    };
  }

  return { unit: null, hasPoints: true, reason: cleaned, sectionHint };
}

function parseImportedWargearLine(line, unitData, faction) {
  if (!unitData?.config) return;
  if (/\bwarlord\b/i.test(line) && canBeWarlord(unitData)) unitData.config.warlord = true;
  parseImportedEnhancement(line, unitData);

  const detail = unitDetailForFaction(faction, unitData);
  const cleaned = line
    .replace(/[\u2022\u25e6]/g, " ")
    .replace(/^[+\-*\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || shouldIgnoreRosterLine(cleaned) || /\b(points?|pts?|puntos)\b/i.test(cleaned)) return;
  const importedModelCount = importedModelCountFromLine(cleaned, detail);
  mergeImportedModelCount(unitData, detail, importedModelCount);
  if (!detail?.wargear?.length) return;

  const normalizedLine = normalizeWeaponKey(cleaned);
  const matchedKeys = [];
  weaponNameCandidates(detail)
    .filter((name) => normalizedLine.includes(normalizeWeaponKey(name)))
    .forEach((name) => {
      const key = normalizeWeaponKey(name);
      if (matchedKeys.some((matched) => matched.includes(key) || key.includes(matched))) return;
      const count = importedWeaponCount(cleaned, name);
      addCount(unitData.config.importedWargearCounts, name, count);
      matchedKeys.push(key);
    });
}

function importedModelCountFromLine(line, detail) {
  const normalizedLine = normalizeName(line);
  const range = compositionModelRange(detail);
  if (range.max <= range.min) return null;
  const modelNames = (detail?.composition || [])
    .map((item) => String(item).replace(/\b\d+\s*(?:-\s*\d+)?\b/g, "").replace(/\bmodels?\b/gi, "").trim())
    .filter(Boolean);
  const total = modelNames.reduce((sum, modelName) => {
    const key = normalizeName(modelName);
    const singular = normalizeWeaponKey(modelName);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const escapedSingular = singular.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const match = normalizedLine.match(new RegExp(`(\\d+)\\s*x?\\s+(?:${escapedKey}|${escapedSingular})\\b`));
    return sum + Number(match?.[1] || 0);
  }, 0);
  return total ? clampModelCount(total, range) : null;
}

function applyImportedWargearSelections(unitData, faction) {
  const counts = unitData.config?.importedWargearCounts || {};
  if (!Object.keys(counts).length) return;
  const detail = unitDetailForFaction(faction, unitData);
  const countFromWargear = inferModelCountFromWargearCounts(counts, detail);
  mergeImportedModelCount(unitData, detail, countFromWargear);
  const groups = wargearOptionGroups(detail);
  const selections = { ...(unitData.config.wargearSelections || {}) };
  groups.forEach((group) => {
    const choice = group.choices.find((option) => importedCountsIncludeChoice(counts, option));
    if (choice) selections[group.id] = choice;
  });
  unitData.config.wargearSelections = selections;
  unitData.config.wargear = selectedOptionTexts(groups, selections);
}

function mergeImportedModelCount(unitData, detail, importedCount) {
  if (!importedCount || !unitData?.config) return;
  const current = configuredModelCount(unitData, detail, unitData.config);
  unitData.config.modelCount = Math.max(current, importedCount);
}

function inferModelCountFromWargearCounts(counts, detail) {
  const range = compositionModelRange(detail);
  if (range.max <= range.min) return null;
  const maxCount = Math.max(0, ...Object.values(counts).map((value) => Number(value || 0)));
  return maxCount >= range.min ? clampModelCount(maxCount, range) : null;
}

function importedCountsIncludeChoice(counts, choice) {
  const choiceKey = normalizeWeaponKey(choice);
  return Object.keys(counts).some((name) => {
    const key = normalizeWeaponKey(name);
    return choiceKey === key || choiceKey.includes(key) || key.includes(choiceKey);
  });
}

function parseImportedEnhancement(line, unitData) {
  const match = line.match(/enhancements?:\s*(.+)$/i);
  if (!match) return;
  const name = cleanImportedEnhancementName(match[1]);
  if (!name) return;
  unitData.config.enhancement = name;
  const points = importedEnhancementPoints(line);
  unitData.config.enhancementPoints = points || unitData.config.enhancementPoints || 0;
}

function isImportedEnhancementLine(line = "") {
  return /^[\s+\-*\u2022\u25e6]*enhancements?\s*:/i.test(String(line || ""));
}

function parseEnhancementReference(line) {
  const targetMatch = line.match(/\bon\s+((?:char|character|unit)\s*\d+)\s*:/i);
  if (!targetMatch) return null;
  const labeled = line.match(/enhancements?:\s*(.+)$/i);
  const rawName = labeled ? labeled[1] : line.replace(/^[+&\-*\s]+/, "");
  const name = cleanImportedEnhancementName(rawName);
  if (!name) return null;
  return {
    target: normalizeImportLabel(targetMatch[1]),
    name,
    points: importedEnhancementPoints(line),
  };
}

function applyPendingEnhancementRefs(unitData, label, refs) {
  const normalized = normalizeImportLabel(label);
  if (!normalized) return;
  const ref = refs.find((item) => item.target === normalized);
  if (!ref) return;
  unitData.config.enhancement = ref.name;
  unitData.config.enhancementPoints = ref.points || unitData.config.enhancementPoints || 0;
}

function unitImportLabel(line) {
  return line.match(/^\s*((?:char|character|unit)\s*\d+)\s*:/i)?.[1] || "";
}

function normalizeImportLabel(label = "") {
  return normalizeName(label).replace(/\s+/g, "");
}

function resolveImportedEnhancement(side, unitData) {
  if (!unitData.config?.enhancement) return;
  const imported = cleanImportedEnhancementName(unitData.config.enhancement);
  const importedKey = normalizeName(imported);
  const options = availableEnhancements(side);
  const enhancement = options.find((item) => normalizeName(item.name) === importedKey)
    || options.find((item) => {
      const key = normalizeName(item.name);
      return importedKey.includes(key) || key.includes(importedKey);
    });
  if (!enhancement) return;
  unitData.config.enhancement = enhancement.name;
  if (!unitData.config.enhancementPoints) unitData.config.enhancementPoints = enhancementPoints(enhancement);
}

function cleanImportedEnhancementName(value = "") {
  return String(value || "")
    .replace(/[\u2022\u25e6]/g, " ")
    .replace(/^[+&\-*\s]+/, "")
    .replace(/^enhancements?:\s*/i, "")
    .replace(/\([^)]*\bon\s+(?:char|character|unit)\s*\d+[^)]*\)/gi, "")
    .replace(/\bon\s+(?:char|character|unit)\s*\d+\s*:.*$/i, "")
    .replace(/\(\s*\+?\d+\s*pts?\s*\)/gi, "")
    .replace(/\s+\+?\d+\s*pts?\b/gi, "")
    .replace(/[.;]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function importedEnhancementPoints(line = "") {
  const parenthetical = String(line).match(/\(\s*\+?(\d+)\s*pts?\s*\)/i);
  if (parenthetical) return Number(parenthetical[1]);
  const afterEnhancement = String(line).match(/enhancements?:.*?\+(\d+)\s*pts?\b/i);
  return Number(afterEnhancement?.[1] || 0);
}

function weaponNameCandidates(detail) {
  const names = [...new Set((detail.wargear || []).map((weapon) => canonicalWeaponName(weapon.name)).filter(Boolean))];
  return names.sort((a, b) => normalizeWeaponKey(b).length - normalizeWeaponKey(a).length);
}

function canonicalWeaponName(name = "") {
  return String(name || "").replace(/\s+-\s+(standard|supercharge)$/i, "").replace(/[.;]+$/, "").trim();
}

function importedWeaponCount(line, weaponName) {
  const normalizedLine = normalizeWeaponKey(line);
  const key = normalizeWeaponKey(weaponName);
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const direct = normalizedLine.match(new RegExp(`(\\d+)\\s*x\\s+${escaped}\\b`));
  if (direct) return Number(direct[1]);
  const numbered = normalizedLine.match(new RegExp(`(\\d+)\\s+${escaped}\\b`));
  if (numbered) return Number(numbered[1]);
  const withCount = normalizedLine.match(new RegExp(`(\\d+)\\s*x?\\s+[^,.;]*\\bwith\\b[^,.;]*\\b${escaped}\\b`));
  if (withCount) return Number(withCount[1]);
  return 1;
}

function normalizeWeaponKey(value = "") {
  return normalizeName(canonicalWeaponName(value))
    .split(" ")
    .map((word) => singularWeaponWord(word))
    .join(" ");
}

function singularWeaponWord(word) {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function shouldIgnoreRosterLine(line) {
  const text = line.trim().toLowerCase();
  if (!text) return true;
  if (/^(army roster|new recruit|exported|created with|battle size|game type|detachment|faction|army faction|configuration)\b/.test(text)) return true;
  if (/^(total|total army points|army points|points total|estimated points|enhancements?)\b/.test(text)) return true;
  if (/^\+{3,}$|^-{3,}$|^={3,}$/.test(text)) return true;
  if (/^\s*[+*:-]?\s*(faction keyword|battle size|detachment|army points|total army points)\s*:/.test(text)) return true;
  return false;
}

function shouldIgnoreCleanedName(name) {
  const text = name.toLowerCase();
  return /^(total|total army|army points|points total|detachment|faction keyword|battle size|enhancement|warlord)$/.test(text);
}

function parseNameOnlyLines(text, faction) {
  const results = [];
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !shouldIgnoreRosterLine(line))
    .forEach((line) => {
      const cleaned = line
        .replace(/^\s*(?:char|epic hero|character|battleline|infantry|vehicle|mounted|monster|dedicated transport|fortification|other datasheets|allied units|legends?)\s*\d*\s*:\s*/i, "")
        .replace(/^\s*\d+\s*x\s+/i, "")
        .replace(/^[+\-*\s]+/, "")
        .trim();
      const known = bestUnitMatch(cleaned, faction);
      if (known && !results.some((unitData) => unitData.name === known.name)) {
        results.push(rosterUnit({ ...known, config: { warlord: /\bwarlord\b/i.test(line) } }, "imported"));
      }
    });
  return results;
}

function renderImportStatus(side, result) {
  const status = $(side === "enemy" ? "#enemyImportStatus" : "#playerImportStatus");
  const ignoredPreview = result.ignored.slice(0, 3).join(", ");
  const ignoredText = result.unknownLines ? ` ${result.unknownLines} lineas con puntos fueron ignoradas porque no coinciden con unidades conocidas${ignoredPreview ? `: ${ignoredPreview}` : ""}.` : "";
  const metaText = result.meta?.faction ? ` Faccion: ${result.meta.faction.name}${result.meta.detachment ? `, detachment: ${result.meta.detachment.name}` : ""}.` : "";
  status.textContent = `Importadas ${result.units.length} entradas reconocidas.${metaText}${ignoredText}`;
}

async function copyExport(side) {
  let text = "";
  try {
    text = await resolveExportText(side);
    if (!text) return setExportStatus(side, "No hay unidades para exportar.");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }
    setExportStatus(side, exportFormat(side) === "yellowscribe" ? "Codigo YellowScribe copiado al portapapeles." : "Lista copiada al portapapeles.");
  } catch (error) {
    if (text) {
      fallbackCopyText(text);
      setExportStatus(side, "Exportacion copiada usando metodo alterno.");
    } else {
      setExportStatus(side, `No se pudo exportar: ${error.message}`);
    }
  }
}

async function downloadExport(side) {
  try {
    const units = side === "enemy" ? state.enemyRoster : state.roster;
    if (!units.length) return setExportStatus(side, "No hay unidades para exportar.");
    if (exportFormat(side) === "yellowscribe") {
      downloadTextFile(`${safeFileName(exportListName(side))}-yellowscribe.ros`, buildYellowScribeRosterXml(side, units), "application/xml;charset=utf-8");
      setExportStatus(side, "Roster .ros descargado para subirlo directo a YellowScribe si necesitas depurar el codigo.");
      return;
    }
    const text = await resolveExportText(side);
    if (!text) return setExportStatus(side, "No hay unidades para exportar.");
    const format = exportFormat(side);
    const isYellowScribe = format === "yellowscribe";
    const filename = `${safeFileName(exportListName(side))}-${format}.${isYellowScribe ? "ros" : "txt"}`;
    downloadTextFile(filename, text, isYellowScribe ? "application/xml;charset=utf-8" : "text/plain;charset=utf-8");
    setExportStatus(side, `Descargado ${filename}.`);
  } catch (error) {
    setExportStatus(side, `No se pudo exportar: ${error.message}`);
  }
}

function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function resolveExportText(side) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  if (!units.length) return "";
  if (exportFormat(side) !== "yellowscribe") return buildExportText(side);
  setExportStatus(side, "Subiendo roster a YellowScribe...");
  try {
    return await requestYellowScribeCode(side, units);
  } catch {
    setExportStatus(side, "YellowScribe online no disponible en modo instalable. Se descargara el roster .ros local.");
    return buildYellowScribeRosterXml(side, units);
  }
}

async function requestYellowScribeCode(side, units) {
  const response = await fetch("/api/yellowscribe-code", {
    method: "POST",
    headers: { "Content-Type": "application/xml;charset=utf-8" },
    body: buildYellowScribeRosterXml(side, units),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error || !payload.code) {
    throw new Error(payload.error || "YellowScribe no devolvio un codigo.");
  }
  return String(payload.code).trim();
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function setExportStatus(side, message) {
  const target = $(side === "enemy" ? "#enemyExportStatus" : "#playerExportStatus");
  if (target) target.textContent = message;
}

function exportFormat(side) {
  return $(side === "enemy" ? "#enemyExportFormat" : "#playerExportFormat")?.value || "simple";
}

function buildExportText(side) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  if (!units.length) return "";
  const format = exportFormat(side);
  if (format === "wtcCompact" || format === "compact") return buildWtcCompactExport(side, units);
  if (format === "wtc") return buildWtcExport(side, units);
  if (format === "short") return buildShortExport(side, units);
  if (format === "gw") return buildGwExport(side, units);
  if (format === "nr" || format === "detailed") return buildNrExport(side, units);
  if (format === "twoHg") return build2hgExport(side, units);
  if (format === "yellowscribe") return buildYellowScribeRosterXml(side, units);
  return buildSimpleExport(side, units);
}

function exportListName(side) {
  const base = $("#activeListName")?.value.trim() || defaultListName;
  return side === "enemy" ? `${base} - rival` : base;
}

function exportHeader(side, units) {
  const faction = currentFaction(side);
  const detachment = selectedDetachment(side);
  return {
    name: exportListName(side),
    faction: faction?.name || "Sin faccion",
    detachment: detachment?.name || "Sin detachment",
    points: totalPoints(units),
    limit: state.gameSize,
    battleSize: battleSizeLabel(state.gameSize),
  };
}

function buildSimpleExport(side, units) {
  const header = exportHeader(side, units);
  const lines = [
    `${header.name} (${header.points} points)`,
    "",
    header.faction,
    `${header.battleSize} (${header.limit} points)`,
    header.detachment,
    "",
  ];
  appendExportSections(lines, side, units, "simple");
  return lines.join("\n").trim();
}

function buildWtcExport(side, units) {
  const header = exportHeader(side, units);
  const lines = [
    `++ ${header.name} (${header.points}/${header.limit} pts) ++`,
    "",
    `Faction: ${header.faction}`,
    `Detachment: ${header.detachment}`,
    `Battle Size: ${header.battleSize} (${header.limit} Point limit)`,
    `Total: ${header.points} pts`,
    "",
  ];
  appendExportSections(lines, side, units, "wtc");
  return lines.join("\n").trim();
}

function buildWtcCompactExport(side, units) {
  const header = exportHeader(side, units);
  const lines = [
    `${header.name} | ${header.faction} | ${header.detachment} | ${header.points}/${header.limit} pts`,
    `${header.battleSize}`,
    "",
  ];
  groupIndexedRosterBySection(units.map((unitData, index) => ({ unitData, index }))).forEach((sectionUnits, sectionName) => {
    if (!sectionUnits.length) return;
    lines.push(`${sectionName}: ${sectionUnits.map(({ unitData }) => exportUnitCompactLine(unitData)).join("; ")}`);
  });
  return lines.join("\n").trim();
}

function buildShortExport(side, units) {
  const header = exportHeader(side, units);
  return [
    `${header.name} (${header.points}/${header.limit})`,
    `${header.faction} - ${header.detachment}`,
    ...units.map((unitData) => exportUnitCompactLine(unitData)),
  ].join("\n").trim();
}

function buildGwExport(side, units) {
  const header = exportHeader(side, units);
  const lines = [
    `${header.name} (${header.points} points)`,
    "",
    header.faction,
    `${header.battleSize} (${header.limit} points)`,
    header.detachment,
    "",
  ];
  appendExportSections(lines, side, units, "gw");
  return lines.join("\n").trim();
}

function buildNrExport(side, units) {
  const header = exportHeader(side, units);
  const lines = [
    `${header.name}`,
    "+++++++++++++++++++++++++++++++++++++++++++++++",
    `+ FACTION KEYWORD: ${header.faction}`,
    `+ DETACHMENT: ${header.detachment}`,
    `+ BATTLE SIZE: ${header.battleSize} (${header.limit} points)`,
    `+ TOTAL ARMY POINTS: ${header.points}pts`,
    `+ NUMBER OF UNITS: ${units.length}`,
    `+ WARLORD: ${units.find((unitData) => unitData.config?.warlord)?.name || "Sin warlord marcado"}`,
    "+++++++++++++++++++++++++++++++++++++++++++++++",
    "",
  ];
  appendExportSections(lines, side, units, "nr");
  return lines.join("\n").trim();
}

function build2hgExport(side, units) {
  const header = exportHeader(side, units);
  const lines = [
    "2HG LIST EXPORT",
    `Player/List: ${header.name}`,
    `Army: ${header.faction}`,
    `Detachment: ${header.detachment}`,
    `Points: ${header.points}/${header.limit}`,
    "",
  ];
  groupIndexedRosterBySection(units.map((unitData, index) => ({ unitData, index }))).forEach((sectionUnits, sectionName) => {
    if (!sectionUnits.length) return;
    lines.push(`[${sectionName}]`);
    sectionUnits.forEach(({ unitData }) => lines.push(exportUnitCompactLine(unitData)));
    lines.push("");
  });
  return lines.join("\n").trim();
}

function buildYellowScribeRosterXml(side, units) {
  const header = exportHeader(side, units);
  const forceId = yellowScribeId("force", header.name);
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<roster name="${xmlEscape(header.name)}" battleScribeVersion="2.03" gameSystemName="Warhammer 40,000 10th Edition" gameSystemId="sys-352e-adc2-7639-d6a9">`,
    "  <forces>",
    `    <force id="${forceId}" name="${xmlEscape(header.faction)}" catalogueName="${xmlEscape(header.faction)}">`,
    "      <selections>",
    units.map((unitData, index) => yellowScribeUnitXml(side, unitData, index)).join("\n"),
    "      </selections>",
    "    </force>",
    "  </forces>",
    "</roster>",
  ].join("\n");
}

function yellowScribeUnitXml(side, unitData, index) {
  const detail = unitDetailFor(side, unitData);
  const config = unitData.config || defaultUnitConfig(side, unitData);
  const modelCount = configuredModelCount(unitData, detail, config);
  const unitId = yellowScribeId("unit", `${index}-${unitData.name}-${unitData.instanceId || ""}`);
  const modelProfile = yellowScribeModelProfile(detail, unitData);
  const weapons = effectiveWargear(detail, config, unitData);
  const { modelWeapons, unitWeapons } = yellowScribeSplitWeapons(weapons, modelCount);
  const unitAbilities = yellowScribeUnitAbilities(side, unitData, detail, config);
  return [
    `        <selection id="${unitId}" name="${xmlEscape(unitData.name)}" type="unit" number="1">`,
    "          <categories>",
    yellowScribeCategories(side, unitData, detail).map((name, categoryIndex) => `            <category id="${yellowScribeId("cat", `${unitId}-${categoryIndex}-${name}`)}" name="${xmlEscape(name)}" />`).join("\n"),
    "          </categories>",
    "          <profiles>",
    modelProfile ? yellowScribeModelProfileXml(`${unitId}-profile`, modelProfile) : "",
    unitAbilities.map((ability, abilityIndex) => yellowScribeAbilityProfileXml(`${unitId}-ability-${abilityIndex}`, ability)).join("\n"),
    "          </profiles>",
    "          <selections>",
    yellowScribeModelSelectionXml(`${unitId}-model`, modelProfile?.name || unitData.name, modelCount, modelWeapons),
    unitWeapons.map((weapon, weaponIndex) => yellowScribeWeaponSelectionXml(`${unitId}-uw-${weaponIndex}`, weapon, 1)).join("\n"),
    config.enhancement ? yellowScribeAbilitySelectionXml(`${unitId}-enhancement`, config.enhancement, "Enhancement seleccionado en ForgeList.") : "",
    "          </selections>",
    "        </selection>",
  ].filter(Boolean).join("\n");
}

function yellowScribeModelSelectionXml(id, name, count, weapons) {
  return [
    `            <selection id="${id}" name="${xmlEscape(name)}" type="model" number="${Math.max(1, count)}">`,
    "              <selections>",
    weapons.map((weapon, index) => yellowScribeWeaponSelectionXml(`${id}-w-${index}`, weapon, weapon.count || count)).join("\n"),
    "              </selections>",
    "            </selection>",
  ].join("\n");
}

function yellowScribeWeaponSelectionXml(id, weapon, count) {
  return [
    `              <selection id="${id}" name="${xmlEscape(weapon.name)}" type="upgrade" number="${Math.max(1, Number(count || 1))}">`,
    "                <profiles>",
    yellowScribeWeaponProfileXml(`${id}-profile`, weapon),
    "                </profiles>",
    "              </selection>",
  ].join("\n");
}

function yellowScribeAbilitySelectionXml(id, name, description) {
  return [
    `              <selection id="${id}" name="${xmlEscape(name)}" type="upgrade" number="1">`,
    "                <profiles>",
    yellowScribeAbilityProfileXml(`${id}-profile`, { name, description }),
    "                </profiles>",
    "              </selection>",
  ].join("\n");
}

function yellowScribeSplitWeapons(weapons, modelCount) {
  const modelWeapons = [];
  const unitWeapons = [];
  weapons.forEach((weapon) => {
    const count = Math.max(1, Number(weapon.count || 1));
    if (modelCount > 1 && (count < modelCount || count % modelCount !== 0)) {
      Array.from({ length: count }).forEach(() => unitWeapons.push({ ...weapon, count: 1 }));
    } else {
      modelWeapons.push({ ...weapon, count });
    }
  });
  return { modelWeapons, unitWeapons };
}

function yellowScribeModelProfile(detail, unitData) {
  const model = detail.models?.[0] || {};
  if (!Object.keys(model).length) return null;
  return {
    name: model.name || unitData.name,
    M: model.M || "-",
    T: model.T || "-",
    SV: model.SV || model.Sv || "-",
    W: model.W || "-",
    LD: model.LD || model.Ld || "-",
    OC: model.OC || "-",
  };
}

function yellowScribeUnitAbilities(side, unitData, detail, config) {
  const abilities = (detail.abilities || []).map((ability) => ({
    name: ability.name || ability.type || "Ability",
    description: ability.description || ability.type || "",
  }));
  rulesForUnit(side, unitData, detail, config).forEach((rule) => {
    if (!abilities.some((ability) => normalizeName(ability.name) === normalizeName(rule.name))) {
      abilities.push({ name: rule.name, description: rule.description });
    }
  });
  if (config.warlord) abilities.push({ name: "Warlord", description: "Warlord marcado en ForgeList." });
  return abilities;
}

function yellowScribeCategories(side, unitData, detail) {
  const faction = currentFaction(side);
  const factionKeywords = detail.factionKeywords?.length ? detail.factionKeywords : [faction?.name || "Warhammer 40,000"];
  return [...new Set([
    ...factionKeywords.map((keyword) => keyword.startsWith("Faction:") ? keyword : `Faction: ${keyword}`),
    ...(detail.keywords || []),
    unitData.section || detail.role || "Other Datasheets",
  ].filter(Boolean))];
}

function yellowScribeModelProfileXml(id, profile) {
  return [
    `            <profile id="${id}" name="${xmlEscape(profile.name)}" typeName="Unit">`,
    "              <characteristics>",
    ["M", "T", "SV", "W", "LD", "OC"].map((key) => `                <characteristic name="${key}">${xmlEscape(profile[key] || "-")}</characteristic>`).join("\n"),
    "              </characteristics>",
    "            </profile>",
  ].join("\n");
}

function yellowScribeWeaponProfileXml(id, weapon) {
  const typeName = /melee/i.test(weapon.type || weapon.range || "") ? "Melee Weapons" : "Ranged Weapons";
  const skillName = typeName === "Melee Weapons" ? "WS" : "BS";
  return [
    `                  <profile id="${id}" name="${xmlEscape(weapon.name)}" typeName="${typeName}">`,
    "                    <characteristics>",
    `                      <characteristic name="Range">${xmlEscape(weapon.range || (typeName === "Melee Weapons" ? "Melee" : "-"))}</characteristic>`,
    `                      <characteristic name="A">${xmlEscape(weapon.A || "-")}</characteristic>`,
    `                      <characteristic name="${skillName}">${xmlEscape(weapon.skill || "-")}</characteristic>`,
    `                      <characteristic name="S">${xmlEscape(weapon.S || "-")}</characteristic>`,
    `                      <characteristic name="AP">${xmlEscape(weapon.AP || "0")}</characteristic>`,
    `                      <characteristic name="D">${xmlEscape(weapon.D || "-")}</characteristic>`,
    `                      <characteristic name="Keywords">${xmlEscape(weapon.abilities || "-")}</characteristic>`,
    "                    </characteristics>",
    "                  </profile>",
  ].join("\n");
}

function yellowScribeAbilityProfileXml(id, ability) {
  return [
    `            <profile id="${id}" name="${xmlEscape(ability.name || "Ability")}" typeName="Abilities">`,
    "              <characteristics>",
    `                <characteristic name="Description">${xmlEscape(ability.description || "")}</characteristic>`,
    "              </characteristics>",
    "            </profile>",
  ].join("\n");
}

function yellowScribeId(prefix, value) {
  return `${prefix}-${normalizeName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "item"}`;
}

function xmlEscape(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function appendExportSections(lines, side, units, format) {
  groupIndexedRosterBySection(units.map((unitData, index) => ({ unitData, index }))).forEach((sectionUnits, sectionName) => {
    if (!sectionUnits.length) return;
    lines.push(format === "wtc" ? `+ ${sectionName.toUpperCase()} +` : sectionName.toUpperCase(), "");
    sectionUnits.forEach(({ unitData }) => {
      exportUnitLines(side, unitData, format).forEach((line) => lines.push(line));
      lines.push("");
    });
  });
}

function exportUnitLines(side, unitData, format) {
  const points = unitTotalPoints(unitData);
  const config = unitData.config || {};
  const lines = [`${unitData.name} (${points} ${format === "wtc" ? "pts" : "points"})`];
  const details = exportUnitDetails(side, unitData);

  if (config.warlord) lines.push(exportBullet(format, "Warlord"));
  if (config.enhancement) {
    const pointsText = config.enhancementPoints ? ` (+${config.enhancementPoints} pts)` : "";
    lines.push(exportBullet(format, `Enhancement: ${config.enhancement}${pointsText}`));
  }
  if (details.modelCount) lines.push(exportBullet(format, `${details.modelCount} model${details.modelCount === 1 ? "" : "s"}`));
  if (details.leader) lines.push(exportBullet(format, `Leader attached: ${details.leader}`));
  if (details.leading.length) lines.push(exportBullet(format, `Leading: ${details.leading.join(", ")}`));

  if (format === "nr") {
    lines.push(exportBullet(format, `Role: ${unitData.section || "Other"}`));
    lines.push(exportBullet(format, `Source: ${rosterSourceLabel(unitData)}`));
  }

  if (details.wargear.length) {
    if (format === "nr") {
      lines.push(exportBullet(format, "Wargear:"));
      details.wargear.forEach((item) => lines.push(`  - ${item}`));
    } else if (format === "gw") {
      details.wargear.forEach((item) => lines.push(exportBullet(format, item)));
    } else {
      lines.push(exportBullet(format, `Wargear: ${details.wargear.join(", ")}`));
    }
  }

  return lines;
}

function exportUnitCompactLine(unitData) {
  const flags = [];
  if (unitData.config?.warlord) flags.push("Warlord");
  if (unitData.config?.enhancement) flags.push(`Enhancement: ${unitData.config.enhancement}`);
  return `${unitData.name} (${unitTotalPoints(unitData)} pts)${flags.length ? ` [${flags.join(", ")}]` : ""}`;
}

function exportUnitDetails(side, unitData) {
  const detail = unitDetailFor(side, unitData);
  const config = unitData.config || defaultUnitConfig(side, unitData);
  const range = compositionModelRange(detail);
  const modelCount = range.max > range.min ? configuredModelCount(unitData, detail, config) : null;
  const roster = side === "enemy" ? state.enemyRoster : state.roster;
  const leader = config.leaderRef ? roster.find((unit) => unit.instanceId === config.leaderRef)?.name || "" : "";
  const leading = roster.filter((unit) => unit.config?.leaderRef === unitData.instanceId).map((unit) => unit.name);
  return {
    modelCount,
    leader,
    leading,
    wargear: exportWargear(unitData, detail, config),
  };
}

function exportWargear(unitData, detail, config) {
  const profiled = effectiveWargear(detail, config, unitData).map(weaponNameWithCount);
  const counts = effectiveWargearCounts(detail, config, unitData);
  const unprofiled = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .filter(([name]) => !(detail.wargear || []).some((weapon) => weaponMatchesChoice(weapon.name, name)))
    .map(([name, count]) => count > 1 ? `${name} (x${count})` : name);
  return [...new Set([...profiled, ...unprofiled])];
}

async function openPrintableCards(side) {
  const units = side === "enemy" ? state.enemyRoster : state.roster;
  if (!units.length) return setExportStatus(side, "No hay unidades para convertir en cartas.");
  const filename = `${safeFileName(exportListName(side))}-cartas.pdf`;
  const blob = new Blob([buildPrintableCardsPdf(side, units)], { type: "application/pdf" });
  const saved = await saveBlobFile(blob, filename, "application/pdf");
  if (saved === null) return setExportStatus(side, "Guardado de PDF cancelado.");
  setExportStatus(side, saved ? `PDF guardado como ${filename}.` : `PDF abierto y descarga iniciada como ${filename}. Revisa Descargas o guarda desde la pestana abierta.`);
}

async function saveBlobFile(blob, filename, mimeType) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "PDF", accept: { [mimeType]: [".pdf"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (error.name === "AbortError") return null;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  const opened = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), opened ? 60000 : 5000);
  return false;
}

function buildPrintableCardsPdf(side, units) {
  const header = exportHeader(side, units);
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 24;
  const pages = [];
  units.forEach((unitData) => {
    const content = [];
    pdfDatasheetCard(content, side, unitData, margin, 42, pageWidth - margin * 2, pageHeight - 84, header);
    pages.push(content.join("\n"));
  });
  buildPdfReferencePages(side, header, pageWidth, pageHeight, margin).forEach((page) => pages.push(page));
  return createPdfDocument(pages, pageWidth, pageHeight);
}

function pdfDatasheetCard(content, side, unitData, x, y, width, height, header) {
  const detail = unitDetailFor(side, unitData);
  const config = unitData.config || defaultUnitConfig(side, unitData);
  const model = yellowScribeModelProfile(detail, unitData);
  const weapons = effectiveWargear(detail, config, unitData);
  const ranged = weapons.filter((weapon) => normalizeName(weapon.type || weapon.range) !== "melee");
  const melee = weapons.filter((weapon) => normalizeName(weapon.type || weapon.range) === "melee");
  const abilityRows = printableAbilityRows(side, unitData, detail, config).slice(0, 7);
  const headerHeight = 138;
  const footerHeight = 46;
  const bodyTop = y + height - headerHeight;
  const bodyBottom = y + footerHeight;
  const leftWidth = width * 0.65;
  const rightX = x + leftWidth;
  const rightWidth = width - leftWidth;
  const weaponY = bodyBottom + 10;
  const weaponAreaHeight = bodyTop - weaponY - 10;
  const weaponLayout = pdfWeaponTableLayout(ranged, melee, weaponAreaHeight);

  pdfFillRect(content, x, y, width, height, 0.96, 0.97, 0.95);
  pdfStrokeRect(content, x, y, width, height, 0.08, 0.12, 0.1);
  pdfFillRect(content, x, bodyTop, width, headerHeight, 0.2, 0.25, 0.25);
  pdfFillRect(content, x, bodyTop, width * 0.44, headerHeight, 0.07, 0.09, 0.1);
  pdfFillRect(content, x + width * 0.44, bodyTop, width * 0.56, headerHeight, 0.18, 0.23, 0.25);

  pdfFitText(content, x + 18, y + height - 30, 21.5, unitData.name.toUpperCase(), width - 100, "F2", 1, 1, 1);
  pdfText(content, x + width - 58, y + height - 28, 12, `${unitTotalPoints(unitData)} pts`, "F2", 1, 1, 1);
  const summary = [config.warlord ? "Warlord" : "", config.enhancement || "", exportWargear(unitData, detail, config).slice(0, 4).join(", ")].filter(Boolean).join(", ");
  pdfWrappedText(content, x + 304, y + height - 70, 8, summary || `${header.faction} / ${header.detachment}`, 54, 3, "F1", 1, 1, 1);

  if (model) {
    const stats = [
      ["M", model.M],
      ["T", model.T],
      ["SV", model.SV],
      ["W", model.W],
      ["LD", model.LD],
      ["OC", model.OC],
    ];
    stats.forEach(([label, value], index) => pdfStatBox(content, x + 18 + index * 42, bodyTop + 42, label, value || "-"));
  }

  let tableY = weaponY;
  pdfWeaponTable(content, "MELEE WEAPONS", melee, x, tableY, leftWidth, weaponLayout.meleeHeight, true, weaponLayout.rowH);
  tableY += weaponLayout.meleeHeight + weaponLayout.gap;
  pdfWeaponTable(content, "RANGED WEAPONS", ranged, x, tableY, leftWidth, weaponLayout.rangedHeight, false, weaponLayout.rowH);
  pdfAbilityPanel(content, abilityRows, rightX, weaponY, rightWidth, weaponAreaHeight);
  pdfKeywordFooter(content, side, unitData, detail, x + 14, y + 14, width - 28, footerHeight - 16);
}

function pdfWeaponTableLayout(ranged, melee, availableHeight) {
  const headerH = 18;
  const gap = 6;
  const rangedRows = Math.max(1, ranged.length);
  const meleeRows = Math.max(1, melee.length);
  const totalRows = rangedRows + meleeRows;
  const rowH = clampNumber((availableHeight - headerH * 2 - gap) / Math.max(1, totalRows), 5.8, 17);
  const meleeHeight = headerH + meleeRows * rowH;
  const rangedHeight = Math.max(headerH + rangedRows * rowH, availableHeight - meleeHeight - gap);
  return { rowH, meleeHeight, rangedHeight, gap };
}

function buildPdfTextPages(title, sections, header, pageWidth, pageHeight, margin) {
  const pages = [];
  let content = [];
  let cursor = pageHeight - margin - 42;
  const textWidth = pageWidth - margin * 2 - 28;
  const maxBodyChars = Math.max(70, Math.floor(textWidth / 4.35));

  const drawHeader = () => {
    pdfFillRect(content, margin, pageHeight - margin - 24, pageWidth - margin * 2, 24, 0.2, 0.25, 0.24);
    pdfFitText(content, margin + 12, pageHeight - margin - 16, 12.5, title, pageWidth - margin * 2 - 24, "F2", 1, 1, 1);
    pdfText(content, margin + 12, pageHeight - margin - 34, 7.8, `${header.faction} / ${header.detachment}`, "F1", 0.18, 0.24, 0.22);
    pdfStrokeRect(content, margin, margin - 8, pageWidth - margin * 2, pageHeight - margin * 2 + 8, 0.5, 0.55, 0.53);
  };

  const newPage = () => {
    pages.push(content.join("\n"));
    content = [];
    cursor = pageHeight - margin - 42;
    drawHeader();
  };

  const ensure = (needed) => {
    if (cursor - needed < margin + 4) newPage();
  };

  const writeWrapped = (text, size = 9, font = "F1", indent = 0, maxChars = maxBodyChars) => {
    const wrapped = wrapTextForPdf(text || "-", Math.max(24, maxChars - Math.floor(indent / 5)));
    wrapped.forEach((line) => {
      ensure(size + 6);
      pdfText(content, margin + 14 + indent, cursor, size, line, font, 0, 0, 0);
      cursor -= size + 4;
    });
  };

  drawHeader();
  sections.forEach((section) => {
    ensure(28);
    cursor -= 4;
    pdfFillRect(content, margin + 10, cursor - 4, pageWidth - margin * 2 - 20, 16, 0.34, 0.43, 0.41);
    pdfFitText(content, margin + 16, cursor, 10.5, section.heading, pageWidth - margin * 2 - 32, "F2", 1, 1, 1);
    cursor -= 20;
    (section.lines || ["-"]).forEach((line) => writeWrapped(line, 9, "F1", 4));
    cursor -= 8;
  });
  if (content.length) pages.push(content.join("\n"));
  return pages;
}

function pdfStatBox(content, x, y, label, value) {
  pdfText(content, x + 13, y + 34, 8, label, "F2", 1, 1, 1);
  pdfFillRect(content, x, y, 34, 34, 0.9, 0.94, 0.91);
  pdfStrokeRect(content, x, y, 34, 34, 0.35, 0.45, 0.42);
  pdfFitText(content, x + 5, y + 11, 16.5, value, 28, "F2", 0.25, 0.34, 0.33);
}

function pdfWeaponTable(content, title, weapons, x, y, width, height, melee, rowH = 14) {
  const headerH = 18;
  pdfFillRect(content, x, y + height - headerH, width, headerH, 0.34, 0.43, 0.41);
  pdfText(content, x + 10, y + height - 13, 11.2, title, "F2", 1, 1, 1);
  const cols = melee
    ? [["RANGE", 0.48], ["A", 0.6], ["WS", 0.68], ["S", 0.77], ["AP", 0.86], ["D", 0.95]]
    : [["RANGE", 0.48], ["A", 0.6], ["BS", 0.68], ["S", 0.77], ["AP", 0.86], ["D", 0.95]];
  cols.forEach(([label, pct]) => pdfText(content, x + width * pct, y + height - 13, 9.2, label, "F2", 1, 1, 1));
  let rowY = y + height - headerH - rowH;
  if (!weapons.length) {
    pdfText(content, x + 10, rowY + Math.max(3, rowH - 10), 8.4, "Sin perfiles de armas cargados.", "F1", 0, 0, 0);
    return;
  }
  weapons.forEach((weapon, index) => {
    if (rowY < y - 0.2) return;
    if (index % 2 === 0) pdfFillRect(content, x, rowY, width, rowH, 0.86, 0.87, 0.86);
    pdfWeaponNameCell(content, weapon, x + 10, rowY, width * 0.43, rowH);
    const skill = weapon.skill ? `${weapon.skill}+` : "-";
    const values = [weapon.range || "-", weapon.A || "-", skill, weapon.S || "-", weapon.AP || "-", weapon.D || "-"];
    const valueSize = clampNumber(rowH * 0.58, 4.8, 7.9);
    const valueY = rowY + Math.max(1.4, rowH / 2 - valueSize / 3);
    values.forEach((value, valueIndex) => pdfFitText(content, x + width * cols[valueIndex][1], valueY, valueSize, String(value), 24, "F1", 0, 0, 0));
    rowY -= rowH;
  });
  pdfStrokeRect(content, x, y, width, height, 0.45, 0.5, 0.48);
}

function pdfWeaponNameCell(content, weapon, x, y, width, rowH) {
  const name = weaponNameWithCount(weapon);
  const ability = weapon.abilities ? `[${weapon.abilities}]` : "";
  const compact = rowH < 10.5;
  const nameSize = clampNumber(rowH * 0.62, 4.9, 8.4);
  const abilitySize = clampNumber(rowH * 0.48, 4.2, 6.9);
  const maxChars = Math.max(14, Math.floor(width / Math.max(2.9, nameSize * 0.46)));
  const nameLines = wrapTextForPdf(name, maxChars);
  if (!compact && rowH >= 15 && ability) {
    pdfText(content, x, y + rowH - nameSize - 2, nameSize, nameLines[0] || name, "F2", 0, 0, 0);
    const secondName = nameLines[1] || "";
    const abilityText = secondName ? `${secondName} ${ability}` : ability;
    pdfFitText(content, x, y + 3.2, abilitySize, abilityText, width - 4, "F1", 0, 0, 0);
    return;
  }
  if (!compact && rowH >= 13.2 && nameLines.length > 1) {
    pdfText(content, x, y + rowH - nameSize - 1.6, nameSize, nameLines[0], "F2", 0, 0, 0);
    pdfFitText(content, x, y + 3, abilitySize, `${nameLines.slice(1).join(" ")} ${ability}`.trim(), width - 4, "F1", 0, 0, 0);
    return;
  }
  pdfFitText(content, x, y + Math.max(1.3, rowH / 2 - nameSize / 3), nameSize, `${name}${ability && !compact ? ` ${ability}` : ""}`, width - 4, "F2", 0, 0, 0);
}

function pdfAbilityPanel(content, abilities, x, y, width, height) {
  pdfStrokeRect(content, x, y, width, height, 0.35, 0.42, 0.4);
  pdfFillRect(content, x, y + height - 20, width, 20, 0.34, 0.43, 0.41);
  pdfText(content, x + 8, y + height - 14, 11.8, "ABILITIES", "F2", 1, 1, 1);
  let cursor = y + height - 34;
  if (!abilities.length) {
    pdfText(content, x + 8, cursor, 9, "Sin habilidades cargadas.", "F1", 0, 0, 0);
    return;
  }
  const nameSize = abilities.length <= 3 ? 9.2 : abilities.length <= 5 ? 8.6 : 8.1;
  const bodySize = abilities.length <= 3 ? 7.6 : abilities.length <= 5 ? 7.1 : 6.8;
  const maxLines = abilities.length <= 3 ? 4 : abilities.length <= 5 ? 3 : 2;
  abilities.forEach((ability) => {
    if (cursor < y + 16) return;
    pdfFitText(content, x + 8, cursor, nameSize, ability.name, width - 16, "F2", 0, 0, 0);
    cursor -= nameSize + 1;
    wrapTextForPdf(ability.description || "", 46).slice(0, maxLines).forEach((line) => {
      if (cursor < y + 8) return;
      pdfText(content, x + 8, cursor, bodySize, line, "F1", 0, 0, 0);
      cursor -= bodySize + 1.2;
    });
    cursor -= 3;
  });
}

function printableAbilityRows(side, unitData, detail, config) {
  const rows = [];
  rulesForUnit(side, unitData, detail, config).forEach((rule) => rows.push({ name: rule.name, description: rule.description || "" }));
  (detail.abilities || []).forEach((ability) => {
    if (!rows.some((row) => normalizeName(row.name) === normalizeName(ability.name))) {
      rows.push({ name: ability.name || ability.type || "Ability", description: ability.description || "" });
    }
  });
  if (config.enhancement) rows.push({ name: config.enhancement, description: "Enhancement seleccionado para esta unidad." });
  return rows;
}

function pdfKeywordFooter(content, side, unitData, detail, x, y, width, height) {
  const factionKeywords = (detail.factionKeywords || [currentFaction(side)?.name || ""]).filter(Boolean).join(", ");
  const keywords = [...new Set([...(detail.keywords || []), unitData.section || ""])].filter(Boolean).join(", ");
  const leftWidth = width * 0.68;
  pdfFillRect(content, x, y, leftWidth, height, 0.79, 0.8, 0.8);
  pdfStrokeRect(content, x, y, leftWidth, height, 0.35, 0.42, 0.4);
  pdfText(content, x + 8, y + height - 17, 9.2, "KEYWORDS:", "F1", 0, 0, 0);
  pdfWrappedText(content, x + 78, y + height - 17, 7.9, keywords, 66, 2, "F2", 0, 0, 0);
  pdfFillRect(content, x + leftWidth, y, width - leftWidth, height, 0.05, 0.09, 0.09);
  pdfText(content, x + leftWidth + 10, y + height - 16, 8.8, "FACTION KEYWORDS:", "F2", 1, 1, 1);
  pdfWrappedText(content, x + leftWidth + 10, y + height - 29, 7.7, factionKeywords, 32, 2, "F2", 1, 1, 1);
}

function buildPdfReferencePages(side, header, pageWidth, pageHeight, margin) {
  const faction = currentFaction(side);
  const detachment = selectedDetachment(side);
  const factionRule = faction ? factionRuleSummary(faction) : null;
  const detachmentRule = detachment ? detachmentRuleSummary(detachment) : null;
  const stratagems = stratagemsForDetachment(detachment);
  const sections = [];
  if (factionRule) {
    sections.push({
      heading: `REGLA DE FACCION: ${faction.name}`,
      lines: [
        factionRule.name,
        factionRule.timing,
        factionRule.effect,
        ...(factionRule.details || []).map((detail) => `${detail.label}: ${Array.isArray(detail.text) ? detail.text.join(" ") : detail.text}`),
      ].filter(Boolean),
    });
  }
  if (detachmentRule) {
    sections.push({
      heading: `REGLA DE DETACHMENT: ${detachment.name}`,
      lines: [
        detachmentRule.name,
        detachmentRule.timing,
        detachmentRule.effect,
        ...(detachmentRule.details || []).map((detail) => `${detail.label}: ${Array.isArray(detail.text) ? detail.text.join(" ") : detail.text}`),
      ].filter(Boolean),
    });
  }
  if (stratagems.length) {
    stratagems.forEach((stratagem) => {
      sections.push({
        heading: `${titleCase(stratagem.name)} ${stratagem.cp || ""}`.trim(),
        lines: [
          `ESTRATAGEMA: ${detachment.name}`,
          [stratagem.phase, stratagem.turn, stratagem.type].filter(Boolean).join(" / "),
          stratagem.summary || "",
          ...(stratagem.details || []).map((detail) => `${detail.label}: ${Array.isArray(detail.text) ? detail.text.join(" ") : detail.text}`),
        ].filter(Boolean),
      });
    });
  }
  return sections.length ? buildPdfTextPages(`${header.name} - referencia`, sections, header, pageWidth, pageHeight, margin) : [];
}

function createPdfDocument(pageStreams, width, height) {
  const objectCount = 4 + pageStreams.length * 2;
  const fontId = objectCount - 1;
  const boldFontId = objectCount;
  const pagesId = 2;
  const objects = [];
  objects[1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  const pageRefs = [];
  pageStreams.forEach((stream, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    pageRefs.push(`${pageId} 0 R`);
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[pagesId] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageStreams.length} >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[boldFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  let pdf = "%PDF-1.4\n";
  const offsets = ["0000000000 65535 f "];
  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = `${String(pdf.length).padStart(10, "0")} 00000 n `;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objectCount + 1}\n${offsets.join("\n")}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function pdfText(content, x, y, size, text, font = "F1", r = 0, g = 0, b = 0) {
  content.push(`${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)} rg BT /${font} ${size} Tf ${pdfNumber(x)} ${pdfNumber(y)} Td (${pdfEscape(text)}) Tj ET`);
}

function pdfFitText(content, x, y, size, text, maxWidth, font = "F1", r = 0, g = 0, b = 0) {
  const fitted = fitPdfText(text, size, maxWidth);
  pdfText(content, x, y, size, fitted, font, r, g, b);
}

function pdfWrappedText(content, x, y, size, text, maxChars, maxLines, font = "F1", r = 0, g = 0, b = 0) {
  wrapTextForPdf(text, maxChars).slice(0, maxLines).forEach((line, index) => {
    pdfText(content, x, y - index * (size + 3), size, line, font, r, g, b);
  });
}

function fitPdfText(text, size, maxWidth) {
  const clean = pdfCleanText(text);
  const maxChars = Math.max(4, Math.floor(maxWidth / Math.max(1, size * 0.52)));
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
}

function pdfFillRect(content, x, y, width, height, r, g, b) {
  content.push(`${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)} rg ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f`);
}

function pdfStrokeRect(content, x, y, width, height, r, g, b) {
  content.push(`${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)} RG ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S`);
}

function wrapTextForPdf(text, maxChars) {
  const words = pdfCleanText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function pdfEscape(value = "") {
  return pdfCleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfCleanText(value = "") {
  return String(value || "").normalize("NFD").replace(/[^\x20-\x7E]/g, "");
}

function pdfNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function buildPrintableCardsDocument(side, units) {
  const header = exportHeader(side, units);
  const cards = units.map((unitData) => printableUnitCard(side, unitData)).join("");
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(header.name)} - cartas</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f1f3ef; color: #111814; font-family: Arial, Helvetica, sans-serif; }
      header { padding: 18px 22px 8px; }
      h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: 0; }
      .meta { margin: 0; color: #4d5c54; font-size: 12px; font-weight: 700; }
      .sheet { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 12px 18px 22px; }
      .card { min-height: 320px; break-inside: avoid; border: 2px solid #111814; border-radius: 8px; background: #fbfcf8; overflow: hidden; display: grid; grid-template-rows: auto auto 1fr; }
      .card-head { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 10px 12px; background: #111814; color: #fff; }
      .card-head h2 { margin: 0; font-size: 16px; line-height: 1.1; }
      .card-head span { font-weight: 900; font-size: 14px; white-space: nowrap; }
      .sub { padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #bac5bd; }
      .pill { border: 1px solid #bac5bd; border-radius: 999px; padding: 3px 7px; font-size: 10px; font-weight: 800; color: #26352d; background: #eef3ef; }
      .body { padding: 10px 12px 12px; display: grid; gap: 8px; }
      h3 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #bac5bd; padding-bottom: 3px; }
      p, li { font-size: 11px; line-height: 1.35; }
      p { margin: 0; }
      ul { margin: 0; padding-left: 15px; }
      .roles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; }
      .role { display: grid; grid-template-columns: 1fr auto; gap: 4px; font-size: 10px; font-weight: 800; }
      .bar { grid-column: 1 / -1; height: 5px; border-radius: 999px; background: #dce4df; overflow: hidden; }
      .bar i { display: block; height: 100%; background: #3f7f66; }
      @page { size: letter; margin: 10mm; }
      @media print {
        body { background: #fff; }
        header { padding-top: 0; }
        .sheet { padding: 8px 0 0; gap: 8px; }
        .card { min-height: 300px; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(header.name)}</h1>
      <p class="meta">${escapeHtml(header.faction)} / ${escapeHtml(header.detachment)} / ${header.points} de ${header.limit} pts / ${escapeHtml(header.battleSize)}</p>
    </header>
    <main class="sheet">${cards}</main>
  </body>
</html>`;
}

function printableUnitCard(side, unitData) {
  const detail = unitDetailFor(side, unitData);
  const config = unitData.config || defaultUnitConfig(side, unitData);
  const exportDetails = exportUnitDetails(side, unitData);
  const roleScores = unitRoleScores(unitData)
    .filter((score) => score.value >= 5)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const flags = [
    unitData.section || "Other",
    rosterSourceLabel(unitData),
    config.warlord ? "Warlord" : "",
    config.enhancement ? `Enhancement: ${config.enhancement}` : "",
    exportDetails.modelCount ? `${exportDetails.modelCount} models` : "",
  ].filter(Boolean);
  const recommendation = unitData.recommended ? unitData.recommendation || buildRecommendationExplanation(unitData, autoPickContext(side, side === "enemy" ? state.enemyRoster : state.roster), side === "enemy" ? state.enemyRoster : state.roster) : null;

  return `<article class="card">
    <div class="card-head">
      <h2>${escapeHtml(unitData.name)}</h2>
      <span>${unitTotalPoints(unitData)} pts</span>
    </div>
    <div class="sub">${flags.map((flag) => `<span class="pill">${escapeHtml(flag)}</span>`).join("")}</div>
    <div class="body">
      <section>
        <h3>Equipo</h3>
        <p>${escapeHtml(exportDetails.wargear.slice(0, 12).join(", ") || "Sin equipo cargado.")}</p>
      </section>
      ${exportDetails.leader || exportDetails.leading.length ? `<section><h3>Liderazgo</h3><p>${escapeHtml([exportDetails.leader ? `Lider: ${exportDetails.leader}` : "", exportDetails.leading.length ? `Lidera: ${exportDetails.leading.join(", ")}` : ""].filter(Boolean).join(" / "))}</p></section>` : ""}
      <section>
        <h3>Scores tacticos</h3>
        <div class="roles">${roleScores.map((score) => `<div class="role"><span>${escapeHtml(score.label)}</span><b>${score.value}</b><div class="bar"><i style="width:${score.value * 10}%"></i></div></div>`).join("") || "<p>Sin scores destacados.</p>"}</div>
      </section>
      ${recommendation ? `<section><h3>Plan recomendado</h3><p>${escapeHtml(recommendation.summary || "")}</p><ul>${(recommendation.usage || []).slice(0, 2).map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul></section>` : ""}
      ${detail.abilities?.length ? `<section><h3>Habilidades clave</h3><p>${escapeHtml(detail.abilities.slice(0, 2).map((ability) => ability.name).join(", "))}</p></section>` : ""}
    </div>
  </article>`;
}

function exportBullet(format, text) {
  if (format === "wtc") return `- ${text}`;
  return `- ${text}`;
}

function battleSizeLabel(points) {
  if (points <= 500) return "Patrol";
  if (points <= 1000) return "Incursion";
  if (points >= 3000) return "Onslaught";
  return "Strike Force";
}

function safeFileName(value) {
  return normalizeName(value || "forgelist").replace(/\s+/g, "-") || "forgelist";
}

function compactLine(line) {
  return line.replace(/\s+/g, " ").slice(0, 80);
}

function bestUnitMatch(name, faction, points = null) {
  const normalized = normalizeRosterUnitName(name);
  if (!normalized) return null;
  const exact = faction.units.find((unitData) => normalizeRosterUnitName(unitData.name) === normalized);
  if (exact) return exact;
  const alias = faction.units.find((unitData) => unitNameAliases(unitData.name).includes(normalized));
  if (alias) return alias;
  const matches = [...faction.units]
    .map((unitData) => {
      const unitName = normalizeRosterUnitName(unitData.name);
      const aliases = unitNameAliases(unitData.name);
      const nameHit = normalized.includes(unitName) || unitName.includes(normalized);
      const aliasHit = aliases.some((aliasName) => normalized.includes(aliasName) || aliasName.includes(normalized));
      const tokenScore = unitTokenSimilarity(normalized, unitName);
      const aliasScore = aliases.reduce((best, aliasName) => Math.max(best, unitTokenSimilarity(normalized, aliasName)), 0);
      const lengthScore = Math.min(unitName.length, normalized.length) / Math.max(unitName.length, normalized.length);
      const pointScore = pointsCompatible(unitData, points) ? 0.18 : 0;
      const score = Math.max(nameHit ? 0.72 : 0, aliasHit ? 0.78 : 0, tokenScore, aliasScore) + lengthScore * 0.12 + pointScore;
      const threshold = pointsCompatible(unitData, points) ? 0.62 : 0.74;
      if (score < threshold) return null;
      return { unitData, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || normalizeName(b.unitData.name).length - normalizeName(a.unitData.name).length);
  return matches[0]?.unitData || null;
}

function normalizeRosterUnitName(value = "") {
  return normalizeName(value)
    .replace(/\b(with|w)\b/g, " ")
    .replace(/\bunit\s*\d+\b/g, " ")
    .replace(/\bchar\s*\d+\b/g, " ")
    .replace(/\bcharacter\s*\d+\b/g, " ")
    .replace(/\bmodels?\b/g, " ")
    .replace(/\barmed\b|\bequipped\b|\bweapons?\b|\bheavy weapons?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unitTokenSimilarity(inputName, unitName) {
  const inputTokens = unitMatchTokens(inputName);
  const unitTokens = unitMatchTokens(unitName);
  if (!inputTokens.length || !unitTokens.length) return 0;
  const common = unitTokens.filter((token) => inputTokens.includes(token)).length;
  const coverage = common / unitTokens.length;
  const noisePenalty = Math.max(0, inputTokens.length - unitTokens.length - 3) * 0.025;
  const orderBonus = inputName.includes(unitName) || unitName.includes(inputName) ? 0.18 : 0;
  return Math.max(0, coverage + orderBonus - noisePenalty);
}

function unitMatchTokens(value = "") {
  return normalizeRosterUnitName(value)
    .split(" ")
    .map((token) => singularWeaponWord(token))
    .filter((token) => token.length > 1 && !["the", "and", "of", "de", "la", "el", "los", "las", "x"].includes(token));
}

function pointsCompatible(unitData, points) {
  if (!Number.isFinite(points) || points <= 0) return false;
  if (Number(unitData.points) === points) return true;
  return Object.values(unitData.pointCosts || {}).some((value) => Number(value) === points);
}

function unitNameAliases(name = "") {
  const normalized = normalizeRosterUnitName(name);
  const aliases = new Set();
  if (normalized.endsWith(" squad")) aliases.add(normalized.replace(/\s+squad$/, ""));
  if (normalized.endsWith(" team")) aliases.add(normalized.replace(/\s+team$/, ""));
  if (normalized.endsWith(" mob")) aliases.add(normalized.replace(/\s+mob$/, ""));
  aliases.add(singularWeaponWord(normalized));
  if (normalized === "desolation squad") {
    aliases.add("desolators");
    aliases.add("desolator squad");
    aliases.add("desolation marines");
  }
  if (normalized === "terminator assault squad") {
    aliases.add("assault terminators");
    aliases.add("assault terminator squad");
    aliases.add("assault terminator");
  }
  if (normalized.includes("ctan shard")) aliases.add(normalized.replace("ctan shard of the", "ctan"));
  if (normalized === "scourges") aliases.add("scourge");
  return [...aliases];
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTags(line) {
  const text = line.toLowerCase();
  const tags = ["imported"];
  if (/tank|vehicle|dread|ark|raider|hammerhead|predator|transport/.test(text)) tags.push("vehicle", "anti-tank");
  if (/leader|captain|lord|commander|canoness|farseer|overlord|tyrant|warboss/.test(text)) tags.push("leader");
  if (/cultist|gretchin|termagant|boyz|squad|team|mob/.test(text)) tags.push("objectives");
  if (/jump|deep|warp|hawk|seraphim|piranha|trukk|bike|suit/.test(text)) tags.push("mobility");
  if (/melee|blade|nob|chosen|genestealer|repentia|talon/.test(text)) tags.push("trading");
  if (/gun|rifle|blaster|cannon|exocrine|forgefiend|doomsday/.test(text)) tags.push("fire support");
  return [...new Set(tags)];
}

function countUnit(units, name) {
  return units.filter((unitData) => unitData.name === name).length;
}

function totalPoints(units) {
  return units.reduce((sum, unitData) => sum + unitTotalPoints(unitData), 0);
}

function unitTotalPoints(unitData) {
  const detail = unitDetailForAny(unitData);
  const range = compositionModelRange(detail);
  const modelPoints = range.max > range.min
    ? unitPointsForModelCount(unitData, detail, configuredModelCount(unitData, detail, unitData.config || {}))
    : Number(unitData.basePoints || unitData.points || 0);
  return modelPoints + Number(unitData.config?.enhancementPoints || 0);
}

function validateRoster(side) {
  const isEnemy = side === "enemy";
  const units = isEnemy ? state.enemyRoster : state.roster;
  const points = totalPoints(units);
  const issues = [];
  const faction = currentFaction(side);
  const addIssue = (severity, title, message, location = "", indexes = [], hint = "") => {
    issues.push({ severity, title, message, location, indexes, hint });
  };

  if (!units.length) return { units, issues };

  if (points > state.gameSize) {
    addIssue(
      "error",
      "Exceso de puntos",
      `La lista tiene ${points} pts y el limite seleccionado es ${state.gameSize} pts.`,
      isEnemy ? "contador de puntos rival" : "contador de puntos principal"
    );
  } else if (points < state.gameSize * 0.92) {
    addIssue(
      "warning",
      "Lista muy por debajo del limite",
      `La lista usa ${points} de ${state.gameSize} pts. Puede ser legal, pero normalmente deja demasiado valor fuera de mesa.`,
      isEnemy ? "contador de puntos rival" : "contador de puntos principal"
    );
  }

  if (!activeDetachments(side).length) {
    addIssue(
      "error",
      "Sin detachment",
      "No hay detachment seleccionado para esta lista.",
      isEnemy ? "detachment rival" : "detachment principal"
    );
  }

  if (state.rulesEdition === "11e") {
    if (detachmentPointTotal(side) > detachmentPointBudget()) {
      addIssue(
        "error",
        "Exceso de Detachment Points",
        `La combinacion de detachments usa ${detachmentPointTotal(side)} DP y el limite actual es ${detachmentPointBudget()} DP.`,
        isEnemy ? "detachments rivales 11va" : "detachments 11va"
      );
    }
    if (activeDetachments(side).length > 1) {
      addIssue(
        "warning",
        "Varios detachments activos",
        "La lista usa mas de un detachment. Es valido en modo 11va si respeta DP, pero revisa que enhancements, estratagemas y restricciones de cada detachment correspondan a las unidades que planeas usar.",
        isEnemy ? "detachments rivales 11va" : "detachments 11va"
      );
    }
  }

  units.forEach((unitData, index) => validateRosterUnitBasics(side, unitData, index, addIssue));

  const eligibleWarlordIndexes = units
    .map((unitData, index) => ({ unitData, index }))
    .filter(({ unitData }) => canBeWarlord(unitData))
    .map(({ index }) => index);
  const selectedWarlordIndexes = units
    .map((unitData, index) => ({ unitData, index }))
    .filter(({ unitData }) => unitData.config?.warlord)
    .map(({ index }) => index);

  if (!eligibleWarlordIndexes.length) {
    addIssue(
      "error",
      "Falta warlord",
      "No hay ningun Character, Epic Hero o lider que pueda funcionar como warlord.",
      isEnemy ? "lista enemiga" : "tu lista"
    );
  } else if (!selectedWarlordIndexes.length) {
    addIssue(
      "error",
      "Warlord no seleccionado",
      "Hay personajes elegibles, pero ninguno esta marcado como warlord. Abre Configurar en un Character o Epic Hero y marca Warlord.",
      isEnemy ? "lista enemiga" : "tu lista",
      eligibleWarlordIndexes
    );
  } else if (selectedWarlordIndexes.length > 1) {
    addIssue(
      "error",
      "Demasiados warlords",
      "Solo una unidad puede estar marcada como warlord.",
      selectedWarlordIndexes.map((index) => `entrada ${index + 1}`).join(", "),
      selectedWarlordIndexes
    );
  }

  selectedWarlordIndexes.forEach((index) => {
    if (!canBeWarlord(units[index])) {
      addIssue(
        "error",
        "Warlord invalido",
        `${units[index].name} no puede ser warlord.`,
        `entrada ${index + 1}`,
        [index]
      );
    }
  });

  const enhancementIndexes = units
    .map((unitData, index) => ({ unitData, index }))
    .filter(({ unitData }) => unitData.config?.enhancement)
    .map(({ index }) => index);
  if (enhancementIndexes.length > 3) {
    addIssue(
      "error",
      "Demasiados enhancements",
      `La lista tiene ${enhancementIndexes.length} enhancements. El limite normal de armado es 3.`,
      enhancementIndexes.map((index) => `entrada ${index + 1}`).join(", "),
      enhancementIndexes
    );
  }

  const enhancementMap = new Map();
  const legalNames = new Set(availableEnhancements(side).map((enhancement) => enhancement.name));
  units.forEach((unitData, index) => {
    if (!unitData.config?.enhancement) return;
    if (!canCarryEnhancement(unitData)) {
      addIssue(
        "error",
        "Enhancement invalido",
        `${unitData.name} no puede llevar enhancements. Solo personajes no Epic Hero pueden cargar enhancements.`,
        `entrada ${index + 1}`,
        [index]
      );
    }
    if (!legalNames.has(unitData.config.enhancement)) {
      addIssue(
        "error",
        "Enhancement fuera del detachment",
        `${unitData.config.enhancement} no pertenece a los detachments activos.`,
        `entrada ${index + 1}`,
        [index]
      );
    }
    const key = normalizeName(unitData.config.enhancement);
    if (!enhancementMap.has(key)) enhancementMap.set(key, []);
    enhancementMap.get(key).push(index);
  });

  enhancementMap.forEach((indexes, key) => {
    if (indexes.length <= 1) return;
    addIssue(
      "error",
      "Enhancement duplicado",
      "Cada enhancement solo puede elegirse una vez.",
      indexes.map((index) => `entrada ${index + 1}`).join(", "),
      indexes
    );
  });

  const grouped = new Map();
  units.forEach((unitData, index) => {
    if (!grouped.has(unitData.name)) grouped.set(unitData.name, []);
    grouped.get(unitData.name).push({ unitData, index });
  });

  grouped.forEach((entries, name) => {
    const limit = datasheetLimit(entries[0].unitData);
    if (entries.length <= limit) return;
    const locations = entries.map((entry) => entry.index);
    addIssue(
      "error",
      "Demasiadas copias",
      `${name} aparece ${entries.length} veces; el limite para esta categoria es ${limit}.`,
      locations.map((index) => `entrada ${index + 1}`).join(", "),
      locations
    );
  });

  validateLegendaryDuplicates(units, addIssue);
  validateLeaderAttachments(side, units, addIssue);
  validateTransportLegality(side, units, addIssue);
  validateSpecialCategories(units, addIssue);

  return { units, issues };
}

function validateRosterUnitBasics(side, unitData, index, addIssue) {
  const detail = unitDetailFor(side, unitData);
  const section = dataAuditCanonicalSection(unitData.section || detail.role || "");
  const total = unitTotalPoints(unitData);
  if (!Number.isFinite(total) || total <= 0) {
    addIssue(
      "error",
      "Unidad sin puntos validos",
      `${unitData.name} no tiene un valor de puntos positivo. Puede romper conteo, exportacion y legalidad.`,
      `entrada ${index + 1}`,
      [index]
    );
  }
  if (!section || section === "Other") {
    addIssue(
      "warning",
      "Categoria incompleta",
      `${unitData.name} esta clasificada como ${unitData.section || "sin categoria"}. Revisa si debe ser Character, Battleline, Vehicle, Fortification, Allied Units o Legends.`,
      `entrada ${index + 1}`,
      [index]
    );
  }
  if (!unitExistsInCurrentFaction(side, unitData) && !isExternalCategory(unitData)) {
    addIssue(
      "warning",
      "Unidad no encontrada en la faccion",
      `${unitData.name} no aparece en la base de datos principal de ${currentFaction(side)?.name || "esta faccion"}. Puede ser alias, unidad aliada o importacion que requiere revision.`,
      `entrada ${index + 1}`,
      [index]
    );
  }
  validateModelCountForUnit(unitData, detail, index, addIssue);
}

function validateModelCountForUnit(unitData, detail, index, addIssue) {
  const sizes = unitSizeOptions(detail);
  const rawConfigured = Number(unitData.config?.modelCount || compositionModelRange(detail).min);
  const configured = configuredModelCount(unitData, detail, unitData.config || {});
  if (sizes.length > 1 && (!sizes.includes(rawConfigured) || rawConfigured !== configured)) {
    addIssue(
      "error",
      "Tamano de unidad invalido",
      `${unitData.name} esta configurada con ${rawConfigured} modelos, pero las opciones cargadas son ${sizes.join(", ")}.`,
      `entrada ${index + 1}`,
      [index]
    );
  }
  if (sizes.length > 1 && !Number.isFinite(unitPointsForModelCount(unitData, detail, configured))) {
    addIssue(
      "error",
      "Puntos por tamano no disponibles",
      `${unitData.name} no tiene puntos calculables para ${configured} modelos.`,
      `entrada ${index + 1}`,
      [index]
    );
  }
}

function unitExistsInCurrentFaction(side, unitData) {
  const faction = currentFaction(side);
  const key = normalizeName(unitData.name);
  return Boolean(
    faction?.units?.some((unit) => normalizeName(unit.name) === key) ||
    unitDetails[faction?.id]?.[key]
  );
}

function isExternalCategory(unitData) {
  return ["Allied Units", "Legends"].includes(unitData.section);
}

function validateLegendaryDuplicates(units, addIssue) {
  const named = new Map();
  units.forEach((unitData, index) => {
    const key = legendaryHeroKey(unitData);
    if (!key || !isEpicHero(unitData)) return;
    if (!named.has(key)) named.set(key, []);
    named.get(key).push(index);
  });
  named.forEach((indexes) => {
    if (indexes.length <= 1) return;
    addIssue(
      "error",
      "Epic Hero repetido",
      "Los Epic Heroes son unicos; no puedes incluir el mismo personaje mas de una vez.",
      indexes.map((index) => `entrada ${index + 1}`).join(", "),
      indexes
    );
  });
}

function validateLeaderAttachments(side, units, addIssue) {
  const idToIndex = new Map(units.map((unitData, index) => [unitData.instanceId, index]));
  const assignments = new Map();
  units.forEach((bodyguard, index) => {
    const leaderRef = bodyguard.config?.leaderRef;
    if (!leaderRef) return;
    const leaderIndex = idToIndex.get(leaderRef);
    const leader = units[leaderIndex];
    if (!leader) {
      addIssue(
        "error",
        "Lider no encontrado",
        `${bodyguard.name} tiene un lider asignado que ya no existe en la lista.`,
        `entrada ${index + 1}`,
        [index]
      );
      return;
    }
    if (!canLeadUnit(side, leader, bodyguard)) {
      addIssue(
        "error",
        "Lider incompatible",
        `${leader.name} no puede liderar a ${bodyguard.name} segun las opciones cargadas.`,
        `entradas ${leaderIndex + 1} y ${index + 1}`,
        [leaderIndex, index]
      );
    }
    if (!assignments.has(leaderRef)) assignments.set(leaderRef, []);
    assignments.get(leaderRef).push(index);
  });

  assignments.forEach((indexes, leaderRef) => {
    if (indexes.length <= 1) return;
    const leaderIndex = idToIndex.get(leaderRef);
    addIssue(
      "error",
      "Lider asignado a varias unidades",
      "Un mismo lider no puede estar asignado a mas de una unidad Bodyguard.",
      indexes.map((index) => `entrada ${index + 1}`).join(", "),
      [leaderIndex, ...indexes].filter((index) => Number.isInteger(index))
    );
  });

  units.forEach((leader, index) => {
    if (!isCharacterLike(leader) || isIndependentOperative(leader, side) || !hasLeaderTargets(side, leader)) return;
    const hasCompatibleBodyguard = units.some((bodyguard) => bodyguard !== leader && canLeadUnit(side, leader, bodyguard));
    const isAssigned = units.some((bodyguard) => bodyguard.config?.leaderRef === leader.instanceId);
    if (hasCompatibleBodyguard && !isAssigned) {
      addIssue(
        "warning",
        "Lider sin unidad asignada",
        `${leader.name} puede liderar unidades de la lista, pero no tiene Bodyguard asignado. Puede ser intencional, aunque normalmente reduce su valor.`,
        `entrada ${index + 1}`,
        [index]
      );
    } else if (!hasCompatibleBodyguard) {
      addIssue(
        "warning",
        "Personaje sin unidad compatible",
        `${leader.name} tiene reglas de lider, pero no hay una unidad compatible en la lista.`,
        `entrada ${index + 1}`,
        [index]
      );
    }
  });
}

function validateTransportLegality(side, units, addIssue) {
  const transports = units.map((unitData, index) => ({ unitData, index })).filter(({ unitData }) => isDedicatedTransport(unitData));
  if (!transports.length) return;
  const usefulSlots = maxUsefulTransportSlots(units);
  if (transports.length > usefulSlots) {
    addIssue(
      "warning",
      "Transportes sin suficientes pasajeros",
      `La lista tiene ${transports.length} Dedicated Transport y solo ${usefulSlots} parecen tener pasajeros utiles. Puede ser legal, pero varios transportes podrian empezar sin plan real.`,
      transports.map(({ index }) => `entrada ${index + 1}`).join(", "),
      transports.map(({ index }) => index)
    );
  }
  transports.forEach(({ unitData, index }) => {
    const passengers = transportableBaseUnits(side, unitData, units).filter((passenger) => passenger !== unitData);
    if (!passengers.length) {
      addIssue(
        "warning",
        "Transporte sin pasajeros compatibles",
        `${unitData.name} no tiene unidades compatibles obvias para transportar en esta lista.`,
        `entrada ${index + 1}`,
        [index]
      );
    }
  });
}

function validateSpecialCategories(units, addIssue) {
  const legends = units.map((unitData, index) => ({ unitData, index })).filter(({ unitData }) => unitData.section === "Legends");
  const allied = units.map((unitData, index) => ({ unitData, index })).filter(({ unitData }) => unitData.section === "Allied Units");
  const fortifications = units.map((unitData, index) => ({ unitData, index })).filter(({ unitData }) => unitData.section === "Fortification");
  if (legends.length) {
    addIssue(
      "warning",
      "Legends en la lista",
      "La lista incluye unidades Legends. Suelen ser validas solo si el evento o grupo lo permite.",
      legends.map(({ index }) => `entrada ${index + 1}`).join(", "),
      legends.map(({ index }) => index)
    );
  }
  if (allied.length) {
    addIssue(
      "warning",
      "Allied Units detectadas",
      "La lista incluye unidades aliadas. Revisa el limite y las restricciones especificas de ally allowance para tu faccion/evento.",
      allied.map(({ index }) => `entrada ${index + 1}`).join(", "),
      allied.map(({ index }) => index)
    );
  }
  if (fortifications.length) {
    addIssue(
      "warning",
      "Fortifications detectadas",
      "La lista incluye Fortifications. Revisa restricciones de evento, despliegue y si el terreno/layout permite colocarlas correctamente.",
      fortifications.map(({ index }) => `entrada ${index + 1}`).join(", "),
      fortifications.map(({ index }) => index)
    );
  }
}

function canBeWarlord(unitData) {
  return unitData.section === "Character" || isEpicHero(unitData) || (unitData.tags || []).includes("leader");
}

function datasheetLimit(unitData) {
  if (isEpicHero(unitData)) return 1;
  if (unitData.section === "Battleline" || unitData.section === "Dedicated Transport") return 6;
  return 3;
}

function issuesByUnitIndex(issues) {
  const issueMap = new Map();
  issues.forEach((issue) => {
    (issue.indexes || []).forEach((index) => {
      if (!issueMap.has(index)) issueMap.set(index, []);
      issueMap.get(index).push(issue);
    });
  });
  return issueMap;
}

function calculateScores(side) {
  const isEnemy = side === "enemy";
  const units = isEnemy ? state.enemyRoster : state.roster;
  const detachment = isEnemy ? state.enemyDetachment : state.detachment;
  const detachments = activeDetachments(side);
  const playstyle = isEnemy ? $("#enemyStyle").value : $("#playstyle").value;
  if (!units.length) return { competitive: 0, casual: 0, narrative: 0 };

  const base = averageRatings(units);
  const legacyStyles = archetypeLegacyStyles(playstyle);
  const synergy = units.filter((unitData) => legacyStyles.some((style) => unitData.styles.includes(style))).length / units.length;
  const detachmentScore = detachments.length
    ? detachments.reduce((sum, item) => sum + Number(item.score || detachment.score || 6) / 10, 0) / detachments.length
    : detachment.score / 10;
  const enhancementScore = Math.max(0, evaluateEnhancements(units, {
    side,
    detachment,
    activeDetachments: detachments,
    baseUnits: units,
    playstyle,
    profile: isEnemy ? "competitive" : state.profile,
    needsScoring: armyProfile(units).scoring < 48,
    needsScreens: !units.some((unitData) => hasAnyText(unitData, ["screen", "infiltrate", "scout"])),
  })) / 18;
  const pointsEfficiency = Math.min(totalPoints(units) / state.gameSize, 1);
  const variety = new Set(units.map((unitData) => unitData.name)).size / units.length;
  const historyScore = isEnemy ? 0 : historyAnalysisModifier().score;
  const missionScore = missionContextScore(side, armyProfile(units));
  const editionScore = editionListScore(units);

  return {
    competitive: clamp(base.competitive * 0.56 + synergy * 1.8 + detachmentScore * 1.1 + enhancementScore * 1.4 + pointsEfficiency * 1.2 + historyScore + missionScore + editionScore),
    casual: clamp(base.casual * 0.62 + variety * 1.8 + (1 - Math.abs($("#risk").value - 5) / 10) * 1.1 + historyScore * 0.25 + missionScore * 0.25 + editionScore * 0.35),
    narrative: clamp(base.narrative * 0.64 + hasTag(units, "centerpiece") * 1.2 + leaderCount(units) * 0.7 + enhancementScore * 0.6 + variety * 1.1 + editionScore * 0.2),
  };
}

function editionListScore(units) {
  if (state.rulesEdition !== "11e" || !units.length) return 0;
  const profile = armyProfile(units);
  const independent = units.filter((unitData) => {
    const features = unitFeatures(unitData);
    return features.independent || features.scoring || features.speed || features.deepStrike || features.transport;
  }).length / units.length;
  const enhancementLoad = units.filter((unitData) => unitData.config?.enhancement).length / Math.max(1, units.length);
  const missionFit = (profile.control + profile.mobility + profile.scoring - 160) / 130;
  return clampNumber(independent * 0.9 + missionFit - enhancementLoad * 0.35, -0.8, 1.1);
}

function missionContextScore(side, profile) {
  if (!profile || !state.roster.length) return 0;
  const playstyle = side === "enemy" ? currentEnemyStyle() : $("#playstyle").value;
  const mission = $("#mission")?.value || "";
  const deployment = $("#deployment")?.value || "";
  const layout = $("#layout")?.value || "";
  let score = 0;
  if (mission === "takeHold") score += (profile.scoring + profile.durability + profile.control - 165) / 120;
  if (mission === "supplyDrop") score += (profile.mobility + profile.scoring - 110) / 90;
  if (mission === "purgeFoe") score += (profile.shooting + profile.melee + profile.antiTank - 170) / 130;
  if (mission === "scorchedEarth") score += (profile.mobility + profile.control - 110) / 85;
  if (mission === "hiddenSupplies") score += (profile.control + profile.scoring + profile.mobility - 170) / 125;
  if (mission === "linchpin") score += (profile.durability + profile.control + profile.scoring - 170) / 125;
  if (mission === "terraform") score += (profile.mobility + profile.control + profile.scoring - 168) / 120;
  if (deployment === "hammer" && ["gunline", "alphaStrike"].includes(playstyle)) score += 0.35;
  if (deployment === "search" && ["mobilityTempo", "meleeRush"].includes(playstyle)) score += 0.35;
  if (deployment === "crucible" && playstyle === "gunline") score -= 0.3;
  if (deployment === "sweeping" && ["trading", "mobilityTempo", "horde"].includes(playstyle)) score += 0.28;
  if (/open|ca3|ca5|flgOpen|wtcOpen|ftcOpen/.test(layout) && ["gunline", "alphaStrike"].includes(playstyle)) score += 0.35;
  if (/open|ca3|ca5|flgOpen|wtcOpen|ftcOpen/.test(layout) && ["meleeRush", "horde"].includes(playstyle)) score -= 0.3;
  if (/dense|ca2|ca4|ca6|wtcDense|ftcDense|flgDense/.test(layout) && ["trading", "meleeRush", "mobilityTempo"].includes(playstyle)) score += 0.32;
  return clampNumber(score, -0.85, 0.85);
}

function averageRatings(units) {
  return units.reduce(
    (scores, unitData) => {
      scores.competitive += unitData.ratings.competitive / units.length;
      scores.casual += unitData.ratings.casual / units.length;
      scores.narrative += unitData.ratings.narrative / units.length;
      return scores;
    },
    { competitive: 0, casual: 0, narrative: 0 }
  );
}

function armyProfile(units) {
  if (!units.length) {
    return Object.fromEntries(metrics.map(([key]) => [key, 0]));
  }

  const profile = Object.fromEntries(metrics.map(([key]) => [key, 0]));
  const coverage = Object.fromEntries(metrics.map(([key]) => [key, 0]));
  const points = Math.max(1, totalPoints(units));
  const pointScale = Math.min(totalPoints(units) / state.gameSize, 1);
  units.forEach((unitData) => {
    const weight = Math.max(1, unitTotalPoints(unitData));
    const unitProfile = unitProfileScores(unitData);
    metrics.forEach(([key]) => {
      profile[key] += unitProfile[key] * weight;
      if (unitProfile[key] >= 0.58) coverage[key] += 1;
    });
  });
  metrics.forEach(([key]) => {
    const weighted = profile[key] / points;
    const roleCoverage = Math.min(1, coverage[key] / Math.max(2, units.length * 0.28));
    const editionWeight = currentEditionProfile().scoring[key] || 1;
    profile[key] = clampPercent((weighted * 84 + roleCoverage * 16) * (0.78 + pointScale * 0.22) * editionWeight);
  });
  return profile;
}

function unitProfileScores(unitData) {
  const features = unitFeatures(unitData);
  const stats = unitStatProfile(unitData);
  return {
    mobility: clamp01(features.speed * 0.5 + stats.move * 0.32 + features.deepStrike * 0.22 + features.transport * 0.12),
    scoring: clamp01(features.scoring * 0.42 + stats.oc * 0.32 + features.boardControl * 0.22 + features.speed * 0.12 + features.independent * 0.16),
    durability: clamp01(features.durability * 0.34 + features.anchor * 0.16 + stats.toughness * 0.2 + stats.save * 0.16 + stats.wounds * 0.17 + stats.invulnerable * 0.12),
    melee: clamp01(features.melee * 0.55 + features.charge * 0.18 + features.pressure * 0.12 + unitWeaponFeatureScores(unitData).melee * 0.28),
    shooting: clamp01(features.shooting * 0.55 + unitWeaponFeatureScores(unitData).shooting * 0.34 + features.indirect * 0.12),
    antiTank: clamp01(features.antiTank * 0.58 + unitWeaponFeatureScores(unitData).antiTank * 0.34 + features.monsterVehicle * 0.1),
    control: clamp01(features.screens * 0.32 + features.boardControl * 0.34 + features.scoring * 0.2 + features.speed * 0.12 + stats.oc * 0.14),
  };
}

function unitStatProfile(unitData) {
  const detail = unitDetailForAny(unitData);
  const model = detail?.models?.[0] || {};
  const move = statNumber(model.M);
  const toughness = statNumber(model.T);
  const save = statNumber(model.Sv);
  const invulnerable = statNumber(model.inv);
  const wounds = statNumber(model.W);
  const oc = statNumber(model.OC);
  return {
    move: clamp01((move - 4) / 10),
    toughness: clamp01((toughness - 3) / 9),
    save: save ? clamp01((7 - save) / 5) : 0,
    invulnerable: invulnerable ? clamp01((7 - invulnerable) / 4) : 0,
    wounds: clamp01(wounds / 14),
    oc: clamp01(oc / 5),
  };
}

function statNumber(value) {
  const match = String(value || "").match(/\d+/);
  return Number(match?.[0] || 0);
}

function hasTag(units, tag) {
  return units.some((unitData) => unitData.tags.includes(tag)) ? 1 : 0;
}

function leaderCount(units) {
  return Math.min(units.filter((unitData) => unitData.tags.includes("leader")).length, 2);
}

function clamp(value) {
  return Math.max(0, Math.min(10, value));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function findFaction(id) {
  return factions.find((faction) => faction.id === id);
}

function buildScoreSummary(scores) {
  if (!state.roster.length) return "Agrega unidades para evaluar eficiencia, diversion y coherencia narrativa.";
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const names = { competitive: "competitivo", casual: "casual", narrative: "narrativo" };
  return `La lista esta mas inclinada a juego ${names[best[0]]}. ${enhancements[state.profile][0]}`;
}

function renderScoreBreakdown(scores) {
  const container = $("#scoreBreakdown");
  if (!container) return;
  container.replaceChildren();
  if (!state.roster.length) {
    container.append(emptyMini("Cuando haya unidades, aqui veras que empuja o baja cada calificacion."));
    return;
  }

  scoreExplanations(scores).forEach((entry) => {
    const item = document.createElement("details");
    item.className = "score-detail";
    item.open = entry.open;
    const summary = document.createElement("summary");
    summary.textContent = `${entry.label}: ${entry.value.toFixed(1)} - ${entry.tone}`;
    const body = document.createElement("p");
    body.textContent = entry.body;
    item.append(summary, body);
    container.append(item);
  });
}

function scoreExplanations(scores) {
  const units = state.roster;
  const context = autoPickContext("player", units);
  const structure = rosterStructure(units);
  const profile = armyProfile(units);
  const uniqueShare = new Set(units.map((unitData) => unitData.name)).size / Math.max(1, units.length);
  const efficiency = Math.round(Math.min(totalPoints(units) / state.gameSize, 1) * 100);
  const strengths = topProfileLabels(profile, true);
  const weaknesses = topProfileLabels(profile, false);
  const missing = missingNeedLabels(structure, context);
  const planName = archetypeDisplayName(context.playstyle);
  const enhancementFit = evaluateEnhancements(units, context);
  const leaderPlans = units.filter((unitData) => isCharacterLike(unitData) && units.some((bodyguard) => bodyguard !== unitData && canLeadUnit("player", unitData, bodyguard))).length;
  const historyContext = historyAnalysisModifier();
  const historyText = historyContext.samples ? ` Memoria: ${historyContext.summary}` : "";
  const missionText = ` La mision/deployment/layout actuales ajustan esta nota en ${signedNumber(Number(missionContextScore("player", profile).toFixed(1)))} puntos.`;

  return [
    {
      label: "Competitivo",
      value: scores.competitive,
      tone: scoreTone(scores.competitive),
      open: true,
      body: `Mide eficiencia para torneo: cobertura de roles, sinergias, detachment, enhancements y uso de puntos. Esta lista esta al ${efficiency}% del limite, destaca en ${strengths.join(", ")} y su plan ${planName} ${missing.length ? `todavia pide ${missing.join(", ")}` : "tiene sus minimos principales cubiertos"}. ${enhancementFit > 7 ? "Los enhancements tienen buenos portadores." : "Revisa si los enhancements estan en personajes que realmente conviertan su valor en mesa."}${missionText}${historyText}`,
    },
    {
      label: "Casual",
      value: scores.casual,
      tone: scoreTone(scores.casual),
      open: false,
      body: `Mide que tan jugable y variada se siente la lista sin exigir precision extrema. La variedad esta en ${Math.round(uniqueShare * 100)}% y la tolerancia al riesgo elegida ${riskText()} ${riskWarning(units)}. Baja cuando hay demasiadas repeticiones, piezas muy swingy para el riesgo marcado o unidades que no tienen tarea clara.`,
    },
    {
      label: "Narrativo",
      value: scores.narrative,
      tone: scoreTone(scores.narrative),
      open: false,
      body: `Mide identidad de ejercito, presencia de personajes, piezas iconicas y coherencia tematica. Sube por centros de mesa, lideres con unidades que comandar y variedad reconocible; ahora hay ${leaderPlans} lider(es) con plan claro. Si quieres subirla, prioriza unidades emblematicas que tambien aporten a ${weaknesses.join(", ")}.`,
    },
  ];
}

function scoreTone(value) {
  if (value >= 8) return "muy solida";
  if (value >= 6.5) return "buena con ajustes";
  if (value >= 5) return "jugable, pero con huecos";
  return "necesita estructura";
}

function riskText() {
  const risk = Number($("#risk").value || 5);
  if (risk <= 3) return "favorece piezas estables";
  if (risk >= 8) return "acepta planes explosivos o swingy";
  return "permite un punto medio";
}

function riskWarning(units) {
  const risk = Number($("#risk").value || 5);
  const swingy = units.filter((unitData) => swingScore(unitData) >= 3);
  if (risk <= 3 && swingy.length) return `y por eso penaliza piezas de alta varianza como ${swingy.slice(0, 2).map((unitData) => unitData.name).join(" y ")}.`;
  if (risk >= 8 && !swingy.length) return "pero la lista casi no tiene piezas explosivas que aprovechen ese margen.";
  return "con las piezas actuales.";
}

function topProfileLabels(profile, high) {
  const sorted = metrics
    .map(([key, label]) => ({ label, value: profile[key] || 0 }))
    .sort((a, b) => high ? b.value - a.value : a.value - b.value)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());
  return sorted.length ? sorted : ["plan general"];
}

function missingNeedLabels(structure, context) {
  const labels = {
    scoring: "mas scoring",
    trading: "mas piezas de trading",
    antiTank: "anti-tank redundante",
    antiHorde: "limpieza anti-horda",
    screens: "pantallas",
    home: "defensa de home objective",
    midboard: "presion de medio campo",
  };
  return Object.entries(context.minimums || {})
    .filter(([need, target]) => (structure[need] || 0) < target)
    .map(([need]) => labels[need] || need);
}

function getTips() {
  if (!state.roster.length) return [{ title: "Punto de partida", body: "Empieza con una unidad de mision, una amenaza principal y una pieza de trading." }];
  const tips = [];
  const tags = state.roster.flatMap((unitData) => unitData.tags);
  const context = autoPickContext("player", state.roster);
  const structure = rosterStructure(state.roster);
  const missing = missingNeedLabels(structure, context);
  if (missing.length) {
    tips.push({
      title: "Huecos del plan",
      body: `Para ${archetypeDisplayName(context.playstyle)}, la lista todavia necesita ${missing.join(", ")}. No es solo sumar dano: son herramientas para puntuar si vas segundo y para no perder mesa temprano.`,
    });
  }
  if (!tags.includes("scoring") && !tags.includes("objectives")) tips.push({ title: "Scoring", body: "Falta una pieza dedicada a puntuar o robar objetivos; sin eso, una lista que mata bien puede perder por primarias y secundarias." });
  if (!tags.includes("anti-tank")) tips.push({ title: "Anti-tank", body: "Considera anti-tank fiable si esperas vehiculos o monstruos. Una sola respuesta puede fallar o morir antes de activar." });
  if (!tags.includes("screen") && !tags.includes("infiltrate")) tips.push({ title: "Pantallas", body: "Agrega pantallas o infiltradores para controlar despliegue, bloquear deep strike y comprar turnos para tus piezas caras." });
  if (state.enemyRoster.length && armyProfile(state.enemyRoster).durability > armyProfile(state.roster).antiTank + 22) {
    tips.push({ title: "Contra esta lista rival", body: "La lista rival parece mas resistente que tu anti-tank actual. Sube redundancia o cambia el plan a primarios y denial de scoring." });
  }
  matchupAnalysisTips(armyProfile(state.roster), armyProfile(state.enemyRoster)).forEach((tip) => tips.push(tip));
  const historyContext = historyAnalysisModifier();
  if (historyContext.samples) {
    tips.push({
      title: "Memoria aplicada",
      body: `${historyContext.summary} Este ajuste ya esta influyendo en probabilidad, puntuacion competitiva y autopick.`,
    });
  }
  historyMatchupNeeds().tips.forEach((tip) => tips.push(tip));
  if (totalPoints(state.roster) < state.gameSize * 0.9) tips.push({ title: "Puntos libres", body: "Aun tienes muchos puntos libres; la simulacion penaliza listas incompletas porque falta redundancia real en mesa." });
  suggestedCuts(context).forEach((cut) => tips.push(cut));
  if (!tips.length) tips.push({ title: "Ajuste fino", body: "La lista tiene herramientas basicas cubiertas. Ahora revisa redundancia, secondaries y que cada personaje o transporte tenga una tarea concreta." });
  return tips;
}

function suggestedCuts(context) {
  const units = state.roster;
  return cutRecommendationCandidates(context).slice(0, 2).map(({ unitData, reasons }) => ({
    title: `Considera quitar: ${unitData.name}`,
    body: `${reasons.join("; ")}. Si la cambias, busca una pieza que cubra ${missingNeedLabels(rosterStructure(units.filter((unit) => unit !== unitData)), context).slice(0, 2).join(" o ") || "un rol mas claro dentro del plan"}.`,
  }));
}

function cutRecommendationCandidates(context) {
  const units = state.roster;
  const usefulTransportSlots = maxUsefulTransportSlots(units);
  const transportIndexes = units.map((unitData, index) => ({ unitData, index })).filter(({ unitData }) => isDedicatedTransport(unitData));
  const duplicateCounts = units.reduce((map, unitData) => map.set(unitData.name, (map.get(unitData.name) || 0) + 1), new Map());

  return units.map((unitData, index) => {
    const reasons = [];
    let priority = 0;
    const planFit = archetypePlanFit(unitData, context.playstyle);
    const repeatFit = archetypeRepeatFit(unitData, context.playstyle);
    const count = duplicateCounts.get(unitData.name) || 1;
    const share = unitTotalPoints(unitData) / Math.max(1, totalPoints(units));

    if (count > maxAutoPickCopies(unitData, context)) {
      priority += 4;
      reasons.push(`hay ${count} copias y el plan ${archetypeDisplayName(context.playstyle)} no necesita tantas`);
    }
    if (isDedicatedTransport(unitData) && transportIndexes.findIndex((item) => item.index === index) >= usefulTransportSlots) {
      priority += 5;
      reasons.push("parece transporte extra sin suficientes pasajeros utiles");
    }
    if (isCharacterLike(unitData) && !isIndependentOperative(unitData, "player") && hasLeaderTargets("player", unitData) && !units.some((bodyguard) => bodyguard !== unitData && canLeadUnit("player", unitData, bodyguard))) {
      priority += 5;
      reasons.push("es personaje sin unidad compatible que lidere en esta lista");
    }
    if (planFit < weakArchetypeFitThreshold(context.playstyle) && !fillsCurrentStructuralNeed(unitData, context) && !isUtilityAllowance(unitData, context)) {
      priority += 3;
      reasons.push("no empuja el arquetipo elegido ni cierra un hueco estructural");
    }
    if (count > 1 && repeatFit < repeatFitThreshold(context.playstyle) && !canRepeatForArchetype(unitData, context.playstyle)) {
      priority += 2;
      reasons.push("la repeticion no aporta suficiente redundancia util");
    }
    if (share > 0.22 && !isPriorityCharacter(unitData)) {
      priority += 2;
      reasons.push("concentra muchos puntos para el valor tactico que aporta");
    }

    return { unitData, priority, reasons };
  })
    .filter((item) => item.priority > 0)
    .sort((a, b) => b.priority - a.priority);
}

function matchupAnalysisTips(player, enemy) {
  if (!state.enemyRoster.length) return [];
  const tips = [];
  const factors = matchupBreakdown(player, enemy);
  const negatives = factors.filter((item) => item.value <= -2.2).sort((a, b) => a.value - b.value);
  const positives = factors.filter((item) => item.value >= 2.2).sort((a, b) => b.value - a.value);
  negatives.slice(0, 2).forEach((item) => {
    tips.push({
      title: `Riesgo de matchup: ${item.label}`,
      body: matchupRiskAdvice(item.label, player, enemy),
    });
  });
  positives.slice(0, 1).forEach((item) => {
    tips.push({
      title: `Ventaja explotable: ${item.label}`,
      body: matchupAdvantageAdvice(item.label),
    });
  });
  return tips;
}

function matchupRiskAdvice(label, player, enemy) {
  if (label === "Respuesta a resistencia") return `Tu anti-tank (${Math.round(player.antiTank)}) no alcanza comodo la durabilidad rival (${Math.round(enemy.durability)}). Agrega redundancia antitanque o juega a puntuar evitando sus piezas mas duras.`;
  if (label === "Mesa y OC") return `El rival pelea mejor la mesa. Necesitas mas OC, pantallas o trading barato; no cambies unidades de scoring por dano que no quite primaria.`;
  if (label === "Movilidad vs denial") return `El rival puede elegir mejores intercambios. Protege flancos, bloquea deep strike y guarda una unidad movil para T4-T5.`;
  if (label === "Dano relevante") return `El rival amenaza tus recursos mas eficientemente de lo que tu amenazas los suyos. Prioriza lineas seguras, reservas y concentrar activaciones.`;
  if (label === "Arquetipo rival") return `El arquetipo rival encaja mejor en esta configuracion. Ajusta plan de despliegue y evita jugar su partida ideal.`;
  return "Hay un diferencial negativo claro contra esta lista rival; corrige ese rol antes de optimizar dano general.";
}

function matchupAdvantageAdvice(label) {
  if (label === "Respuesta a resistencia") return "Tienes herramientas para romper sus piezas caras: no las dividas, concentra dano hasta borrar una amenaza completa.";
  if (label === "Mesa y OC") return "Tu ventaja esta en primarias y denial: fuerza al rival a gastar dano en unidades baratas mientras puntuas.";
  if (label === "Movilidad vs denial") return "Puedes dictar intercambios: amenaza dos flancos y obliga al rival a comprometerse primero.";
  if (label === "Dano relevante") return "Tu dano relevante es superior: elige objetivos por impacto en scoring, no por facilidad de matar.";
  return "Tu arquetipo tiene una ventaja clara en este cruce; despliega para preservar esa condicion.";
}

function calculateWinRate() {
  if (!state.roster.length) return 50;
  const playerProfile = armyProfile(state.roster);
  const enemyProfile = armyProfile(state.enemyRoster);
  const hasEnemy = Boolean(state.enemyRoster.length);
  const turnPlan = missionTurnPlan();
  const factors = analysisWeightedFactors(playerProfile, enemyProfile, turnPlan);

  let chance = 50;
  chance += factors.reduce((sum, item) => sum + item.contribution, 0);
  chance -= Math.max(0, state.gameSize - totalPoints(state.roster)) / (state.gameSize * 0.0525);
  if (hasEnemy) chance += Math.max(0, state.gameSize - totalPoints(state.enemyRoster)) / (state.gameSize * 0.0675);
  if (!hasEnemy) chance -= 8;
  return Math.round(Math.max(8, Math.min(92, chance)));
}

function analysisWeightedFactors(player, enemy, turnPlan = missionTurnPlan()) {
  const hasEnemy = Boolean(state.enemyRoster.length);
  const edition = currentEditionProfile();
  const playerScores = calculateScores("player");
  const enemyScores = calculateScores("enemy");
  const listRaw = hasEnemy ? playerScores.competitive - enemyScores.competitive : playerScores.competitive - 6;
  const matchupRaw = profileEdge(player, enemy);
  const missionRaw = missionModifier(player, enemy);
  const deploymentRaw = deploymentModifier();
  const layoutRaw = layoutModifier();
  const terrainRaw = terrainModifier(player, enemy);
  const secondaryRaw = secondaryPlanModifier(player, enemy);
  const turnRaw = turnPlanModifier(turnPlan);
  const historyRaw = historyWinRateModifier();
  const experienceRaw = $("#experience").value === "expert" ? 4 : $("#experience").value === "new" ? -4 : 0;
  return [
    {
      label: "Calidad de lista",
      raw: listRaw,
      scale: hasEnemy ? 1.1 : 0.85,
      weight: hasEnemy ? 16 : 24,
      note: hasEnemy ? "comparacion competitiva contra la lista rival" : "valor interno sin rival cargado",
    },
    {
      label: "Matchup rival",
      raw: matchupRaw,
      scale: hasEnemy ? 0.82 * edition.analysis.matchup : 0,
      weight: hasEnemy ? 24 : 0,
      note: hasEnemy ? matchupFactorSummary(player, enemy) : "sin lista rival cargada",
    },
    {
      label: "Mision primaria",
      raw: missionRaw,
      scale: 1.08 * edition.analysis.mission,
      weight: 14,
      note: "roles que premia la primaria actual contra el rival",
    },
    {
      label: "Deployment",
      raw: deploymentRaw,
      scale: 0.82 * edition.analysis.deployment,
      weight: 8,
      note: "distancia, angulos, amenaza T1 y staging",
    },
    {
      label: "Layout",
      raw: layoutRaw,
      scale: 0.9 * edition.analysis.layout,
      weight: 8,
      note: "densidad, lineas de tiro y rutas de avance",
    },
    {
      label: "Terreno 11va",
      raw: terrainRaw,
      scale: state.rulesEdition === "11e" ? 1.05 : 0,
      weight: state.rulesEdition === "11e" ? 8 : 0,
      note: state.rulesEdition === "11e" ? terrainProfileInfo($("#terrainProfile")?.value || "balancedAreas").advice : "solo aplica en 11va",
    },
    {
      label: "Secundarias",
      raw: secondaryRaw,
      scale: hasEnemy ? 0.98 * edition.analysis.secondary : 0.55 * edition.analysis.secondary,
      weight: hasEnemy ? 10 : 6,
      note: "facilidad para puntuar tus secundarias y negar las del rival",
    },
    {
      label: "Plan por turnos",
      raw: turnRaw,
      scale: 0.78 * edition.analysis.turns,
      weight: 8,
      note: `pico T${turnPlan.bestTurn}, turno delicado T${turnPlan.weakTurn}`,
    },
    {
      label: "Memoria",
      raw: historyRaw,
      scale: 0.85 * edition.analysis.memory,
      weight: 8,
      note: historyRaw ? "partidas guardadas similares alteran la probabilidad" : "sin impacto historico relevante",
    },
    {
      label: "Experiencia",
      raw: experienceRaw,
      scale: 0.65,
      weight: 4,
      note: "castiga o premia planes complejos segun nivel del jugador",
    },
  ].map((item) => ({
    ...item,
    contribution: clampNumber(item.raw * item.scale, -18, 18),
  }));
}

function historyWinRateModifier() {
  const relevant = relevantHistoryMatches().filter((item) => ["win", "loss", "draw"].includes(item.result));
  if (!relevant.length) return 0;
  const base = historyAnalysisModifier().probability;
  const firstTurn = relevant.filter((item) => item.playerWentFirst !== null);
  const firstTurnBias = firstTurn.length ? (firstTurn.filter((item) => item.playerWentFirst && item.result === "win").length / firstTurn.length - 0.5) * 4 : 0;
  return clampNumber(base + firstTurnBias, -8, 8);
}

function historyAnalysisModifier() {
  const relevant = relevantHistoryMatches().filter((item) => ["win", "loss", "draw"].includes(item.result));
  if (!relevant.length) return { score: 0, probability: 0, samples: 0, summary: "Sin memoria relevante para este matchup." };
  const wins = relevant.filter((item) => item.result === "win").length;
  const winRate = wins / relevant.length;
  const scored = relevant.filter((item) => item.scoreKnown !== false);
  const avgDiff = scored.length ? scored.reduce((sum, item) => sum + Number(item.playerScore || 0) - Number(item.opponentScore || 0), 0) / scored.length : 0;
  const score = clampNumber((winRate - 0.5) * 1.05 + avgDiff / 42, -0.8, 0.8);
  const probability = clampNumber((winRate - 0.5) * 10 + avgDiff / 7, -7, 7);
  return {
    score,
    probability,
    samples: relevant.length,
    winRate: Math.round(winRate * 100),
    avgDiff: Math.round(avgDiff),
    summary: `Hay ${relevant.length} partida(s) historicas similares: ${Math.round(winRate * 100)}% win rate y diferencial medio ${signedNumber(Math.round(avgDiff))}.`,
  };
}

function relevantHistoryMatches() {
  const mission = $("#mission")?.value || "";
  const deployment = $("#deployment")?.value || "";
  const enemyFaction = state.enemyFaction?.name || "";
  const enemyStyle = currentEnemyStyle();
  return state.matchHistory.filter((item) => {
    let score = 0;
    if ((item.rulesEdition || "10e") === state.rulesEdition) score += 2;
    else if (state.rulesEdition === "11e") score -= 1;
    if (item.mission && item.mission === mission) score += 2;
    if (item.deployment && item.deployment === deployment) score += 1;
    if (enemyFaction && reportOpponentFaction(item) && normalizeName(enemyFaction) === normalizeName(reportOpponentFaction(item))) score += 2;
    if (enemyStyle && reportOpponentStyle(item) && enemyStyle === reportOpponentStyle(item)) score += 2;
    if (state.faction?.name && item.playerFaction && normalizeName(state.faction.name) === normalizeName(item.playerFaction)) score += 1;
    return score >= 2;
  }).slice(0, 20);
}

function currentEnemyStyle() {
  if (state.enemyRoster.length) return inferRosterStyle(state.enemyRoster, state.enemyDetachment);
  return $("#enemyStyle")?.value || "";
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function profileEdge(player, enemy) {
  if (!state.enemyRoster.length) return 0;
  return clampNumber(matchupBreakdown(player, enemy).reduce((sum, item) => sum + item.value, 0), -22, 22);
}

function matchupBreakdown(player, enemy) {
  if (!state.enemyRoster.length) return [];
  const playerStyle = $("#playstyle")?.value || "midrange";
  const enemyStyle = currentEnemyStyle();
  const playerKill = killPressureInto(player, enemy);
  const enemyKill = killPressureInto(enemy, player);
  const items = [
    {
      label: "Dano relevante",
      value: clampNumber((playerKill - enemyKill) / 5.8, -7.5, 7.5),
      note: `tu paquete de dano ${Math.round(playerKill)} vs presion rival ${Math.round(enemyKill)}`,
    },
    {
      label: "Respuesta a resistencia",
      value: clampNumber((player.antiTank - enemy.durability) / 6.2, -7, 7),
      note: `anti-tank ${Math.round(player.antiTank)} contra durabilidad rival ${Math.round(enemy.durability)}`,
    },
    {
      label: "Mesa y OC",
      value: clampNumber((player.scoring + player.control - enemy.scoring - enemy.control) / 8.5, -7, 7),
      note: `primaria/control ${Math.round(player.scoring + player.control)} vs ${Math.round(enemy.scoring + enemy.control)}`,
    },
    {
      label: "Movilidad vs denial",
      value: clampNumber((player.mobility + player.control - enemy.mobility - enemy.control) / 9.5, -6, 6),
      note: `rutas, pantallas y capacidad de negar secundarias`,
    },
    {
      label: "Arquetipo rival",
      value: styleCounterModifier(playerStyle, enemyStyle, player, enemy),
      note: `${archetypeDisplayName(playerStyle)} contra ${archetypeDisplayName(enemyStyle)}`,
    },
  ];
  return items;
}

function killPressureInto(source, target) {
  const targetHeavy = clamp01((target.durability - 42) / 44);
  const targetBoard = clamp01((target.scoring + target.control - 95) / 80);
  return source.shooting * 0.28 + source.melee * 0.24 + source.antiTank * (0.18 + targetHeavy * 0.22) + source.control * targetBoard * 0.1 + source.mobility * 0.06;
}

function styleCounterModifier(playerStyle, enemyStyle, player, enemy) {
  if (!enemyStyle) return 0;
  let value = 0;
  if (enemyStyle === "skew") value += (player.antiTank + Math.max(player.melee, player.shooting) - enemy.durability * 1.45) / 13;
  if (enemyStyle === "horde") value += (player.control + player.shooting + player.melee * 0.6 - enemy.scoring - enemy.control) / 14;
  if (enemyStyle === "meleeRush") value += (player.control + player.durability + player.shooting * 0.6 - enemy.mobility - enemy.melee) / 15;
  if (enemyStyle === "gunline") value += (player.mobility + player.durability * 0.6 - enemy.shooting - enemy.antiTank * 0.45) / 14;
  if (enemyStyle === "mobilityTempo") value += (player.control + player.scoring - enemy.mobility - enemy.scoring * 0.65) / 12;
  if (enemyStyle === "attrition") value += (player.scoring + player.antiTank + player.control * 0.5 - enemy.durability * 1.15) / 15;
  if (enemyStyle === "alphaStrike") value += (player.durability + player.control - enemy.shooting - enemy.antiTank * 0.6) / 15;
  if (enemyStyle === "trading") value += (player.control + player.durability * 0.5 + player.scoring - enemy.mobility - enemy.control - enemy.scoring * 0.35) / 15;
  if (enemyStyle === "combo") value += (player.mobility + player.shooting + player.control - enemy.durability - enemy.melee - enemy.shooting * 0.45) / 17;
  if (playerStyle === "gunline" && /dense|wtcDense|ftcDense|ca2|ca4|ca6/i.test($("#layout")?.value || "")) value -= 1.2;
  if (playerStyle === "meleeRush" && /open|wtcOpen|ftcOpen|ca3|ca5/i.test($("#layout")?.value || "")) value -= 1.1;
  return clampNumber(value, -5.5, 5.5);
}

function forceDispositionLabel(value) {
  const labels = {
    takeHold: "Take & Hold",
    disruption: "Disruption",
    purgeFoe: "Purge The Foe",
    priorityTargets: "Priority Targets",
    reconnaissance: "Reconnaissance",
  };
  return labels[value] || "Take & Hold";
}

function inferForceDisposition(side) {
  const styles = activeDetachmentStyles(side);
  const playstyle = side === "enemy" ? currentEnemyStyle() : $("#playstyle")?.value || "midrange";
  if (styles.includes("mobility") || ["mobilityTempo"].includes(playstyle)) return "reconnaissance";
  if (styles.includes("pressure") || ["meleeRush", "trading"].includes(playstyle)) return "disruption";
  if (styles.includes("shooting") || ["gunline", "alphaStrike"].includes(playstyle)) return "priorityTargets";
  if (["skew", "attrition"].includes(playstyle)) return "purgeFoe";
  return "takeHold";
}

function forceDispositionScore(profile, disposition) {
  const values = {
    takeHold: profile.scoring * 0.34 + profile.control * 0.32 + profile.durability * 0.2 + profile.mobility * 0.14,
    disruption: profile.mobility * 0.3 + profile.control * 0.26 + profile.melee * 0.2 + profile.scoring * 0.16 + profile.durability * 0.08,
    purgeFoe: Math.max(profile.shooting, profile.melee) * 0.3 + profile.antiTank * 0.24 + profile.mobility * 0.14 + profile.control * 0.12 + profile.durability * 0.1,
    priorityTargets: profile.antiTank * 0.3 + profile.shooting * 0.24 + profile.mobility * 0.18 + profile.control * 0.14 + profile.scoring * 0.14,
    reconnaissance: profile.mobility * 0.38 + profile.scoring * 0.26 + profile.control * 0.2 + profile.durability * 0.08 + Math.max(profile.shooting, profile.melee) * 0.08,
  };
  return values[disposition] || values.takeHold;
}

function forceDispositionModifier(player, enemy) {
  if (state.rulesEdition !== "11e") return 0;
  const own = $("#forceDisposition")?.value || inferForceDisposition("player");
  const rival = $("#enemyForceDisposition")?.value || inferForceDisposition("enemy");
  const ownScore = forceDispositionScore(player, own);
  if (!state.enemyRoster.length) return clampNumber((ownScore - 55) / 7 + forceDispositionDenialScore(player, rival) / 42, -5.5, 5.5);
  const enemyScore = forceDispositionScore(enemy, rival);
  const denial = forceDispositionDenialScore(player, rival) - forceDispositionDenialScore(enemy, own);
  return clampNumber((ownScore - enemyScore) / 7.2 + denial / 11, -7.5, 7.5);
}

function forceDispositionDenialScore(profile, enemyDisposition) {
  if (enemyDisposition === "takeHold") return profile.control * 0.38 + profile.mobility * 0.22 + profile.melee * 0.14;
  if (enemyDisposition === "disruption") return profile.control * 0.35 + profile.durability * 0.25 + profile.mobility * 0.12;
  if (enemyDisposition === "purgeFoe") return profile.durability * 0.3 + profile.mobility * 0.22 + profile.control * 0.18;
  if (enemyDisposition === "priorityTargets") return profile.mobility * 0.28 + profile.control * 0.22 + profile.durability * 0.2;
  if (enemyDisposition === "reconnaissance") return profile.control * 0.34 + profile.mobility * 0.2 + profile.scoring * 0.18;
  return profile.control * 0.25;
}

function terrainProfileInfo(value) {
  const profiles = {
    balancedAreas: {
      label: "areas balanceadas",
      hidden: true,
      advice: "Premia listas con OC repartido, movilidad media y capacidad de sostener objetivos dentro del terreno.",
    },
    objectiveStrongholds: {
      label: "objetivos fortificados",
      hidden: true,
      advice: "Sube el valor de anclas, infanteria resistente y unidades que puedan entrar al terreno sin morir.",
    },
    denseHidden: {
      label: "denso con Hidden frecuente",
      hidden: true,
      advice: "Reduce el alpha de disparo largo y premia staging, melee, trading y control de rutas.",
    },
    openLanes: {
      label: "lineas abiertas",
      hidden: false,
      advice: "El disparo recupera valor, pero las unidades que no alcancen terreno quedan muy expuestas.",
    },
    mixedVertical: {
      label: "mixto vertical",
      hidden: true,
      advice: "Premia unidades con vuelo, deep strike, infiltracion y capacidad de reposicionarse entre niveles/rutas.",
    },
  };
  return profiles[value] || profiles.balancedAreas;
}

function terrainFitScore(profile, terrain) {
  const values = {
    balancedAreas: profile.scoring * 0.24 + profile.control * 0.25 + profile.mobility * 0.22 + profile.durability * 0.16 + Math.max(profile.shooting, profile.melee) * 0.13,
    objectiveStrongholds: profile.durability * 0.3 + profile.control * 0.26 + profile.scoring * 0.2 + profile.melee * 0.12 + profile.mobility * 0.12,
    denseHidden: profile.melee * 0.24 + profile.control * 0.24 + profile.mobility * 0.22 + profile.scoring * 0.16 + profile.durability * 0.14,
    openLanes: profile.shooting * 0.3 + profile.antiTank * 0.26 + profile.durability * 0.18 + profile.mobility * 0.14 + profile.scoring * 0.12,
    mixedVertical: profile.mobility * 0.34 + profile.scoring * 0.22 + profile.control * 0.2 + Math.max(profile.shooting, profile.melee) * 0.14 + profile.durability * 0.1,
  };
  return values[terrain] || values.balancedAreas;
}

function terrainModifier(player, enemy) {
  if (state.rulesEdition !== "11e") return 0;
  const terrain = $("#terrainProfile")?.value || "balancedAreas";
  if (!state.enemyRoster.length) return clampNumber((terrainFitScore(player, terrain) - 55) / 8, -4.5, 4.5);
  let value = 0;
  if (terrain === "balancedAreas") value += (player.scoring + player.control + player.mobility - enemy.scoring - enemy.control - enemy.mobility) / 30;
  if (terrain === "objectiveStrongholds") value += (player.durability + player.control + player.scoring - enemy.durability - enemy.control - enemy.scoring) / 28;
  if (terrain === "denseHidden") value += (player.melee + player.control + player.mobility - enemy.melee - enemy.control - enemy.mobility) / 28;
  if (terrain === "openLanes") value += (player.shooting + player.antiTank + player.durability * 0.35 - enemy.shooting - enemy.antiTank - enemy.durability * 0.35) / 30;
  if (terrain === "mixedVertical") value += (player.mobility + player.scoring + player.control - enemy.mobility - enemy.scoring - enemy.control) / 27;
  return clampNumber(value, -5.5, 5.5);
}

function missionModifier(player, enemy) {
  const edition = currentEditionProfile();
  if (state.rulesEdition === "11e") return forceDispositionModifier(player, enemy);
  if (!state.enemyRoster.length) return clampNumber(missionContextScore("player", player) * 2, -3, 3);
  const mission = $("#mission").value;
  const terrainObjectiveBias = edition.features.terrainObjectives ? (player.control + player.mobility - enemy.control - enemy.mobility) / 45 : 0;
  if (mission === "takeHold") return clampNumber((player.durability + player.scoring + player.control - enemy.durability - enemy.scoring - enemy.control) / 22 + terrainObjectiveBias, -8, 8);
  if (mission === "supplyDrop") return clampNumber((player.mobility + player.scoring + player.durability * 0.5 - enemy.mobility - enemy.scoring - enemy.durability * 0.5) / 20 + terrainObjectiveBias, -8, 8);
  if (mission === "purgeFoe") return clampNumber((player.shooting + player.melee + player.antiTank * 0.7 - enemy.shooting - enemy.melee - enemy.antiTank * 0.7) / 24 + terrainObjectiveBias * 0.45, -8, 8);
  if (mission === "scorchedEarth") return clampNumber((player.mobility + player.control + player.scoring * 0.6 - enemy.mobility - enemy.control - enemy.scoring * 0.6) / 20 + terrainObjectiveBias, -8, 8);
  if (mission === "hiddenSupplies") return clampNumber((player.control + player.scoring + player.mobility - enemy.control - enemy.scoring - enemy.mobility) / 25 + terrainObjectiveBias, -8, 8);
  if (mission === "linchpin") return clampNumber((player.durability + player.control + player.scoring - enemy.durability - enemy.control - enemy.scoring) / 25 + terrainObjectiveBias * 0.8, -8, 8);
  if (mission === "terraform") return clampNumber((player.mobility + player.control + player.scoring - enemy.mobility - enemy.control - enemy.scoring) / 24 + terrainObjectiveBias, -8, 8);
  return 0;
}

function deploymentModifier() {
  const deployment = $("#deployment").value;
  const playstyle = $("#playstyle").value;
  const enemyStyle = currentEnemyStyle();
  const edition = currentEditionProfile();
  let modifier = 0;
  if (deployment === "search" && ["meleeRush", "mobilityTempo"].includes(playstyle)) modifier += 3.2;
  if (deployment === "crucible" && playstyle === "gunline") modifier -= 3;
  if (deployment === "dawn" && ["midrange", "horde", "mobilityTempo"].includes(playstyle)) modifier += 1.8;
  if (deployment === "tippingPoint" && ["trading", "midrange", "meleeRush"].includes(playstyle)) modifier += 2.2;
  if (deployment === "hammer" && ["gunline", "alphaStrike"].includes(playstyle)) modifier += 3.1;
  if (deployment === "sweeping" && ["mobilityTempo", "horde", "trading"].includes(playstyle)) modifier += 3;
  if (deployment === "search" && ["meleeRush", "mobilityTempo"].includes(enemyStyle)) modifier -= 2.2;
  if (deployment === "hammer" && ["gunline", "alphaStrike"].includes(enemyStyle)) modifier -= 2.1;
  if (deployment === "sweeping" && ["mobilityTempo", "horde", "trading"].includes(enemyStyle)) modifier -= 1.9;
  if (edition.features.hidden && ["gunline", "alphaStrike"].includes(enemyStyle)) modifier += 1.1;
  if (edition.features.chargeFlex && ["meleeRush", "mobilityTempo"].includes(playstyle)) modifier += 0.9;
  if (edition.features.disembarkTempo && ["trading", "midrange", "mobilityTempo"].includes(playstyle)) modifier += 0.6;
  return clampNumber(modifier, -5.5, 5.5);
}

function layoutModifier() {
  const layout = $("#layout").value;
  const playstyle = $("#playstyle").value;
  const enemyStyle = currentEnemyStyle();
  const edition = currentEditionProfile();
  let modifier = 0;
  if (layout === "dense" && ["meleeRush", "trading", "mobilityTempo", "horde"].includes(playstyle)) modifier += 3;
  if (layout === "dense" && ["gunline", "alphaStrike"].includes(enemyStyle)) modifier += 2;
  if (layout === "open" && ["gunline", "alphaStrike"].includes(playstyle)) modifier += 3;
  if (layout === "open" && playstyle === "meleeRush") modifier -= 4;
  if (layout === "open" && ["meleeRush", "trading", "mobilityTempo"].includes(enemyStyle)) modifier += 1;
  if (layout === "wtc") {
    if (["trading", "midrange", "mobilityTempo"].includes(playstyle)) modifier += 1.5;
    if (["gunline", "alphaStrike"].includes(playstyle)) modifier -= 0.5;
  }
  if (layout === "wtcDense") {
    if (["meleeRush", "trading", "mobilityTempo", "horde"].includes(playstyle)) modifier += 2.5;
    if (["gunline", "alphaStrike"].includes(playstyle)) modifier -= 1.5;
  }
  if (layout === "wtcOpen") {
    if (["gunline", "alphaStrike"].includes(playstyle)) modifier += 2.2;
    if (["meleeRush", "horde"].includes(playstyle)) modifier -= 1.3;
  }
  if (layout === "ftc") {
    if (["midrange", "trading", "attrition"].includes(playstyle)) modifier += 1.2;
    if (playstyle === "mobilityTempo") modifier += 0.6;
  }
  if (layout === "ftcDense") {
    if (["meleeRush", "trading", "horde"].includes(playstyle)) modifier += 1.8;
    if (["gunline", "alphaStrike"].includes(playstyle)) modifier -= 0.9;
  }
  if (layout === "ftcOpen") {
    if (["alphaStrike", "gunline"].includes(playstyle)) modifier += 1.8;
    if (["meleeRush", "horde"].includes(playstyle)) modifier -= 1.1;
  }
  if (layout === "flg") {
    if (["midrange", "attrition", "trading"].includes(playstyle)) modifier += 1.1;
  }
  if (layout === "flgDense") {
    if (["meleeRush", "mobilityTempo", "horde"].includes(playstyle)) modifier += 2;
    if (playstyle === "gunline") modifier -= 0.8;
  }
  if (layout === "flgOpen") {
    if (["alphaStrike", "gunline"].includes(playstyle)) modifier += 2.4;
    if (playstyle === "meleeRush") modifier -= 1.8;
  }
  if (/^ca[1-8]$/.test(layout)) {
    const number = Number(layout.replace("ca", ""));
    if ([1, 2, 4, 6, 8].includes(number) && ["midrange", "trading", "mobilityTempo"].includes(playstyle)) modifier += 1;
    if ([3, 5].includes(number) && ["gunline", "alphaStrike"].includes(playstyle)) modifier += 1;
    if ([7, 8].includes(number) && playstyle === "meleeRush") modifier += 1;
  }
  if (edition.features.hidden && /open|wtcOpen|ftcOpen|flgOpen|ca3|ca5/i.test(layout)) modifier += ["meleeRush", "trading", "mobilityTempo"].includes(playstyle) ? 0.9 : 0.35;
  if (edition.features.terrainObjectives && /dense|wtc|ftc|flg|ca/i.test(layout)) modifier += ["midrange", "trading", "horde", "mobilityTempo"].includes(playstyle) ? 1.1 : 0.4;
  return clampNumber(modifier * 1.25, -6, 6);
}

function simulationSummary(winRate) {
  if (!state.enemyRoster.length) return "Agrega o importa una lista enemiga para que el matchup sea una comparacion real.";
  const factors = analysisWeightedFactors(armyProfile(state.roster), armyProfile(state.enemyRoster), missionTurnPlan());
  const swing = [...factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];
  const swingText = swing ? ` Factor principal: ${swing.label} ${signedDecimal(swing.contribution)} (${swing.note}).` : "";
  if (winRate >= 65) return `Matchup favorable: tu lista supera al rival en perfiles clave para esta mision y layout.${swingText}`;
  if (winRate >= 52) return `Matchup ligeramente favorable: pequenas decisiones de despliegue pueden mover mucho el resultado.${swingText}`;
  if (winRate >= 45) return `Matchup parejo: revisa secondaries, pantallas y amenazas de turno 2.${swingText}`;
  return `Matchup dificil: el rival presiona mejor los perfiles que esta mision premia.${swingText}`;
}

init();
