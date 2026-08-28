export const IVRY_CITYCODE = "94041";

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0]?.properties?.label ?? null;
  } catch {
    return null;
  }
}
