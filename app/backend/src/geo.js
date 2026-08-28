import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const geoDir = path.join(__dirname, "..", "GeoJson");

function loadGeometry(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data.features?.[0]?.geometry ?? null;
  } catch {
    return null;
  }
}

function loadDir(dirPath) {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".geojson"))
      .map((f) => loadGeometry(path.join(dirPath, f)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

const QUARTIER_LABELS = {
  Centre_ville_WGS84: "Centre-ville",
  Ivry_Port_WGS84: "Ivry Port",
  L_Bertrand_Mirabeau_WGS84: "Louis Bertrand - Mirabeau",
  Marat_Parmentier_WGS84: "Marat - Parmentier",
  Monmousseau_Verollot_WGS84: "Monmousseau - Verollot",
  Petit_Ivry_WGS84: "Petit-Ivry",
};

const departementalePolygon = loadGeometry(
  path.join(geoDir, "Ivry_routes_departementales_WGS84_v2.geojson")
);
const privateVoiesPolygons = loadDir(path.join(geoDir, "Voies privées"));

const quartierDir = path.join(geoDir, "Quartiers");
let quartiers = [];
try {
  quartiers = fs
    .readdirSync(quartierDir)
    .filter((f) => f.endsWith(".geojson"))
    .map((f) => {
      const base = f.replace(/\.geojson$/, "");
      return {
        name: QUARTIER_LABELS[base] || base,
        geometry: loadGeometry(path.join(quartierDir, f)),
      };
    })
    .filter((q) => q.geometry);
} catch {
  quartiers = [];
}

function isInGeometry(pt, geometry) {
  if (!geometry) return false;
  try {
    return booleanPointInPolygon(pt, geometry);
  } catch {
    return false;
  }
}

export function getVoirieStatus(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const pt = turfPoint([lon, lat]);

  if (isInGeometry(pt, departementalePolygon)) return "departementale";
  if (privateVoiesPolygons.some((geom) => isInGeometry(pt, geom))) return "privee";
  return "vc";
}

export function getQuartier(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const pt = turfPoint([lon, lat]);
  const match = quartiers.find((q) => isInGeometry(pt, q.geometry));
  return match ? match.name : null;
}

export function listQuartiers() {
  return quartiers.map((q) => q.name);
}

export function getQuartiersGeoJson() {
  return {
    type: "FeatureCollection",
    features: quartiers.map((q) => ({
      type: "Feature",
      properties: { name: q.name },
      geometry: q.geometry,
    })),
  };
}
