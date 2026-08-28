import { db } from "./db.js";

const getStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
const setStmt = db.prepare(
  "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
);
const deleteStmt = db.prepare("DELETE FROM settings WHERE key = ?");

export function getSetting(key, fallback = null) {
  const row = getStmt.get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  if (value === null || value === undefined || value === "") {
    deleteStmt.run(key);
  } else {
    setStmt.run(key, value);
  }
}
