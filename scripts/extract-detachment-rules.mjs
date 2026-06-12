import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bsdataDir = path.join(root, ".cache", "bsdata", "wh40k-10e-main");
const dataPath = path.join(root, "data", "factions.json");
const outputPath = path.join(root, "data", "detachment-rules.json");

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const wantedNames = new Set(data.factions.flatMap((faction) => faction.detachments.map((detachment) => normalize(detachment.name))));
const rules = {};

for (const file of fs.readdirSync(bsdataDir).filter((name) => name.endsWith(".cat"))) {
  const xml = fs.readFileSync(path.join(bsdataDir, file), "utf8");
  extractFromSelectionEntryGroups(xml, file);
}

for (const faction of data.factions) {
  for (const detachment of faction.detachments) {
    const key = normalize(detachment.name);
    if (!rules[key]) rules[key] = fallbackRule(detachment);
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify({ rules }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(rules).length} detachment rules to ${path.relative(root, outputPath)}`);

function extractFromSelectionEntryGroups(xml, file) {
  const groupPattern = /<selectionEntryGroup\b([^>]*)/g;
  let groupMatch;
  while ((groupMatch = groupPattern.exec(xml))) {
    const groupName = decodeXml(attr(groupMatch[1], "name"));
    if (normalize(groupName) !== "detachment") continue;
    const groupBlock = selectionEntryGroupBlockAt(xml, groupMatch.index);
    for (const entry of directSelectionEntryBlocks(groupBlock)) {
      const name = decodeXml(attr(entry.attrs, "name"));
      const key = normalize(name);
      if (!wantedNames.has(key) || rules[key]) continue;
      const rule = ruleFromBlock(name, entry.block, file);
      if (rule) rules[key] = rule;
    }
  }
}

function ruleFromBlock(detachmentName, block, file) {
  const extracted = extractRuleDescriptions(block);
  const best = extracted
    .filter((item) => item.description && !/mustering|boarding patrol|rules adapt/i.test(item.name))
    .sort((a, b) => scoreRule(b, detachmentName) - scoreRule(a, detachmentName))[0];
  if (!best) return null;
  return mechanicalRule(detachmentName, best.name, best.description, file);
}

function extractRuleDescriptions(block) {
  const results = [];
  const rulePattern = /<rule\b([^>]*)>/g;
  let match;
  while ((match = rulePattern.exec(block))) {
    const ruleBlock = ruleBlockAt(block, match.index);
    const description = cleanRuleText(decodeXml((ruleBlock.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || ""));
    if (description) results.push({ name: decodeXml(attr(match[1], "name")), description });
  }
  return results;
}

function mechanicalRule(detachmentName, ruleName, description, file) {
  const lines = splitRuleLines(description);
  const timing = lines.find((line) => /at the start|each time|once per|in your|during|while|when/i.test(line)) || "";
  const effect = lines.find((line) => line !== timing) || timing || description;
  const details = lines
    .filter((line) => line !== timing && line !== effect)
    .slice(0, 8)
    .map((line, index) => ({ label: detailLabel(line, index), text: line }));

  return {
    name: cleanDisplayText(ruleName || detachmentName),
    timing: cleanDisplayText(timing),
    effect: cleanDisplayText(effect),
    details: details.map((detail) => ({ label: cleanDisplayText(detail.label), text: cleanDisplayText(detail.text) })),
    source: file,
  };
}

function fallbackRule(detachment) {
  const styles = detachment.styles || [];
  const details = [];
  if (styles.includes("pressure")) details.push({ label: "Presion", text: "Favorece unidades que avanzan, cargan, reposicionan o fuerzan intercambios tempranos." });
  if (styles.includes("melee")) details.push({ label: "Melee", text: "Favorece ataques de combate, cargas o unidades que pelean por objetivos." });
  if (styles.includes("shooting")) details.push({ label: "Disparo", text: "Favorece ataques a distancia, fuego concentrado o perfiles anti-tanque." });
  if (styles.includes("durable")) details.push({ label: "Resistencia", text: "Favorece unidades que sostienen mesa, reducen dano o aguantan objetivos." });
  if (styles.includes("mobility")) details.push({ label: "Movilidad", text: "Favorece movimiento, reservas, deep strike, scout o reposicionamiento." });
  if (styles.includes("mission") || !details.length) details.push({ label: "Mision", text: "Favorece control de objetivos, acciones, OC o scoring secundario." });
  return {
    name: `${detachment.name} rule`,
    timing: "Regla de detachment no extraida literalmente de BSData.",
    effect: "Referencia mecanica generada desde el perfil del detachment.",
    details,
    source: "fallback",
  };
}

function splitRuleLines(text) {
  return text
    .replace(/\s*\u25a0\s*/g, "\n")
    .replace(/\s+-\s+/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 8)
    .slice(0, 12);
}

function detailLabel(line, index) {
  const colon = line.match(/^([^:]{3,40}):\s*(.+)$/);
  if (colon) return titleCase(colon[1]);
  const bracket = line.match(/^([A-Z][A-Za-z '\-]+)\s+\[/);
  if (bracket) return titleCase(bracket[1]);
  return `Detalle ${index + 1}`;
}

function cleanDisplayText(text) {
  return text
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010\u2013\u2014]/g, "-")
    .replace(/\u2011/g, "-")
    .replace(/\u00e2\u20ac[\u0153\ufffd]/g, '"')
    .replace(/\u00e2\u20ac[\u201c\u201d]/g, "-")
    .replace(/\u00e2\u20ac\u2018/g, "-")
    .replace(/\u00c2/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreRule(rule, detachmentName) {
  const text = `${rule.name} ${rule.description}`.toLowerCase();
  let score = 0;
  if (!/stratagem|enhancement|mustering|boarding patrol/i.test(rule.name)) score += 4;
  if (/detachment|ability|rule|aura|stance|protocol|oath|doctrine/i.test(rule.description)) score += 2;
  if (normalize(rule.name) === normalize(detachmentName)) score += 1;
  if (rule.description.length > 60) score += 1;
  if (/crusade|boarding action/i.test(text)) score -= 3;
  return score;
}

function directSelectionEntryBlocks(xml) {
  const entries = [];
  const entryPattern = /<selectionEntry\b([^>]*)/g;
  let match;
  while ((match = entryPattern.exec(xml))) {
    if (entryDepthAt(xml, match.index) !== 1) continue;
    entries.push({ attrs: match[1], block: selectionEntryBlockAt(xml, match.index) });
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

function selectionEntryBlockAt(xml, startIndex) {
  return nestedBlockAt(xml, startIndex, "selectionEntry");
}

function selectionEntryGroupBlockAt(xml, startIndex) {
  return nestedBlockAt(xml, startIndex, "selectionEntryGroup");
}

function ruleBlockAt(xml, startIndex) {
  return nestedBlockAt(xml, startIndex, "rule");
}

function nestedBlockAt(xml, startIndex, tagName) {
  const openEnd = xml.indexOf(">", startIndex);
  if (openEnd === -1) return "";
  if (xml.slice(startIndex, openEnd + 1).endsWith("/>")) return xml.slice(startIndex, openEnd + 1);
  let depth = 0;
  const tagPattern = new RegExp(`</?${tagName}\\b[^>]*\\/?>`, "g");
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

function cleanRuleText(text) {
  return text
    .replace(/\^\^/g, "")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n[ ]+/g, "\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function attr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function decodeXml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalize(value = "") {
  return value.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
