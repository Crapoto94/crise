import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import exifr from "exifr";

import { db } from "./db.js";
import { reverseGeocode, IVRY_CITYCODE } from "./geocode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2508";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

function requireAdmin(req, res, next) {
  if (req.header("x-admin-password") !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe admin invalide" });
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

const selectAllStmt = db.prepare(`
  SELECT p.id, p.filename, p.uploader_name AS uploaderName, p.device_id AS deviceId, p.lat, p.lon,
         p.address_label AS addressLabel, p.source, p.created_at AS createdAt,
         (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) AS commentCount
  FROM photos p
  ORDER BY p.created_at DESC
`);
const insertStmt = db.prepare(
  `INSERT INTO photos (filename, uploader_name, device_id, lat, lon, address_label, source)
   VALUES (@filename, @uploaderName, @deviceId, @lat, @lon, @addressLabel, @source)`
);
const selectOneStmt = db.prepare(
  "SELECT id, filename, uploader_name AS uploaderName, device_id AS deviceId, lat, lon, address_label AS addressLabel, source, created_at AS createdAt FROM photos WHERE id = ?"
);
const deletePhotoStmt = db.prepare("DELETE FROM photos WHERE id = ?");

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

app.get("/api/photos", (_req, res) => {
  res.json(selectAllStmt.all());
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

app.post("/api/photos/:id/comments", (req, res) => {
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

app.post("/api/photos", upload.single("photo"), async (req, res) => {
  try {
    const { uploaderName, deviceId, addressLabel, lat: manualLat, lon: manualLon, citycode } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ error: "Photo manquante" });
    }
    if (!uploaderName || !deviceId) {
      return res.status(400).json({ error: "uploaderName et deviceId requis" });
    }

    const filePath = path.join(uploadsDir, req.file.filename);
    let lat = null;
    let lon = null;
    let source = null;
    let label = null;

    const gps = await exifr.gps(filePath).catch(() => null);

    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      lat = gps.latitude;
      lon = gps.longitude;
      source = "exif";
      label = await reverseGeocode(lat, lon);
    } else {
      const parsedLat = Number(manualLat);
      const parsedLon = Number(manualLon);
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon) || !addressLabel) {
        return res.status(400).json({
          error: "Aucune position GPS dans la photo : adresse (lat/lon/addressLabel) requise",
        });
      }
      if (citycode && citycode !== IVRY_CITYCODE) {
        return res.status(400).json({ error: "L'adresse doit se situer a Ivry-sur-Seine" });
      }
      lat = parsedLat;
      lon = parsedLon;
      source = "manual";
      label = addressLabel;
    }

    const info = insertStmt.run({
      filename: req.file.filename,
      uploaderName,
      deviceId,
      lat,
      lon,
      addressLabel: label,
      source,
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
