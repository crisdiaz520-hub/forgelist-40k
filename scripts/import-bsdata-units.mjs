import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bsdataDir = path.join(root, ".cache", "bsdata", "wh40k-10e-main");
const dataPath = path.join(root, "data", "factions.json");

const sourceSpecs = [
  { file: "Imperium - Space Marines.cat", id: "spaceMarines", name: "Space Marines" },
  { file: "Imperium - Deathwatch.cat", id: "deathwatch", name: "Deathwatch", base: "spaceMarines" },
  { file: "Imperium - Imperial Fists.cat", id: "imperialFists", name: "Imperial Fists", base: "spaceMarines" },
  { file: "Imperium - Iron Hands.cat", id: "ironHands", name: "Iron Hands", base: "spaceMarines" },
  { file: "Imperium - Raven Guard.cat", id: "ravenGuard", name: "Raven Guard", base: "spaceMarines" },
  { file: "Imperium - Salamanders.cat", id: "salamanders", name: "Salamanders", base: "spaceMarines" },
  { file: "Imperium - Ultramarines.cat", id: "ultramarines", name: "Ultramarines", base: "spaceMarines" },
  { file: "Imperium - White Scars.cat", id: "whiteScars", name: "White Scars", base: "spaceMarines" },
  { file: "Imperium - Blood Angels.cat", id: "bloodAngels", name: "Blood Angels", base: "spaceMarines" },
  { file: "Imperium - Dark Angels.cat", id: "darkAngels", name: "Dark Angels", base: "spaceMarines" },
  { file: "Imperium - Space Wolves.cat", id: "spaceWolves", name: "Space Wolves", base: "spaceMarines" },
  { file: "Imperium - Black Templars.cat", id: "blackTemplars", name: "Black Templars", base: "spaceMarines" },
  { file: "Imperium - Astra Militarum.cat", id: "astraMilitarum", name: "Astra Militarum" },
  { file: "Imperium - Adeptus Custodes.cat", id: "adeptusCustodes", name: "Adeptus Custodes" },
  { file: "Imperium - Adeptus Mechanicus.cat", id: "adeptusMechanicus", name: "Adeptus Mechanicus" },
  { file: "Imperium - Adepta Sororitas.cat", id: "adeptaSororitas", name: "Adepta Sororitas" },
  { file: "Imperium - Grey Knights.cat", id: "greyKnights", name: "Grey Knights" },
  { file: "Imperium - Imperial Knights - Library.cat", id: "imperialKnights", name: "Imperial Knights" },
  { file: "Imperium - Agents of the Imperium.cat", id: "imperialAgents", name: "Imperial Agents" },
  { file: "Chaos - Chaos Space Marines.cat", id: "chaosSpaceMarines", name: "Chaos Space Marines" },
  { file: "Chaos - Emperor's Children.cat", id: "emperorsChildren", name: "Emperor's Children", base: "chaosSpaceMarines" },
  { file: "Chaos - Chaos Daemons Library.cat", id: "chaosDaemons", name: "Chaos Daemons" },
  { file: "Chaos - Chaos Knights Library.cat", id: "chaosKnights", name: "Chaos Knights" },
  { file: "Chaos - Death Guard.cat", id: "deathGuard", name: "Death Guard" },
  { file: "Chaos - Thousand Sons.cat", id: "thousandSons", name: "Thousand Sons" },
  { file: "Chaos - World Eaters.cat", id: "worldEaters", name: "World Eaters" },
  { file: "Aeldari - Craftworlds.cat", id: "aeldari", name: "Aeldari" },
  { file: "Aeldari - Drukhari.cat", id: "drukhari", name: "Drukhari" },
  { file: "Tyranids.cat", id: "tyranids", name: "Tyranids" },
  { file: "Genestealer Cults.cat", id: "genestealerCults", name: "Genestealer Cults" },
  { file: "Necrons.cat", id: "necrons", name: "Necrons" },
  { file: "Orks.cat", id: "orks", name: "Orks" },
  { file: "T'au Empire.cat", id: "tAuEmpire", name: "T'au Empire" },
  { file: "Leagues of Votann.cat", id: "leaguesOfVotann", name: "Leagues of Votann" },
];

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const originalById = new Map(data.factions.map((faction) => [faction.id, structuredClone(faction)]));
const catalogueCorpus = fs
  .readdirSync(bsdataDir)
  .filter((fileName) => fileName.endsWith(".cat"))
  .map((fileName) => fs.readFileSync(path.join(bsdataDir, fileName), "utf8"))
  .join("\n");
const allUnitTargets = validUnitTargets(catalogueCorpus);
const allSelectionEntryGroups = selectionEntryGroupTargets(catalogueCorpus);

for (const spec of sourceSpecs) {
  const faction = ensureFaction(spec, originalById);
  const filePath = path.join(bsdataDir, spec.file);
  if (!faction || !fs.existsSync(filePath)) continue;

  const xml = fs.readFileSync(filePath, "utf8");
  const detachments = extractDetachments(xml);
  const baseDetachments = spec.base ? data.factions.find((item) => item.id === spec.base)?.detachments || [] : [];
  faction.detachments = filterDetachmentsForFaction(spec, mergeDetachments(baseDetachments, detachments.length ? detachments : faction.detachments));
  const existing = new Map(faction.units.map((unit) => [normalize(unit.name), unit]));
  const generated = extractUnits(xml).map((entry) => {
    const previous = existing.get(normalize(entry.name));
    return previous ? mergeUnit(previous, entry) : makeUnit(entry);
  });

  const byName = new Map();
  const baseUnits = spec.base ? structuredClone(data.factions.find((item) => item.id === spec.base)?.units || []) : [];
  [...baseUnits, ...generated].forEach((unit) => {
    const key = normalize(unit.name);
    const previous = byName.get(key);
    byName.set(key, previous ? mergeUnit(previous, unit) : unit);
  });
  faction.units = [...byName.values()]
    .filter((unit) => !isNonUnitName(unit.name) && !isModelOptionName(unit.name))
    .filter((unit) => !isForeignChapterEpic(unit.name, spec))
    .filter((unit) => unit.points > 0)
    .map((unit) => normalizeUnitTaxonomy(unit))
    .sort((a, b) => a.name.localeCompare(b.name));
  const baseSynergy = spec.base ? data.factions.find((item) => item.id === spec.base)?.synergy : null;
  faction.synergy = mergeSynergy(baseSynergy, extractSynergy(xml, faction.units));
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

const unitCount = data.factions.reduce((sum, faction) => sum + faction.units.length, 0);
console.log(`${data.factions.length} factions, ${unitCount} units`);

function ensureFaction(spec, originals) {
  let faction = data.factions.find((item) => item.id === spec.id);
  if (faction) return faction;
  const base = originals.get(spec.base) || originals.get("spaceMarines");
  faction = {
    id: spec.id,
    name: spec.name,
    detachments: structuredClone(base?.detachments || [{ id: "default", name: "Default Detachment", styles: ["mission"], score: 6 }]),
    units: structuredClone(base?.units || []),
  };
  data.factions.push(faction);
  return faction;
}

function extractUnits(xml) {
  const entries = new Map();
  const entryLinkPattern = /^    <entryLink\b([^>]*)/gm;
  let match;
  while ((match = entryLinkPattern.exec(xml))) {
    const attrs = match[1];
    const rawName = attr(attrs, "name");
    const targetId = attr(attrs, "targetId");
    const name = cleanUnitName(decodeXml(rawName));
    if (!name || isNonUnitName(name)) continue;
    const target = allUnitTargets.get(targetId);
    if (!target) continue;
    entries.set(normalize(name), {
      name,
      points: target.points,
      categories: target.categories,
      rulesText: target.block,
      section: sectionFromCategories(target.categories, decodeXml(rawName)),
    });
  }
  return [...entries.values()];
}

function extractDetachments(xml) {
  const entries = new Map();
  const groupPattern = /<selectionEntryGroup\b([^>]*)/g;
  let groupMatch;
  while ((groupMatch = groupPattern.exec(xml))) {
    const groupName = decodeXml(attr(groupMatch[1], "name"));
    if (normalize(groupName) !== "detachment") continue;
    const groupBlock = selectionEntryGroupBlockAt(xml, groupMatch.index);
    const directEntries = directSelectionEntries(groupBlock)
      .map((attrs) => decodeXml(attr(attrs, "name")))
      .filter((name) => name && normalize(name) !== "none" && !isNonDetachmentName(name));
    directEntries.forEach((name) => entries.set(normalize(name), makeDetachment(name)));
  }

  const linkPattern = /<entryLink\b([^>]*)/g;
  let linkMatch;
  while ((linkMatch = linkPattern.exec(xml))) {
    const attrs = linkMatch[1];
    if (attr(attrs, "type") !== "selectionEntryGroup") continue;
    if (normalize(decodeXml(attr(attrs, "name"))) !== "detachment") continue;
    const groupBlock = allSelectionEntryGroups.get(attr(attrs, "targetId"));
    directSelectionEntries(groupBlock)
      .map((entryAttrs) => decodeXml(attr(entryAttrs, "name")))
      .filter((name) => name && normalize(name) !== "none" && !isNonDetachmentName(name))
      .forEach((name) => entries.set(normalize(name), makeDetachment(name)));
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function extractSynergy(xml, units) {
  const leaders = {};
  const transports = {};
  const entryLinkPattern = /^    <entryLink\b([^>]*)/gm;
  let match;
  while ((match = entryLinkPattern.exec(xml))) {
    const attrs = match[1];
    const rawName = attr(attrs, "name");
    const targetId = attr(attrs, "targetId");
    const name = cleanUnitName(decodeXml(rawName));
    if (!name || isNonUnitName(name)) continue;
    const target = allUnitTargets.get(targetId);
    if (!target?.block) continue;
    const unit = findUnitByName(units, name);
    if (!unit) continue;

    const leaderTargets = extractLeaderTargets(target.block, units, unit.name);
    if (leaderTargets.length) leaders[unit.name] = leaderTargets;

    const transport = extractTransportRule(target.block, units, unit.name);
    if (transport) transports[unit.name] = transport;
  }

  return { leaders, transports };
}

function mergeSynergy(base, own) {
  return {
    leaders: { ...(base?.leaders || {}), ...(own?.leaders || {}) },
    transports: { ...(base?.transports || {}), ...(own?.transports || {}) },
  };
}

function extractLeaderTargets(block, units, leaderName) {
  const descriptions = profileDescriptions(block, "Leader");
  const targets = new Set();
  descriptions.forEach((description) => {
    const relevant = description.split(/You can attach|This model can be attached to one/i)[0];
    matchUnitReferences(relevant, units, leaderName).forEach((name) => targets.add(name));
  });
  return [...targets].sort((a, b) => a.localeCompare(b));
}

function extractTransportRule(block, units, transportName) {
  const descriptions = [
    ...profileDescriptions(block, "Transport"),
    ...profileDescriptions(block, transportName).filter((description) => /transport capacity/i.test(description)),
  ];
  const description = descriptions.find((item) => /transport capacity/i.test(item));
  if (!description) return null;
  return {
    capacity: transportCapacity(description),
    rule: compactRuleText(description),
    eligibleUnits: transportEligibleUnits(description, units, transportName),
  };
}

function profileDescriptions(block, profileName) {
  const descriptions = [];
  const profilePattern = /<profile\b([^>]*)/g;
  let match;
  while ((match = profilePattern.exec(block))) {
    const name = decodeXml(attr(match[1], "name"));
    const typeName = decodeXml(attr(match[1], "typeName"));
    if (normalize(name) !== normalize(profileName) && normalize(typeName) !== normalize(profileName)) continue;
    const profileBlock = profileBlockAt(block, match.index);
    descriptions.push(...[...profileBlock.matchAll(/<characteristic\b[^>]*>([\s\S]*?)<\/characteristic>/g)].map((item) => cleanRuleText(decodeXml(item[1]))));
  }
  return descriptions.filter(Boolean);
}

function profileBlockAt(xml, startIndex) {
  const openEnd = xml.indexOf(">", startIndex);
  if (openEnd === -1) return "";
  if (xml.slice(startIndex, openEnd + 1).endsWith("/>")) return xml.slice(startIndex, openEnd + 1);
  let depth = 0;
  const tagPattern = /<\/?profile\b[^>]*\/?>/g;
  tagPattern.lastIndex = startIndex;
  let match;
  while ((match = tagPattern.exec(xml))) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
      if (depth === 0) return xml.slice(startIndex, tagPattern.lastIndex);
    } else if (!tag.endsWith("/>")) {
      depth += 1;
    }
  }
  return "";
}

function matchUnitReferences(text, units, sourceName = "") {
  const normalizedText = normalize(cleanRuleText(text));
  return units
    .filter((unit) => unit.name !== sourceName)
    .filter((unit) => normalizedText.includes(normalize(unit.name)))
    .map((unit) => unit.name);
}

function transportEligibleUnits(description, units, transportName) {
  const text = cleanRuleText(description);
  const normalizedText = normalize(text);
  const explicit = matchUnitReferences(text, units, transportName);
  const broadInfantry = /\binfantry\b/i.test(text);
  const broadCharacter = /\bcharacter\b/i.test(text);
  const broadMounted = /\bmounted\b/i.test(text);
  const exclusions = excludedTransportTerms(text);
  const eligible = new Set(explicit);

  if (broadInfantry || broadCharacter || broadMounted) {
    const requiredTerms = requiredTransportTerms(text);
    units.forEach((unit) => {
      const unitText = normalize(`${unit.name} ${unit.section} ${unit.tags?.join(" ") || ""}`);
      const infantry = ["Infantry", "Battleline"].includes(unit.section);
      const character = ["Character", "Epic Hero"].includes(unit.section) || unit.tags?.includes("leader");
      const mounted = unit.section === "Mounted";
      const broadMatch = broadInfantry && infantry || broadCharacter && character || broadMounted && mounted;
      if (!broadMatch) return;
      if (requiredTerms.length && !requiredTerms.some((term) => unitText.includes(term))) return;
      if (exclusions.some((term) => unitText.includes(term))) return;
      if (/dedicated transport|vehicle|monster/.test(unitText)) return;
      eligible.add(unit.name);
    });
  }

  if (!eligible.size && normalizedText.includes("unit")) {
    matchUnitReferences(text, units, transportName).forEach((name) => eligible.add(name));
  }

  return [...eligible].sort((a, b) => a.localeCompare(b));
}

function requiredTransportTerms(text) {
  const terms = [];
  if (/\btacticus\b/i.test(text)) terms.push("tacticus");
  if (/\bphobos\b/i.test(text)) terms.push("phobos");
  if (/\bgravis\b/i.test(text)) terms.push("gravis");
  if (/\bterminator\b/i.test(text)) terms.push("terminator");
  if (/\bjump pack\b/i.test(text)) terms.push("jump pack");
  return terms;
}

function excludedTransportTerms(text) {
  const parts = [];
  const excluding = text.match(/excluding ([^.)]+)/i);
  const cannot = text.match(/cannot transport ([^.]+)/i);
  if (excluding) parts.push(excluding[1]);
  if (cannot) parts.push(cannot[1]);
  return parts.join(", ")
    .split(/,| and | or /i)
    .map((term) => normalize(term.replace(/\bmodels?\b/gi, "")))
    .filter(Boolean);
}

function transportCapacity(description) {
  const match = description.match(/capacity of (\d+)/i);
  return match ? Number(match[1]) : null;
}

function compactRuleText(text) {
  return cleanRuleText(text).slice(0, 260);
}

function cleanRuleText(text) {
  return text
    .replace(/\^\^\*\*/g, "")
    .replace(/\*\*\^\^/g, "")
    .replace(/[■•◦]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findUnitByName(units, name) {
  const normalized = normalize(name);
  return units.find((unit) => normalize(unit.name) === normalized);
}

function selectionEntryGroupTargets(xml) {
  const groups = new Map();
  const groupPattern = /<selectionEntryGroup\b([^>]*)/g;
  let match;
  while ((match = groupPattern.exec(xml))) {
    const id = attr(match[1], "id");
    if (!id || groups.has(id)) continue;
    const block = selectionEntryGroupBlockAt(xml, match.index);
    if (block) groups.set(id, block);
  }
  return groups;
}

function mergeDetachments(...sets) {
  const byName = new Map();
  sets.flat().filter(Boolean).forEach((detachment) => {
    byName.set(normalize(detachment.name), detachment);
  });
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function filterDetachmentsForFaction(spec, detachments) {
  if (spec.id !== "spaceMarines" && spec.base !== "spaceMarines") return detachments;
  return detachments.filter((detachment) => {
    const owner = spaceMarineDetachmentOwner(detachment.name);
    return !owner || owner === spec.id;
  });
}

function spaceMarineDetachmentOwner(name) {
  const owners = {
    deathwatch: ["Black Spear Task Force"],
    imperialFists: ["Bastion Task Force", "Headhunter Task Force"],
    ironHands: ["Hammer of Avernii"],
    ravenGuard: ["Shadowmark Talon"],
    salamanders: ["Forgefather's Seekers"],
    ultramarines: ["Blade of Ultramar"],
    whiteScars: ["Company of Hunters"],
    bloodAngels: ["Angelic Inheritors", "Liberator Assault Group", "The Angelic Host", "The Lost Brethren"],
    darkAngels: ["Inner Circle Task Force", "Lion's Blade Task Force", "Unforgiven Task Force", "Wrath of the Rock"],
    spaceWolves: ["Champions of Fenris", "Rage-Cursed Onslaught", "Saga of the Beastslayer", "Saga of the Bold", "Saga of the Great Wolf", "Saga of the Hunter"],
    blackTemplars: ["Emperor's Shield", "Vindication Task Force", "Wrathful Procession"],
  };
  const normalized = normalize(name);
  return Object.entries(owners).find(([, names]) => names.some((item) => normalize(item) === normalized))?.[0] || null;
}

function directSelectionEntries(xml) {
  const block = firstTopLevelBlock(xml, "selectionEntries");
  const entries = [];
  const entryPattern = /<selectionEntry\b([^>]*)/g;
  let match;
  while ((match = entryPattern.exec(block))) {
    if (entryDepthAt(block, match.index) === 1) entries.push(match[1]);
  }
  return entries;
}

function entryDepthAt(xml, index) {
  let depth = 0;
  const tagPattern = /<\/?selectionEntry\b[^>]*\/?>/g;
  let match;
  while ((match = tagPattern.exec(xml)) && match.index <= index) {
    const tag = match[0];
    if (tag.startsWith("</")) depth -= 1;
    else if (!tag.endsWith("/>")) depth += 1;
  }
  return depth;
}

function makeDetachment(name) {
  return {
    id: toId(name),
    name,
    styles: inferDetachmentStyles(name),
    score: inferDetachmentScore(name),
  };
}

function toId(value) {
  return normalize(value).replace(/\b\w/g, (letter, index) => (index ? letter.toUpperCase() : letter)).replace(/\s+/g, "");
}

function isNonDetachmentName(name) {
  return /^(detachment|enhancements?|stratagems?|warlord|battle size|army roster|configuration)$/i.test(name);
}

function inferDetachmentStyles(name) {
  const text = name.toLowerCase();
  const styles = [];
  if (/assault|onslaught|vanguard|storm|host|raider|horde|swarm|cult|waaagh|kult|talon|terror|blood|claw|wolf|lance|spearhead|legion|renegade|invasion|skysplinter|eradication|crusher|feral|berserk|bounty|speed/.test(text)) styles.push("pressure");
  if (/melee|assault|blood|claw|wolf|talon|crusher|berserk|world eaters|waaagh|horde|warrior|anvil siege|riot|stampede/.test(text)) styles.push("melee");
  if (/gun|fire|forge|artillery|cadre|retaliation|kauyon|mont|fleet|arsenal|ironstorm|spearhead|eradication|ranged|flame|starshatter|hunter|lance|obliteration|veteran|dread|armoured|tank|phalanx/.test(text)) styles.push("shooting");
  if (/anvil|shield|phalanx|wall|court|crypt|guardian|host|cohort|warrior|durable|bully|green tide|plague|stone|iron|castle|hallowed|protector|custodian/.test(text)) styles.push("durable");
  if (/mission|battleline|liberator|gladius|awakened|invasion|index|host|fleet|hunter|reclamation|congregation|war horde|battlehost|detachment|brood|cult|legion|company|cadre/.test(text)) styles.push("mission");
  if (/vanguard|scout|skysplinter|stormlance|speed|outrider|raven|teleport|hypercrypt|deep|sky|aerial|swift|kult/.test(text)) styles.push("mobility");
  if (!styles.length) styles.push("mission");
  if (styles.length === 1 && styles[0] !== "mission") styles.push("mission");
  return [...new Set(styles)].slice(0, 2);
}

function inferDetachmentScore(name) {
  const text = name.toLowerCase();
  if (/gladius|invasion|battlehost|war horde|awakened|hypercrypt|canoptek|renegade raiders|pactbound|index|kauyon|mont|wolf jail|starshatter|soulforged|crusher|green tide|host/.test(text)) return 8;
  if (/auxilia|boarding|grotmas|army of faith|data-psalm|unending swarm|anvil siege|annihilation|obeisance/.test(text)) return 6;
  return 7;
}

function validUnitTargets(xml) {
  const targets = new Map();
  const selectionEntryPattern = /<selectionEntry\b([^>]*)/g;
  let match;
  while ((match = selectionEntryPattern.exec(xml))) {
    const attrs = match[1];
    const id = attr(attrs, "id");
    const type = attr(attrs, "type");
    const name = decodeXml(attr(attrs, "name"));
    if (!id || !["model", "unit"].includes(type) || isNonUnitName(name)) continue;
    const block = selectionEntryBlockAt(xml, match.index);
    const points = extractPoints(block);
    const hasUnitProfile = /<profile\b[^>]*typeName="Unit"/.test(block);
    if (block && ((type === "unit" && points > 0) || hasUnitProfile)) {
      keepBestTarget(targets, id, {
        type,
        name,
        points,
        categories: extractCategories(block),
        block,
      });
    }
  }
  return targets;
}

function keepBestTarget(targets, id, candidate) {
  const current = targets.get(id);
  if (!current) {
    targets.set(id, candidate);
    return;
  }

  const candidateRank = targetRank(candidate);
  const currentRank = targetRank(current);
  if (candidateRank > currentRank) {
    targets.set(id, candidate);
  }
}

function targetRank(target) {
  const hasPoints = target.points > 0 ? 10 : 0;
  const unitType = target.type === "unit" ? 5 : 0;
  return hasPoints + unitType;
}

function selectionEntryBlockAt(xml, startIndex) {
  const openEnd = xml.indexOf(">", startIndex);
  if (openEnd === -1) return "";
  if (xml.slice(startIndex, openEnd + 1).endsWith("/>")) return xml.slice(startIndex, openEnd + 1);
  let depth = 0;
  const tagPattern = /<\/?selectionEntry\b[^>]*\/?>/g;
  tagPattern.lastIndex = startIndex;
  let match;
  while ((match = tagPattern.exec(xml))) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
      if (depth === 0) return xml.slice(startIndex, tagPattern.lastIndex);
    } else if (!tag.endsWith("/>")) {
      depth += 1;
    }
  }
  return "";
}

function selectionEntryGroupBlockAt(xml, startIndex) {
  const openEnd = xml.indexOf(">", startIndex);
  if (openEnd === -1) return "";
  if (xml.slice(startIndex, openEnd + 1).endsWith("/>")) return xml.slice(startIndex, openEnd + 1);
  let depth = 0;
  const tagPattern = /<\/?selectionEntryGroup\b[^>]*\/?>/g;
  tagPattern.lastIndex = startIndex;
  let match;
  while ((match = tagPattern.exec(xml))) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
      if (depth === 0) return xml.slice(startIndex, tagPattern.lastIndex);
    } else if (!tag.endsWith("/>")) {
      depth += 1;
    }
  }
  return "";
}

function firstTopLevelBlock(xml, tagName) {
  const start = xml.indexOf(`<${tagName}>`);
  if (start === -1) return "";
  const tagPattern = new RegExp(`</?${tagName}>`, "g");
  tagPattern.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tagPattern.exec(xml))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return xml.slice(start, tagPattern.lastIndex);
    } else {
      depth += 1;
    }
  }
  return "";
}

function makeUnit(entry) {
  const tags = inferTags(entry.name, entry.categories || [], entry.rulesText || "");
  const section = entry.section || sectionFromCategories(entry.categories || [], entry.name);
  if (["Epic Hero", "Character"].includes(section) && !tags.includes("leader")) tags.push("leader");
  return {
    name: entry.name,
    points: entry.points || 0,
    styles: inferStyles(tags),
    tags,
    section,
    ratings: { competitive: 6, casual: 6, narrative: 6 },
  };
}

function mergeUnit(previous, incoming) {
  const entry = typeof incoming.name === "string" && !incoming.ratings ? makeUnit(incoming) : incoming;
  return {
    ...previous,
    ...entry,
    points: entry.points || previous.points || 0,
    section: bestSection(entry.section, previous.section, entry.name || previous.name),
    tags: entry.tags?.length ? entry.tags : previous.tags,
    styles: entry.styles?.length ? entry.styles : previous.styles,
    ratings: previous.ratings || entry.ratings || { competitive: 6, casual: 6, narrative: 6 },
  };
}

function bestSection(a, b, name) {
  const rank = new Map(["Other", "Infantry", "Vehicle", "Monster", "Mounted", "Allied Units", "Legends", "Fortification", "Dedicated Transport", "Battleline", "Character", "Epic Hero"].map((section, index) => [section, index]));
  const first = a || inferSection(name);
  const second = b || "Other";
  return (rank.get(first) || 0) >= (rank.get(second) || 0) ? first : second;
}

function normalizeUnitTaxonomy(unit) {
  const section = bestSection(inferSection(unit.name), unit.section, unit.name);
  const tags = inferTags(unit.name, [section], unit.rulesText || "");
  if (["Epic Hero", "Character"].includes(section) && !tags.includes("leader")) tags.push("leader");
  const { rulesText, ...cleanUnit } = unit;
  return {
    ...cleanUnit,
    section,
    tags: [...new Set(tags)],
    styles: inferStyles(tags),
  };
}

function attr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function extractPoints(block) {
  const points = [...block.matchAll(/<cost\b[^>]*name="pts"[^>]*value="([^"]+)"/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0);
  return points.length ? Math.max(...points) : 0;
}

function extractCategories(block) {
  return [...block.matchAll(/<categoryLink\b[^>]*name="([^"]+)"/g)]
    .map((match) => decodeXml(match[1]))
    .filter((name) => !/^Faction:|^Imperium$|^Chaos$|^Aeldari$|^Grenades$/i.test(name));
}

function decodeXml(value) {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanUnitName(value = "") {
  return String(value || "")
    .replace(/\s*\[Legends?\]\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return value.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function isNonUnitName(name) {
  return /^(detachment|enhancements?|warlord|battle size|stratagems?|dreadnought|storm bolter|boltgun|combi-bolter|combi-weapon|plasma pistol|power fist|chainsword|astartes chainsword|heavy bolt pistol|frag grenade|krak grenade|close combat weapon|force weapon)$/i.test(name);
}

function isModelOptionName(name) {
  const text = name.toLowerCase();
  if (/\bw\//.test(text)) return true;
  if (/^(power fist|storm bolter|boltgun|plasma pistol|chainsword|thunder hammer|lightning claw|force weapon|nemesis force weapon|combi-weapon|combi-bolter)/.test(text)) return true;
  if (/( with | and ).*(boltgun|plasma pistol|storm bolter|power fist|chainsword|chainblade|gauntlets|meltagun|flamer|incinerator|heavy bolter)/.test(text) && !/squad with|captain with|chaplain with|lieutenant with|land speeder storm|assault intercessors with/.test(text)) return true;
  return false;
}

function isForeignChapterEpic(name, spec) {
  if (spec.base !== "spaceMarines") return false;
  const text = name.toLowerCase();
  const chapterEpics = [
    { ids: ["ultramarines"], pattern: /marneus calgar|roboute guilliman|uriel ventris|titus/ },
    { ids: ["salamanders"], pattern: /vulkan he'stan|adrathic|adrax agatone/ },
    { ids: ["imperialFists"], pattern: /tor garadon|darnath lysander/ },
    { ids: ["ravenGuard"], pattern: /kayvaan shrike/ },
    { ids: ["ironHands"], pattern: /feirros|kaan/ },
    { ids: ["whiteScars"], pattern: /kor'sarro|khan/ },
    { ids: ["deathwatch"], pattern: /watch master|artemis|cassius/ },
    { ids: ["blackTemplars"], pattern: /helbrecht|grimaldus|emperor's champion/ },
    { ids: ["bloodAngels"], pattern: /dante|mephiston|lemartes|astorath|sanguinor|tycho|corbulo|sanguinary priest/ },
    { ids: ["darkAngels"], pattern: /lion el'jonson|azrael|belial|sammael|asmodai|ezekiel|lazarus/ },
    { ids: ["spaceWolves"], pattern: /logan grimnar|ragnar|bjorn|njal|ulrik|canis|arjac|murderfang|krom|lukas/ },
  ];
  const matching = chapterEpics.find((entry) => entry.pattern.test(text));
  return Boolean(matching && !matching.ids.includes(spec.id));
}

function inferTags(name, categories = [], rulesText = "") {
  const text = name.toLowerCase();
  const categoryText = categories.join(" ").toLowerCase();
  const rules = rulesText.toLowerCase();
  const tags = [];
  if (/allied units?/.test(categoryText)) tags.push("allied");
  if (/\blegends?\b/.test(categoryText) || /\[legends?\]/.test(text)) tags.push("legends");
  if (/epic hero|character/.test(categoryText)) tags.push("leader");
  if (/battleline/.test(categoryText)) tags.push("objectives");
  if (/fortification/.test(categoryText)) tags.push("fortification", "anchor");
  if (/vehicle/.test(categoryText)) tags.push("vehicle");
  if (/monster/.test(categoryText)) tags.push("monster");
  if (/mounted|fly/.test(categoryText)) tags.push("mobility");
  if (/gravis/.test(categoryText)) tags.push("gravis");
  if (/phobos/.test(categoryText)) tags.push("phobos");
  if (/tacticus/.test(categoryText)) tags.push("tacticus");
  if (/terminator/.test(categoryText)) tags.push("terminator");
  if (/jump pack/.test(categoryText)) tags.push("jump pack");
  if (/lone operative/.test(rules)) tags.push("lone operative");
  if (/gravis|aggressor|eradicator|heavy intercessor|apothecary biologis/.test(text)) tags.push("gravis");
  if (/phobos|infiltrator|incursor|reiver|eliminator|lieutenant with combi-weapon/.test(text)) tags.push("phobos");
  if (/tacticus|assault intercessor|intercessor squad|hellblaster|infernus|sternguard|desolation|bladeguard|company heroes/.test(text) && !/heavy intercessor|centurion/.test(text)) tags.push("tacticus");
  if (/terminator/.test(text)) tags.push("terminator");
  if (/jump pack|with jump packs|inceptor|suppressor/.test(text)) tags.push("jump pack");
  if (/captain|commander|canoness|farseer|overlord|lord|warboss|primus|kahl|inquisitor|champion|marshal|chaplain|librarian|ethereal|autarch|archon|haemonculus|succubus/.test(text)) tags.push("leader");
  if (/intercessor|squad|team|warriors|guardsmen|boyz|termagants|plague marines|rubric|battle sisters|hearthkyn|kabalite|wyches|cultist|neophyte|strike squad/.test(text)) tags.push("objectives");
  if (/\btank\b|raider|rhino|impulsor|dreadnought|predator|ghost ark|doomsday ark|hammerhead|devilfish|sagitaur|fortress|war dog|crawler|vehicle/.test(text)) tags.push("vehicle");
  if (/jump|bike|cavalry|piranha|raider|venom|seraphim|hawk|spider|warp|scourges|inceptor|interceptor|teleport|deep/.test(text)) tags.push("mobility");
  if (/eradicator|dragon|sunforge|destroyer|lancer|doomsday|brigand|warglaive|hammerhead|anti/.test(text)) tags.push("anti-tank");
  if (/terminator|guard|wraith|custodian|deathshroud|hearthguard|aberrant|meganob|ctan|c'tan|avatar|dreadnought|knight/.test(text)) tags.push("elite", "anchor");
  if (/assault|berzerker|eightbound|genestealer|repentia|talon|blade|sword|wulfen|wych|melee|nob|death company/.test(text)) tags.push("trading");
  if (/scout|ranger|infiltrator|nurglings|flayed/.test(text)) tags.push("infiltrate", "screen");
  if (!tags.length) tags.push("scoring");
  return [...new Set(tags)];
}

function inferSection(name) {
  const text = name.toLowerCase();
  if (/guilliman|calgar|vulkan|adrax|garadon|lysander|shrike|feirros|kor'sarro|lion|dante|azrael|helbrecht|logan|mortarion|magnus|angron|abaddon|avatar|asurmen|baharroth|fuegan|jain zar|karandras|maugan ra|yriel|eldrad|lelith|urien|drazhar|nightbringer|void dragon|swarmlord|leontus|morvenn|celestine|trajann|kaldor|farsight|shadowsun|ghazghkull|ctan|c'tan|ynnead|yllianna|uthar|kharn|ahriman|vahl/.test(text)) return "Epic Hero";
  if (/captain|commander|canoness|farseer|overlord|lord|warboss|primus|kahl|inquisitor|champion|marshal|chaplain|librarian|ethereal|autarch|archon|haemonculus|succubus|lieutenant|apothecary|ancient|techmarine|judiciar|broodlord|neurotyrant|patriarch|magus|iconward|biologus|tallyman|sorcerer|daemon prince|big mek|painboy|weirdboy|boss|platoon command/.test(text)) return "Character";
  if (/intercessor squad|heavy intercessor squad|assault intercessor|crusader squad|battle sisters squad|cadian shock troops|infantry squad|boyz|beast snagga boyz|termagants|hormagaunts|necron warriors|immortals|rubric marines|plague marines|legionaries|cultist mob|kabalite warriors|wyches|guardian defenders|rangers|breacher team|strike squad|hearthkyn warriors|neophyte hybrids|acolyte hybrids/.test(text)) return "Battleline";
  if (/rhino|razorback|impulsor|raider|venom|devilfish|trukk|sagitaur|chimera|immolator|drop pod|land raider|transport/.test(text)) return "Dedicated Transport";
  if (/bunker|aegis defence line|noctilith crown|convergence of dominion|tidewall|feculent gnarlmaw|skull altar|miasmic malignifier|bossbunka/.test(text)) return "Fortification";
  if (/\btank\b|dreadnought|predator|gladiator|repulsor|ghost ark|doomsday ark|hammerhead|riptide|piranha|devilfish|sagitaur|fortress|war dog|crawler|castigator|exorcist|dunecrawler|ironstrider|ballistarii|vehicle|flyer|stormraven|fire prism|falcon|night spinner|wave serpent|ravager|battlewagon|stompa|wagon|monolith|doomsday/.test(text)) return "Vehicle";
  if (/bloodthirster|keeper of secrets|lord of change|great unclean|avatar|ctan|c'tan|maleceptor|tyrannofex|haruspex|exocrine|trygon|mawloc|daemon prince|mutalith|squiggoth|monster/.test(text)) return "Monster";
  if (/bike|cavalry|outrider|thunderwolf|squighog|mounted|praetor/.test(text)) return "Mounted";
  return "Infantry";
}

function sectionFromCategories(categories = [], name = "") {
  const rawName = String(name || "");
  if (/\[Legends?\]/i.test(rawName) || categories.some((category) => /^legends?$/i.test(category))) return "Legends";
  if (categories.some((category) => /^allied units?$/i.test(category) || /^allies$/i.test(category))) return "Allied Units";
  const priority = ["Epic Hero", "Character", "Battleline", "Dedicated Transport", "Fortification", "Mounted", "Monster", "Vehicle", "Infantry"];
  const found = priority.find((section) => categories.some((category) => category.toLowerCase() === section.toLowerCase()));
  return found || inferSection(name);
}

function inferStyles(tags) {
  const styles = [];
  if (tags.includes("mobility") || tags.includes("trading")) styles.push("pressure");
  if (tags.includes("anti-tank") || tags.includes("vehicle")) styles.push("shooting");
  if (tags.includes("anchor") || tags.includes("elite")) styles.push("durable");
  if (tags.includes("objectives") || tags.includes("scoring") || tags.includes("screen")) styles.push("mission");
  if (tags.includes("trading")) styles.push("melee");
  return styles.length ? [...new Set(styles)].slice(0, 2) : ["mission"];
}
