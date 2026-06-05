import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist", "web");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "pwa.js",
  "sw.js",
  "manifest.webmanifest",
  "INSTALAR.md",
];

const directories = [
  "assets",
  "data",
];

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });

for (const file of files) {
  await copyFile(file);
}

for (const directory of directories) {
  await copyDirectory(directory);
}

console.log(`Prepared web bundle in ${path.relative(root, output)}`);

async function copyFile(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(output, relativePath);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function copyDirectory(relativePath) {
  const from = path.join(root, relativePath);
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) await copyDirectory(child);
    else await copyFile(child);
  }
}
