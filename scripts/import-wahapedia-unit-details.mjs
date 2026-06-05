import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data", "factions.json");
const outputPath = path.join(root, "data", "unit-details.json");
const sourceBase = "https://wahapedia.ru/wh40k10ed";

const files = {
  factions: "Factions.csv",
  datasheets: "Datasheets.csv",
  abilities: "Datasheets_abilities.csv",
  keywords: "Datasheets_keywords.csv",
  models: "Datasheets_models.csv",
  options: "Datasheets_options.csv",
  wargear: "Datasheets_wargear.csv",
  composition: "Datasheets_unit_composition.csv",
  enhancements: "Enhancements.csv",
  rules: "Abilities.csv",
};

const appData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const csv = {};
for (const [key, file] of Object.entries(files)) {
  csv[key] = parsePipeCsv(await readCsv(file));
}

const wahapediaFactions = new Map(csv.factions.map((row) => [row.id, cleanDisplayText(row.name)]));
const datasheets = csv.datasheets.map((row) => ({
  ...row,
  name: cleanDisplayText(row.name),
  factionName: wahapediaFactions.get(row.faction_id) || row.faction_id,
}));
const exactByName = groupBy(datasheets, (row) => normalize(row.name));

const related = {
  abilities: groupBy(csv.abilities, (row) => row.datasheet_id),
  keywords: groupBy(csv.keywords, (row) => row.datasheet_id),
  models: groupBy(csv.models, (row) => row.datasheet_id),
  options: groupBy(csv.options, (row) => row.datasheet_id),
  wargear: groupBy(csv.wargear, (row) => row.datasheet_id),
  composition: groupBy(csv.composition, (row) => row.datasheet_id),
};

const units = {};
const missing = [];
for (const faction of appData.factions) {
  units[faction.id] = {};
  for (const unit of faction.units) {
    const datasheet = findDatasheet(unit, faction);
    const key = normalize(unit.name);
    if (!datasheet) {
      missing.push(`${faction.name}: ${unit.name}`);
      units[faction.id][key] = fallbackDetail(unit);
      continue;
    }
    units[faction.id][key] = detailForDatasheet(datasheet, unit);
  }
}

const enhancements = {};
for (const row of csv.enhancements) {
  const key = normalize(row.detachment);
  if (!key) continue;
  if (!enhancements[key]) enhancements[key] = [];
  enhancements[key].push({
    name: cleanDisplayText(row.name),
    cost: cleanDisplayText(row.cost ? `${row.cost} pts` : ""),
    detachment: cleanDisplayText(row.detachment),
    restriction: firstSentence(cleanHtmlText(row.description)),
    description: cleanHtmlText(row.description),
  });
}

const rules = {};
for (const row of csv.rules) {
  const key = normalize(row.name);
  if (!key || rules[key]) continue;
  rules[key] = {
    name: cleanDisplayText(row.name),
    legend: cleanDisplayText(row.legend || ""),
    description: cleanHtmlText(row.description || ""),
    factionId: cleanDisplayText(row.faction_id || ""),
  };
}

fs.writeFileSync(outputPath, `${JSON.stringify({ units, enhancements, rules, missing }, null, 2)}\n`);
console.log(`Wrote details for ${Object.values(units).reduce((sum, group) => sum + Object.keys(group).length, 0)} app units to ${path.relative(root, outputPath)}`);
console.log(`Missing datasheet matches: ${missing.length}`);

function detailForDatasheet(datasheet, appUnit) {
  return {
    name: datasheet.name,
    role: cleanDisplayText(datasheet.role || appUnit.section || ""),
    faction: datasheet.factionName,
    legend: cleanDisplayText(datasheet.legend || ""),
    loadout: cleanHtmlText(datasheet.loadout || ""),
    transport: cleanHtmlText(datasheet.transport || ""),
    damaged: cleanDisplayText([datasheet.damaged_w, datasheet.damaged_description].filter(Boolean).join(": ")),
    composition: rowsFor(datasheet.id, "composition").map((row) => cleanHtmlText(row.description)).filter(Boolean),
    models: rowsFor(datasheet.id, "models").map((row) => cleanObject({
      name: row.name,
      M: row.M,
      T: row.T,
      Sv: row.Sv,
      inv: row.inv_sv,
      W: row.W,
      Ld: row.Ld,
      OC: row.OC,
      base: row.base_size,
    })),
    wargearOptions: rowsFor(datasheet.id, "options").map((row) => cleanHtmlText(row.description)).filter(Boolean),
    wargear: rowsFor(datasheet.id, "wargear").map((row) => cleanObject({
      name: row.name,
      range: row.range,
      type: row.type,
      A: row.A,
      skill: row.BS_WS,
      S: row.S,
      AP: row.AP,
      D: row.D,
      abilities: row.description,
    })),
    abilities: rowsFor(datasheet.id, "abilities").map((row) => cleanObject({
      name: row.name,
      type: row.type,
      description: row.description || row.parameter,
    })).filter((ability) => ability.name || ability.description),
    keywords: rowsFor(datasheet.id, "keywords")
      .filter((row) => row.is_faction_keyword !== "true")
      .map((row) => cleanDisplayText(row.keyword))
      .filter(Boolean),
    factionKeywords: rowsFor(datasheet.id, "keywords")
      .filter((row) => row.is_faction_keyword === "true")
      .map((row) => cleanDisplayText(row.keyword))
      .filter(Boolean),
    link: cleanDisplayText(datasheet.link || ""),
  };
}

function rowsFor(datasheetId, kind) {
  return (related[kind].get(datasheetId) || []).sort((a, b) => Number(a.line || 0) - Number(b.line || 0) || Number(a.line_in_wargear || 0) - Number(b.line_in_wargear || 0));
}

function findDatasheet(unit, faction) {
  const aliases = unitAliases(unit.name);
  const expectedFaction = expectedWahapediaFaction(faction);
  for (const alias of aliases) {
    const candidates = exactByName.get(normalize(alias)) || [];
    const factionMatch = candidates.find((row) => normalize(row.factionName) === normalize(expectedFaction));
    if (factionMatch) return factionMatch;
    if (candidates.length) return candidates[0];
  }
  return fuzzyDatasheet(unit, expectedFaction);
}

function fuzzyDatasheet(unit, expectedFaction) {
  const key = normalize(unit.name);
  const factionMatches = datasheets.filter((row) => normalize(row.factionName) === normalize(expectedFaction));
  const pool = factionMatches.length ? factionMatches : datasheets;
  return pool
    .map((row) => ({ row, score: nameScore(key, normalize(row.name)) }))
    .filter((item) => item.score >= 0.74)
    .sort((a, b) => b.score - a.score)[0]?.row || null;
}

function nameScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const aParts = new Set(a.split(" "));
  const bParts = new Set(b.split(" "));
  const overlap = [...aParts].filter((part) => bParts.has(part)).length;
  return overlap / Math.max(aParts.size, bParts.size);
}

function unitAliases(name) {
  const clean = cleanDisplayText(name);
  return [
    clean,
    clean.replace(/\s+with\s+heavy\s+weapons$/i, ""),
    clean.replace(/\s+with\s+melee\s+bio-weapons$/i, ""),
    clean.replace(/\s+with\s+ranged\s+bio-weapons$/i, ""),
    clean.replace(/^ctan/i, "C'tan"),
    clean.replace(/\barmor\b/gi, "armour"),
  ];
}

function expectedWahapediaFaction(faction) {
  const spaceMarineChapters = new Set([
    "bloodAngels",
    "blackTemplars",
    "darkAngels",
    "deathwatch",
    "imperialFists",
    "ironHands",
    "ravenGuard",
    "salamanders",
    "spaceWolves",
    "ultramarines",
    "whiteScars",
  ]);
  if (spaceMarineChapters.has(faction.id)) return "Space Marines";
  if (faction.id === "imperialAgents") return "Imperial Agents";
  if (faction.id === "tAuEmpire") return "T'au Empire";
  return faction.name;
}

function fallbackDetail(unit) {
  return {
    name: unit.name,
    role: unit.section,
    faction: "",
    legend: "",
    loadout: "No hay datasheet detallado enlazado para esta unidad.",
    transport: "",
    damaged: "",
    composition: [],
    models: [],
    wargearOptions: [],
    wargear: [],
    abilities: unit.tags.map((tag) => ({ name: tag, type: "Etiqueta tactica", description: "Etiqueta inferida por la app para evaluacion de lista." })),
    keywords: unit.tags,
    factionKeywords: [],
    link: "",
  };
}

function parsePipeCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split("|").filter(Boolean);
  return lines.map((line) => {
    const columns = line.split("|");
    return Object.fromEntries(headers.map((header, index) => [header, columns[index] || ""]));
  });
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

async function readCsv(file) {
  const cachePath = path.join(os.tmpdir(), `wahapedia-${file}`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");
  return download(`${sourceBase}/${file}`);
}

function cleanObject(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, cleanHtmlText(value || "")]).filter(([, value]) => value));
}

function cleanHtmlText(value = "") {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\^\^/g, "")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(cleanDisplayText)
    .filter(Boolean)
    .join("\n");
}

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanDisplayText(text = "") {
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return cleanDisplayText(value).toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function firstSentence(text = "") {
  return cleanDisplayText(text).split(/(?<=\.)\s+/)[0] || "";
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          response.resume();
          return;
        }
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}
