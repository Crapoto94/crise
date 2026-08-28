import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "photos.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    uploader_name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    address_label TEXT,
    source TEXT NOT NULL CHECK (source IN ('exif', 'manual')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
