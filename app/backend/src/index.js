import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { db } from "./db.js";
import { reverseGeocode } from "./geocode.js";
import { CATEGORIES, SEVERITIES, DEFAULT_VISION_MODEL, SUGGESTED_VISION_MODELS } from "./constants.js";
import { getSetting, setSetting } from "./settings.js";
import { classifyDamage } from "./vision.js";
import { matchVoirie } from "./voirie.js";
import { getVoirieStatus, getQuartier, getQuartiersGeoJson } from "./geo.js";
import { getSites } from "./sites.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2508";
const SEVERITY_VALUES = SEVERITIES.map((s) => s.value);

function sanitizeCategory(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 60);
  return trimmed || null;
}

function sanitizeDescription(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 1000);
  return trimmed || null;
}

const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

function requireAdmin(req, res, next) {
  if (req.header("x-admin-password") !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe admin invalide" });
  }
  next();
}

const insertLogStmt = db.prepare(
  `INSERT INTO access_logs (device_id, uploader_name, ip, user_agent, method, path)
   VALUES (@deviceId, @uploaderName, @ip, @userAgent, @method, @path)`
);

app.use((req, _res, next) => {
  if (req.path.startsWith("/api/") && !req.path.startsWith("/api/admin")) {
    let uploaderName = null;
    try {
      uploaderName = decodeURIComponent(req.header("x-uploader-name") || "") || null;
    } catch {
      uploaderName = null;
    }
    insertLogStmt.run({
      deviceId: req.header("x-device-id") || null,
      uploaderName,
      ip: req.ip,
      userAgent: req.header("user-agent") || null,
      method: req.method,
      path: req.path,
    });
  }
  next();
});

const isBannedStmt = db.prepare("SELECT 1 FROM banned_devices WHERE device_id = ?");

function checkNotBanned(req, res, next) {
  const deviceId = (req.body && req.body.deviceId) || req.header("x-device-id");
  if (deviceId && isBannedStmt.get(deviceId)) {
    if (req.file) fs.unlink(path.join(uploadsDir, req.file.filename), () => {});
    return res.status(403).json({ error: "Cet appareil a ete banni" });
  }
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Le fichier doit etre une image"));
    }
    cb(null, true);
  },
});
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const selectAllStmt = db.prepare(`
  SELECT p.id, p.filename, p.uploader_name AS uploaderName, p.device_id AS deviceId, p.lat, p.lon,
         p.address_label AS addressLabel, p.source, p.category, p.severity, p.quartier, p.description,
         p.related_site AS relatedSite, p.created_at AS createdAt,
         (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) AS commentCount
  FROM photos p
  ORDER BY p.created_at DESC
`);
const insertStmt = db.prepare(
  `INSERT INTO photos (filename, uploader_name, device_id, lat, lon, address_label, source, category, severity, quartier, description, related_site)
   VALUES (@filename, @uploaderName, @deviceId, @lat, @lon, @addressLabel, @source, @category, @severity, @quartier, @description, @relatedSite)`
);
const selectOneStmt = db.prepare(
  "SELECT id, filename, uploader_name AS uploaderName, device_id AS deviceId, lat, lon, address_label AS addressLabel, source, category, severity, quartier, description, related_site AS relatedSite, created_at AS createdAt FROM photos WHERE id = ?"
);
const deletePhotoStmt = db.prepare("DELETE FROM photos WHERE id = ?");
const selectPhotosMissingQuartierStmt = db.prepare(
  "SELECT id, lat, lon FROM photos WHERE quartier IS NULL"
);
const updateQuartierStmt = db.prepare("UPDATE photos SET quartier = ? WHERE id = ?");

for (const row of selectPhotosMissingQuartierStmt.all()) {
  const quartier = getQuartier(row.lat, row.lon);
  if (quartier) updateQuartierStmt.run(quartier, row.id);
}

const selectCommentsStmt = db.prepare(
  "SELECT id, photo_id AS photoId, author_name AS authorName, device_id AS deviceId, text, created_at AS createdAt FROM comments WHERE photo_id = ? ORDER BY created_at ASC"
);
const insertCommentStmt = db.prepare(
  `INSERT INTO comments (photo_id, author_name, device_id, text) VALUES (@photoId, @authorName, @deviceId, @text)`
);
const selectCommentStmt = db.prepare(
  "SELECT id, photo_id AS photoId, author_name AS authorName, device_id AS deviceId, text, created_at AS createdAt FROM comments WHERE id = ?"
);
const deleteCommentStmt = db.prepare("DELETE FROM comments WHERE id = ?");

const selectLogsStmt = db.prepare(
  "SELECT id, device_id AS deviceId, uploader_name AS uploaderName, ip, user_agent AS userAgent, method, path, created_at AS createdAt FROM access_logs ORDER BY created_at DESC LIMIT ?"
);
const selectBansStmt = db.prepare(
  "SELECT device_id AS deviceId, reason, banned_at AS bannedAt FROM banned_devices ORDER BY banned_at DESC"
);
const insertBanStmt = db.prepare(
  "INSERT INTO banned_devices (device_id, reason) VALUES (@deviceId, @reason) ON CONFLICT(device_id) DO UPDATE SET reason = excluded.reason, banned_at = datetime('now')"
);
const deleteBanStmt = db.prepare("DELETE FROM banned_devices WHERE device_id = ?");

const selectDistinctCategoriesStmt = db.prepare(
  "SELECT DISTINCT category FROM photos WHERE category IS NOT NULL"
);

app.get("/api/meta", (_req, res) => {
  const knownValues = new Set(CATEGORIES.map((c) => c.value));
  const customCategories = selectDistinctCategoriesStmt
    .all()
    .map((r) => r.category)
    .filter((value) => value && !knownValues.has(value))
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((value) => ({ value, label: value }));

  res.json({ categories: [...CATEGORIES, ...customCategories], severities: SEVERITIES });
});

app.get("/api/geo/quartiers", (_req, res) => {
  res.json(getQuartiersGeoJson());
});

app.get("/api/sites", (_req, res) => {
  res.json(getSites());
});

app.post("/api/geo/locate", async (req, res) => {
  const lat = Number(req.body?.lat);
  const lon = Number(req.body?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "lat/lon requis" });
  }
  const quartier = getQuartier(lat, lon);
  const addressLabel = await reverseGeocode(lat, lon);
  res.json({ inIvry: Boolean(quartier), quartier, addressLabel });
});

function buildVoirie(photo) {
  const statutCategory = getVoirieStatus(photo.lat, photo.lon);
  if (!statutCategory) return null;
  const textMatch = matchVoirie(photo.addressLabel);
  return {
    statutCategory,
    rdCode: statutCategory === "departementale" ? textMatch?.rdCode ?? null : null,
    codeRivoli: textMatch?.codeRivoli ?? null,
    fullName: textMatch?.fullName ?? null,
    source: "geo",
  };
}

app.get("/api/photos", (_req, res) => {
  const photos = selectAllStmt.all().map((p) => ({
    ...p,
    voirie: buildVoirie(p),
  }));
  res.json(photos);
});

app.delete("/api/photos/:id", requireAdmin, (req, res) => {
  const photo = selectOneStmt.get(req.params.id);
  if (!photo) return res.status(404).json({ error: "Photo introuvable" });

  deletePhotoStmt.run(req.params.id);
  fs.unlink(path.join(uploadsDir, photo.filename), () => {});
  res.status(204).end();
});

app.get("/api/photos/:id/comments", (req, res) => {
  res.json(selectCommentsStmt.all(req.params.id));
});

app.post("/api/photos/:id/comments", checkNotBanned, (req, res) => {
  const photo = selectOneStmt.get(req.params.id);
  if (!photo) return res.status(404).json({ error: "Photo introuvable" });

  const { authorName, deviceId, text } = req.body || {};
  if (!authorName || !deviceId || !text || !text.trim()) {
    return res.status(400).json({ error: "authorName, deviceId et text requis" });
  }

  const info = insertCommentStmt.run({
    photoId: req.params.id,
    authorName,
    deviceId,
    text: text.trim(),
  });
  res.status(201).json(selectCommentStmt.get(info.lastInsertRowid));
});

app.delete("/api/comments/:id", requireAdmin, (req, res) => {
  const comment = selectCommentStmt.get(req.params.id);
  if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

  deleteCommentStmt.run(req.params.id);
  res.status(204).end();
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  res.json({ ok: true });
});

app.get("/api/admin/settings", requireAdmin, (_req, res) => {
  const key = getSetting("openrouter_api_key");
  res.json({
    openrouterKeySet: Boolean(key),
    openrouterKeyPreview: key ? `...${key.slice(-4)}` : null,
    visionModel: getSetting("vision_model", DEFAULT_VISION_MODEL),
    suggestedModels: SUGGESTED_VISION_MODELS,
  });
});

app.post("/api/admin/settings", requireAdmin, (req, res) => {
  const { openrouterApiKey, visionModel, clearOpenrouterKey } = req.body || {};
  if (clearOpenrouterKey) setSetting("openrouter_api_key", null);
  else if (typeof openrouterApiKey === "string" && openrouterApiKey.trim()) {
    setSetting("openrouter_api_key", openrouterApiKey.trim());
  }
  if (typeof visionModel === "string" && visionModel.trim()) {
    setSetting("vision_model", visionModel.trim());
  }
  res.json({ ok: true });
});

app.get("/api/admin/logs", requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  res.json(selectLogsStmt.all(limit));
});

app.get("/api/admin/bans", requireAdmin, (_req, res) => {
  res.json(selectBansStmt.all());
});

app.post("/api/admin/bans", requireAdmin, (req, res) => {
  const { deviceId, reason } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "deviceId requis" });
  insertBanStmt.run({ deviceId, reason: reason || null });
  res.status(201).json({ ok: true });
});

app.delete("/api/admin/bans/:deviceId", requireAdmin, (req, res) => {
  deleteBanStmt.run(req.params.deviceId);
  res.status(204).end();
});

app.post("/api/classify", uploadMemory.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Photo manquante" });
  const category = await classifyDamage(req.file.buffer, req.file.mimetype);
  res.json({ category });
});

app.post("/api/photos", upload.single("photo"), checkNotBanned, async (req, res) => {
  try {
    const {
      uploaderName,
      deviceId,
      addressLabel,
      lat,
      lon,
      source,
      category,
      severity,
      description,
      relatedSite,
    } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ error: "Photo manquante" });
    }
    if (!uploaderName || !deviceId) {
      return res.status(400).json({ error: "uploaderName et deviceId requis" });
    }

    const parsedLat = Number(lat);
    const parsedLon = Number(lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon) || !addressLabel) {
      return res.status(400).json({ error: "Position et adresse confirmees requises" });
    }

    // Les photos prises en portrait sur mobile stockent souvent les pixels en paysage
    // avec un tag EXIF d'orientation : on applique la rotation une fois pour toutes ici,
    // pour un rendu correct partout (miniatures, carte, zoom) quel que soit le navigateur.
    const filePath = path.join(uploadsDir, req.file.filename);
    try {
      const rotated = await sharp(filePath).rotate().toBuffer();
      await fs.promises.writeFile(filePath, rotated);
    } catch (err) {
      console.error("Normalisation orientation photo echouee:", err);
    }

    const info = insertStmt.run({
      filename: req.file.filename,
      uploaderName,
      deviceId,
      lat: parsedLat,
      lon: parsedLon,
      addressLabel,
      source: source === "exif" ? "exif" : "manual",
      category: sanitizeCategory(category),
      severity: SEVERITY_VALUES.includes(severity) ? severity : null,
      quartier: getQuartier(parsedLat, parsedLon),
      description: sanitizeDescription(description),
      relatedSite: sanitizeDescription(relatedSite),
    });

    res.status(201).json(selectOneStmt.get(info.lastInsertRowid));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de l'upload" });
  }
});

const PORT = process.env.PORT || 4010;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend photos Ivry-sur-Seine sur http://localhost:${PORT}`);
});
