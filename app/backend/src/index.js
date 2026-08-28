import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import exifr from "exifr";

import { db } from "./db.js";
import { reverseGeocode, IVRY_CITYCODE } from "./geocode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

const app = express();
app.use(cors());
app.use("/uploads", express.static(uploadsDir));

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

const selectAllStmt = db.prepare(
  "SELECT id, filename, uploader_name AS uploaderName, device_id AS deviceId, lat, lon, address_label AS addressLabel, source, created_at AS createdAt FROM photos ORDER BY created_at DESC"
);
const insertStmt = db.prepare(
  `INSERT INTO photos (filename, uploader_name, device_id, lat, lon, address_label, source)
   VALUES (@filename, @uploaderName, @deviceId, @lat, @lon, @addressLabel, @source)`
);
const selectOneStmt = db.prepare(
  "SELECT id, filename, uploader_name AS uploaderName, device_id AS deviceId, lat, lon, address_label AS addressLabel, source, created_at AS createdAt FROM photos WHERE id = ?"
);

app.get("/api/photos", (_req, res) => {
  res.json(selectAllStmt.all());
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
