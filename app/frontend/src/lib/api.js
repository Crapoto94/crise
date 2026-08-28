import { getDeviceId, getUploaderName } from "./device";

const IVRY_CITYCODE = "94041";

function deviceHeaders() {
  return {
    "X-Device-Id": getDeviceId(),
    "X-Uploader-Name": encodeURIComponent(getUploaderName() || ""),
  };
}

export async function locateGps(lat, lon) {
  const res = await fetch("/api/geo/locate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({ lat, lon }),
  });
  if (!res.ok) throw new Error("Erreur de localisation");
  return res.json();
}

export async function fetchQuartiersGeoJson() {
  const res = await fetch("/api/geo/quartiers", { headers: deviceHeaders() });
  if (!res.ok) throw new Error("Erreur de chargement des quartiers");
  return res.json();
}

export async function fetchMeta() {
  const res = await fetch("/api/meta", { headers: deviceHeaders() });
  if (!res.ok) throw new Error("Erreur de chargement des categories");
  return res.json();
}

export async function classifyPhoto(file) {
  const formData = new FormData();
  formData.append("photo", file);
  const res = await fetch("/api/classify", {
    method: "POST",
    headers: deviceHeaders(),
    body: formData,
  });
  if (!res.ok) return { category: null };
  return res.json();
}

export async function fetchPhotos() {
  const res = await fetch("/api/photos", { headers: deviceHeaders() });
  if (!res.ok) throw new Error("Erreur de chargement des photos");
  return res.json();
}

export async function uploadPhoto(formData) {
  const res = await fetch("/api/photos", {
    method: "POST",
    headers: deviceHeaders(),
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload");
  return data;
}

export async function fetchComments(photoId) {
  const res = await fetch(`/api/photos/${photoId}/comments`, { headers: deviceHeaders() });
  if (!res.ok) throw new Error("Erreur de chargement des commentaires");
  return res.json();
}

export async function addComment(photoId, { authorName, deviceId, text }) {
  const res = await fetch(`/api/photos/${photoId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({ authorName, deviceId, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur lors de l'ajout du commentaire");
  return data;
}

export async function verifyAdminPassword(password) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...deviceHeaders() },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function deletePhoto(photoId, adminPassword) {
  const res = await fetch(`/api/photos/${photoId}`, {
    method: "DELETE",
    headers: { "x-admin-password": adminPassword, ...deviceHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la suppression");
  }
}

export async function deleteComment(commentId, adminPassword) {
  const res = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { "x-admin-password": adminPassword, ...deviceHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la suppression");
  }
}

export async function fetchAdminSettings(adminPassword) {
  const res = await fetch("/api/admin/settings", {
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) throw new Error("Erreur de chargement des reglages");
  return res.json();
}

export async function saveAdminSettings(adminPassword, payload) {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": adminPassword },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de l'enregistrement");
  }
  return res.json();
}

export async function fetchLogs(adminPassword, limit = 200) {
  const res = await fetch(`/api/admin/logs?limit=${limit}`, {
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) throw new Error("Erreur de chargement du journal");
  return res.json();
}

export async function fetchBans(adminPassword) {
  const res = await fetch("/api/admin/bans", {
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) throw new Error("Erreur de chargement des appareils bannis");
  return res.json();
}

export async function banDevice(deviceId, reason, adminPassword) {
  const res = await fetch("/api/admin/bans", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": adminPassword },
    body: JSON.stringify({ deviceId, reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors du bannissement");
  }
}

export async function unbanDevice(deviceId, adminPassword) {
  const res = await fetch(`/api/admin/bans/${deviceId}`, {
    method: "DELETE",
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) throw new Error("Erreur lors du debannissement");
}

export async function searchIvryAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    query
  )}&citycode=${IVRY_CITYCODE}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur de recherche d'adresse");
  const data = await res.json();
  return data.features.map((f) => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    citycode: f.properties.citycode,
  }));
}
