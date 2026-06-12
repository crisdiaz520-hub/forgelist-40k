import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const factionsPath = path.join(root, "data", "factions.json");
const detailsPath = path.join(root, "data", "unit-details.json");

const data = JSON.parse(fs.readFileSync(factionsPath, "utf8"));
const detailData = JSON.parse(fs.readFileSync(detailsPath, "utf8"));
const detailsByFaction = detailData.units || {};

const marineFamily = new Set([
  "spaceMarines",
  "bloodAngels",
  "darkAngels",
  "spaceWolves",
  "blackTemplars",
  "deathwatch",
  "imperialFists",
  "ironHands",
  "ravenGuard",
  "salamanders",
  "ultramarines",
  "whiteScars",
]);

const changes = [];

for (const faction of data.factions || []) {
  for (const unit of faction.units || []) {
    normalizeUnit(faction, unit);
  }
}

harmonizeMarineSharedPoints();
applyOfficialPointCorrections();

fs.writeFileSync(factionsPath, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(detailsPath, `${JSON.stringify(detailData, null, 2)}\n`);

console.log(`Normalized unit data: ${changes.length} changes`);
changes.slice(0, 80).forEach((change) => console.log(`- ${change}`));
if (changes.length > 80) console.log(`- ...and ${changes.length - 80} more`);

function normalizeUnit(faction, unit) {
  const detail = detailFor(faction.id, unit.name);
  const oldSection = unit.section || "Other";
  const newSection = sectionFor(unit, detail);
  if (oldSection !== newSection) {
    changes.push(`${faction.id}: ${unit.name} section ${oldSection} -> ${newSection}`);
    unit.section = newSection;
  }

  const oldTags = JSON.stringify(unit.tags || []);
  unit.tags = normalizeTags(unit, detail);
  if (oldTags !== JSON.stringify(unit.tags)) {
    changes.push(`${faction.id}: ${unit.name} tags normalized`);
  }

  if (detail) {
    const role = roleFor(unit, detail);
    if (detail.role !== role) {
      detail.role = role;
    }
  }
}

function sectionFor(unit, detail) {
  const current = canonicalSection(unit.section);
  const keywords = keywordSet(detail);
  const role = normalize(detail?.role || "");

  if (current === "Legends" || role === "legends" || role === "legend") return "Legends";
  if (current === "Allied Units" || role === "allied units" || role === "allied unit") return "Allied Units";
  if (keywords.has("fortification") || role.includes("fortification")) return "Fortification";
  if (current === "Epic Hero") return current;
  if (keywords.has("character") || current === "Character") return "Character";
  if (current === "Battleline") return "Battleline";
  if (current === "Dedicated Transport") return "Dedicated Transport";
  if (keywords.has("mounted")) return "Mounted";
  if (keywords.has("monster")) return "Monster";
  if (keywords.has("vehicle")) return "Vehicle";
  if (keywords.has("infantry")) return "Infantry";
  return current || "Other";
}

function normalizeTags(unit, detail) {
  const keywords = keywordSet(detail);
  const section = canonicalSection(unit.section);
  const tags = new Set((unit.tags || []).map((tag) => normalizeTag(tag)).filter(Boolean));

  if (section !== "Vehicle" && !keywords.has("vehicle")) tags.delete("vehicle");
  if (section !== "Monster" && !keywords.has("monster")) tags.delete("monster");
  if (section !== "Fortification") tags.delete("fortification");
  if (section === "Allied Units") tags.add("allied");
  if (section === "Legends") tags.add("legends");
  if (section === "Vehicle") tags.add("vehicle");
  if (section === "Monster") tags.add("monster");
  if (section === "Fortification") {
    tags.add("fortification");
    tags.add("anchor");
    tags.delete("vehicle");
  }
  if (section === "Infantry" || keywords.has("infantry")) tags.add("infantry");
  if (section === "Battleline") tags.add("objectives");
  if (section === "Character" || section === "Epic Hero" || keywords.has("character")) tags.add("leader");
  if (keywords.has("terminator")) tags.add("terminator");
  if (keywords.has("mounted")) tags.add("mobility");
  if (keywords.has("fly")) tags.add("mobility");
  if (!tags.size) tags.add("scoring");
  return [...tags].sort();
}

function roleFor(unit, detail) {
  const section = canonicalSection(unit.section);
  if (section === "Allied Units") return "Allied Units";
  if (section === "Legends") return "Legends";
  if (section === "Fortification") return "Fortification";
  if (section === "Dedicated Transport") return "Dedicated Transport";
  if (section === "Epic Hero") return "Epic Hero";
  if (section === "Character") return "Character";
  if (section === "Battleline") return "Battleline";
  if (section === "Infantry") return "Infantry";
  if (section === "Mounted") return "Mounted";
  if (section === "Monster") return "Monster";
  if (section === "Vehicle") return "Vehicle";
  return detail.role || "Other";
}

function harmonizeMarineSharedPoints() {
  const factionMap = new Map((data.factions || []).map((faction) => [faction.id, faction]));
  const groups = new Map();
  for (const factionId of marineFamily) {
    const faction = factionMap.get(factionId);
    if (!faction) continue;
    for (const unit of faction.units || []) {
      const key = normalize(unit.name);
      const group = groups.get(key) || [];
      group.push({ faction, unit });
      groups.set(key, group);
    }
  }

  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const counts = new Map();
    for (const entry of group) {
      const signature = pointsSignature(entry.unit);
      const bucket = counts.get(signature) || { signature, count: 0, source: entry.unit };
      bucket.count += 1;
      counts.set(signature, bucket);
    }
    const buckets = [...counts.values()].sort((a, b) => b.count - a.count);
    if (buckets.length < 2 || buckets[0].count === buckets[1].count || buckets[0].count < 3) continue;
    const source = buckets[0].source;
    for (const { faction, unit } of group) {
      if (pointsSignature(unit) === buckets[0].signature) continue;
      const previous = pointsSignature(unit);
      applyPoints(unit, source);
      changes.push(`${faction.id}: ${unit.name} points ${previous} -> ${buckets[0].signature}`);
    }
  }
}

function applyOfficialPointCorrections() {
  const corrections = [
    {
      factionIds: [...marineFamily],
      name: "Sternguard Veteran Squad",
      pointCosts: { 5: 90, 6: 180, 7: 180, 8: 180, 9: 180, 10: 180 },
      note: "Munitorum Field Manual v1.12",
    },
    {
      factionIds: ["darkAngels"],
      name: "Deathwing Knights",
      pointCosts: { 5: 235 },
      note: "Munitorum Field Manual v1.12",
    },
  ];

  const factionMap = new Map((data.factions || []).map((faction) => [faction.id, faction]));
  for (const correction of corrections) {
    for (const factionId of correction.factionIds) {
      const unit = factionMap.get(factionId)?.units?.find((item) => normalize(item.name) === normalize(correction.name));
      if (!unit) continue;
      const previous = pointsSignature(unit);
      unit.pointCosts = structuredClone(correction.pointCosts);
      unit.points = firstPointCost(correction.pointCosts);
      unit.basePoints = unit.points;
      const current = pointsSignature(unit);
      if (previous !== current) changes.push(`${factionId}: ${unit.name} points ${previous} -> ${current} (${correction.note})`);
    }
  }
}

function pointsSignature(unit) {
  if (unit.pointCosts && Object.keys(unit.pointCosts).length) return JSON.stringify(unit.pointCosts);
  return String(unit.points || 0);
}

function applyPoints(target, source) {
  if (source.pointCosts && Object.keys(source.pointCosts).length) {
    target.pointCosts = structuredClone(source.pointCosts);
    target.points = firstPointCost(source.pointCosts);
    target.basePoints = firstPointCost(source.pointCosts);
  } else {
    delete target.pointCosts;
    target.points = source.points || target.points || 0;
    target.basePoints = source.basePoints || target.points;
  }
}

function firstPointCost(pointCosts) {
  return Object.entries(pointCosts)
    .map(([models, points]) => ({ models: Number(String(models).match(/\d+/)?.[0] || 0), points: Number(points) }))
    .filter((entry) => Number.isFinite(entry.points) && entry.points > 0)
    .sort((a, b) => a.models - b.models)[0]?.points || 0;
}

function detailFor(factionId, name) {
  return detailsByFaction[factionId]?.[normalize(name)] || null;
}

function keywordSet(detail) {
  return new Set((detail?.keywords || []).map((keyword) => normalize(keyword)).filter(Boolean));
}

function canonicalSection(section = "") {
  const normalized = normalize(section);
  if (normalized === "epic hero") return "Epic Hero";
  if (normalized === "character" || normalized === "characters") return "Character";
  if (normalized === "battleline") return "Battleline";
  if (normalized === "dedicated transport" || normalized === "dedicated transports") return "Dedicated Transport";
  if (normalized === "fortification" || normalized === "fortifications") return "Fortification";
  if (normalized === "allied unit" || normalized === "allied units" || normalized === "allies") return "Allied Units";
  if (normalized === "legend" || normalized === "legends") return "Legends";
  if (normalized === "infantry") return "Infantry";
  if (normalized === "mounted") return "Mounted";
  if (normalized === "monster" || normalized === "monsters") return "Monster";
  if (normalized === "vehicle" || normalized === "vehicles") return "Vehicle";
  return section || "Other";
}

function normalizeTag(value) {
  return normalize(value).replace(/\s+/g, " ");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
