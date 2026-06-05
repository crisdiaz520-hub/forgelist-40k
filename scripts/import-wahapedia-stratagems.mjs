import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data", "factions.json");
const outputPath = path.join(root, "data", "detachment-stratagems.json");
const cachePath = path.join(os.tmpdir(), "wahapedia-stratagems.csv");
const sourceUrl = "https://wahapedia.ru/wh40k10ed/Stratagems.csv";

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const wantedDetachments = new Set(data.factions.flatMap((faction) => faction.detachments.map((detachment) => normalize(detachment.name))));
const csv = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, "utf8") : await download(sourceUrl);
const rows = parsePipeCsv(csv);
const stratagems = {};

for (const row of rows) {
  const detachment = cleanDisplayText(row.detachment || "");
  const key = normalize(detachment);
  if (!detachment || !wantedDetachments.has(key)) continue;

  const stratagem = {
    name: cleanDisplayText(row.name || "Stratagem"),
    type: cleanDisplayText(row.type || ""),
    cp: cleanDisplayText(row.cp_cost ? `${row.cp_cost}CP` : ""),
    turn: cleanDisplayText(row.turn || ""),
    phase: cleanDisplayText(row.phase || ""),
    detachment,
    summary: shortSummary(row.description || ""),
    details: detailParts(row.description || ""),
    source: "Wahapedia export",
  };

  if (!stratagems[key]) stratagems[key] = [];
  if (!stratagems[key].some((item) => normalize(item.name) === normalize(stratagem.name))) {
    stratagems[key].push(stratagem);
  }
}

for (const key of Object.keys(stratagems)) {
  stratagems[key].sort((a, b) => Number(a.cp.replace(/\D/g, "") || 0) - Number(b.cp.replace(/\D/g, "") || 0) || a.name.localeCompare(b.name));
}

fs.writeFileSync(outputPath, `${JSON.stringify({ stratagems }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(stratagems).length} detachment stratagem groups to ${path.relative(root, outputPath)}`);

function parsePipeCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split("|").filter(Boolean);
  return lines.map((line) => {
    const columns = line.split("|");
    return Object.fromEntries(headers.map((header, index) => [header, columns[index] || ""]));
  });
}

function detailParts(html) {
  const text = cleanHtmlText(html);
  const labels = ["WHEN", "TARGET", "EFFECT", "RESTRICTIONS"];
  const parts = [];
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:${labels.join("|")}):|$)`, "i"));
    if (match?.[1]) parts.push({ label: titleCase(label), text: cleanDisplayText(match[1]) });
  }
  if (!parts.length && text) parts.push({ label: "Texto", text: cleanDisplayText(text) });
  return parts;
}

function shortSummary(html) {
  const effect = detailParts(html).find((part) => part.label === "Effect")?.text || cleanHtmlText(html);
  return truncate(cleanDisplayText(effect), 180);
}

function cleanHtmlText(value = "") {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\^\^/g, "")
    .replace(/\*\*/g, "")
    .replace(/_/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  return text
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

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}

function normalize(value = "") {
  return cleanDisplayText(value).toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
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
