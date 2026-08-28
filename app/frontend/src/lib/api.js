const IVRY_CITYCODE = "94041";

export async function fetchPhotos() {
  const res = await fetch("/api/photos");
  if (!res.ok) throw new Error("Erreur de chargement des photos");
  return res.json();
}

export async function uploadPhoto(formData) {
  const res = await fetch("/api/photos", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload");
  return data;
}

export async function fetchComments(photoId) {
  const res = await fetch(`/api/photos/${photoId}/comments`);
  if (!res.ok) throw new Error("Erreur de chargement des commentaires");
  return res.json();
}

export async function addComment(photoId, { authorName, deviceId, text }) {
  const res = await fetch(`/api/photos/${photoId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorName, deviceId, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur lors de l'ajout du commentaire");
  return data;
}

export async function verifyAdminPassword(password) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function deletePhoto(photoId, adminPassword) {
  const res = await fetch(`/api/photos/${photoId}`, {
    method: "DELETE",
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la suppression");
  }
}

export async function deleteComment(commentId, adminPassword) {
  const res = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { "x-admin-password": adminPassword },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la suppression");
  }
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
