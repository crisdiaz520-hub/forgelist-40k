import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bsdataDir = path.join(root, ".cache", "bsdata", "wh40k-10e-main");
const dataPath = path.join(root, "data", "factions.json");
const detailPath = path.join(root, "data", "unit-details.json");

const sourceSpecs = [
  { file: "Imperium - Space Marines.cat", id: "spaceMarines" },
  { file: "Imperium - Deathwatch.cat", id: "deathwatch", base: "spaceMarines" },
  { file: "Imperium - Imperial Fists.cat", id: "imperialFists", base: "spaceMarines" },
  { file: "Imperium - Iron Hands.cat", id: "ironHands", base: "spaceMarines" },
  { file: "Imperium - Raven Guard.cat", id: "ravenGuard", base: "spaceMarines" },
  { file: "Imperium - Salamanders.cat", id: "salamanders", base: "spaceMarines" },
  { file: "Imperium - Ultramarines.cat", id: "ultramarines", base: "spaceMarines" },
  { file: "Imperium - White Scars.cat", id: "whiteScars", base: "spaceMarines" },
  { file: "Imperium - Blood Angels.cat", id: "bloodAngels", base: "spaceMarines" },
  { file: "Imperium - Dark Angels.cat", id: "darkAngels", base: "spaceMarines" },
  { file: "Imperium - Space Wolves.cat", id: "spaceWolves", base: "spaceMarines" },
  { file: "Imperium - Black Templars.cat", id: "blackTemplars", base: "spaceMarines" },
  { file: "Imperium - Astra Militarum.cat", id: "astraMilitarum" },
  { file: "Imperium - Adeptus Custodes.cat", id: "adeptusCustodes" },
  { file: "Imperium - Adeptus Mechanicus.cat", id: "adeptusMechanicus" },
  { file: "Imperium - Adepta Sororitas.cat", id: "adeptaSororitas" },
  { file: "Imperium - Grey Knights.cat", id: "greyKnights" },
  { file: "Imperium - Imperial Knights - Library.cat", id: "imperialKnights" },
  { file: "Imperium - Agents of the Imperium.cat", id: "imperialAgents" },
  { file: "Chaos - Chaos Space Marines.cat", id: "chaosSpaceMarines" },
  { file: "Chaos - Emperor's Children.cat", id: "emperorsChildren", base: "chaosSpaceMarines" },
  { file: "Chaos - Chaos Daemons Library.cat", id: "chaosDaemons" },
  { file: "Chaos - Chaos Knights Library.cat", id: "chaosKnights" },
  { file: "Chaos - Death Guard.cat", id: "deathGuard" },
  { file: "Chaos - Thousand Sons.cat", id: "thousandSons" },
  { file: "Chaos - World Eaters.cat", id: "worldEaters" },
  { file: "Aeldari - Craftworlds.cat", id: "aeldari" },
  { file: "Aeldari - Drukhari.cat", id: "drukhari" },
  { file: "Tyranids.cat", id: "tyranids" },
  { file: "Genestealer Cults.cat", id: "genestealerCults" },
  { file: "Necrons.cat", id: "necrons" },
  { file: "Orks.cat", id: "orks" },
  { file: "T'au Empire.cat", id: "tAuEmpire" },
  { file: "Leagues of Votann.cat", id: "leaguesOfVotann" },
];

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const details = JSON.parse(fs.readFileSync(detailPath, "utf8")).units || {};
const catalogues = new Map();
const allEntries = new Map();

for (const fileName of fs.readdirSync(bsdataDir).filter((file) => file.endsWith(".cat"))) {
  const xml = fs.readFileSync(path.join(bsdataDir, fileName), "utf8");
  catalogues.set(fileName, xml);
  extractSelectionEntries(xml).forEach((entry) => allEntries.set(entry.id, entry));
}

let changed = 0;
for (const spec of sourceSpecs) {
  const faction = data.factions.find((item) => item.id === spec.id);
  if (!faction) continue;
  const xml = catalogues.get(spec.file) || "";
  const links = entryLinks(xml);
  for (const unit of faction.units) {
    delete unit.pointCosts;
    const detail = detailFor(spec.id, unit.name) || detailFor(spec.base, unit.name);
    const range = compositionRange(detail);
    const entry = entryForUnit(unit.name, links);
    if (!entry) continue;
    const table = pointTable(entry.block, unit.points, range);
    if (!table) continue;
    unit.pointCosts = table;
    unit.points = Number(table[String(range.min)] || unit.points);
    changed += 1;
  }
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Updated point tables for ${changed} units.`);

function extractSelectionEntries(xml) {
  const entries = [];
  const pattern = /<selectionEntry\b([^>]*)>/g;
  let match;
  while ((match = pattern.exec(xml))) {
    const attrs = match[1];
    const type = attr(attrs, "type");
    if (type !== "unit") continue;
    const start = match.index;
    const end = topLevelSelectionEntryEnd(xml, pattern.lastIndex);
    if (end < 0) continue;
    entries.push({
      id: attr(attrs, "id"),
      name: decodeXml(attr(attrs, "name")),
      block: xml.slice(start, end),
    });
  }
  return entries;
}

function topLevelSelectionEntryEnd(xml, from) {
  const close = "\n    </selectionEntry>";
  const end = xml.indexOf(close, from);
  return end >= 0 ? end + close.length : -1;
}

function entryLinks(xml) {
  const links = new Map();
  const pattern = /<entryLink\b([^>]*)/g;
  let match;
  while ((match = pattern.exec(xml))) {
    const attrs = match[1];
    if (attr(attrs, "type") !== "selectionEntry") continue;
    const target = allEntries.get(attr(attrs, "targetId"));
    if (!target) continue;
    links.set(normalize(decodeXml(attr(attrs, "name"))), target);
  }
  return links;
}

function entryForUnit(name, links) {
  return links.get(normalize(name)) || allEntriesByName(name);
}

function allEntriesByName(name) {
  const key = normalize(name);
  for (const entry of allEntries.values()) {
    if (normalize(entry.name) === key) return entry;
  }
  return null;
}

function pointTable(block, fallbackPoints, range) {
  const baseCost = extractBaseCost(block);
  const base = baseCost.points || fallbackPoints;
  if (!base) return null;
  const table = {};
  for (let count = range.min; count <= range.max; count += 1) {
    table[String(count)] = base;
  }
  extractPointModifiers(block, baseCost.typeId).forEach((modifier) => {
    for (let count = range.min; count <= range.max; count += 1) {
      if (conditionPasses(count, modifier)) table[String(count)] = modifier.points;
    }
  });
  return table;
}

function extractBaseCost(block) {
  const costs = [...block.matchAll(/<cost\b([^>]*)name="pts"[^>]*>/g)]
    .map((match) => {
      const tag = match[0];
      return {
        points: Number(attr(tag, "value") || 0),
        typeId: attr(tag, "typeId"),
      };
    })
    .filter((cost) => Number.isFinite(cost.points) && cost.points > 0);
  return costs[0] || { points: 0, typeId: "" };
}

function extractPointModifiers(block, pointsTypeId) {
  const modifiers = [];
  const pattern = /<modifier\b([^>]*)>/g;
  let match;
  while ((match = pattern.exec(block))) {
    const attrs = match[1];
    if (attr(attrs, "type") !== "set") continue;
    if (pointsTypeId && attr(attrs, "field") !== pointsTypeId) continue;
    const points = Number(attr(attrs, "value"));
    if (!Number.isFinite(points) || points <= 0) continue;
    const end = matchingEnd(block, pattern.lastIndex, "modifier");
    if (end < 0) continue;
    const modifierBlock = block.slice(match.index, end);
    const conditions = [...modifierBlock.matchAll(/<condition\b([^>]*)\/>/g)]
      .map((condition) => ({
        type: attr(condition[1], "type"),
        value: Number(attr(condition[1], "value")),
        childId: attr(condition[1], "childId"),
        field: attr(condition[1], "field"),
      }))
      .filter((condition) => condition.field === "selections" && Number.isFinite(condition.value));
    if (conditions.length) modifiers.push({ points, conditions });
  }
  return modifiers;
}

function conditionPasses(count, modifier) {
  return modifier.conditions.every((condition) => {
    if (condition.type === "greaterThan") return count > condition.value;
    if (condition.type === "atLeast") return count >= condition.value;
    if (condition.type === "equalTo") return count === condition.value;
    if (condition.type === "lessThan") return count < condition.value;
    if (condition.type === "atMost") return count <= condition.value;
    return false;
  });
}

function compositionRange(detail) {
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

function detailFor(factionId, name) {
  if (!factionId) return null;
  const key = normalize(name);
  return details[factionId]?.[key] || null;
}

function matchingEnd(xml, from, tag) {
  const close = `</${tag}>`;
  let depth = 1;
  let index = from;
  while (depth > 0) {
    const nextOpen = xml.indexOf(`<${tag}`, index);
    const nextClose = xml.indexOf(close, index);
    if (nextClose < 0) return -1;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      const openEnd = xml.indexOf(">", nextOpen);
      const selfClosing = openEnd >= 0 && xml.slice(Math.max(nextOpen, openEnd - 2), openEnd + 1).includes("/>");
      if (!selfClosing) depth += 1;
      index = openEnd >= 0 ? openEnd + 1 : nextOpen + tag.length + 1;
    } else {
      depth -= 1;
      index = nextClose + close.length;
    }
  }
  return index;
}

function attr(attrs, name) {
  return attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] || "";
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
