import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "sites.json");

let sites = [];
try {
  sites = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
} catch {
  sites = [];
}

export function getSites() {
  return sites;
}
