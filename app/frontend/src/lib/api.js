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
