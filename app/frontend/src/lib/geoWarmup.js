let watchId = null;
let bestPosition = null;

export function startGeoWarmup() {
  if (watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = pos;
      }
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 }
  );
}

export function getBestWarmPosition(maxAgeMs = 30000) {
  if (!bestPosition) return null;
  if (Date.now() - bestPosition.timestamp > maxAgeMs) return null;
  return bestPosition;
}

export function stopGeoWarmup() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/**
 * Attend la meilleure position possible pendant `timeoutMs`, en continuant a ecouter
 * meme apres une premiere lecture pour laisser le temps au GPS satellite de s'accrocher
 * (une position 4G/reseau arrive vite mais est peu precise ; le GPS met plus de temps
 * mais est bien plus precis). S'arrete des qu'une precision GPS typique est atteinte.
 */
export function getBestLocation(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalisation non supportee"));
      return;
    }

    const warm = getBestWarmPosition();
    let best = warm || null;

    if (warm && warm.coords.accuracy <= 20) {
      resolve({ lat: warm.coords.latitude, lon: warm.coords.longitude, accuracy: warm.coords.accuracy });
      return;
    }

    let settled = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (!settled && pos.coords.accuracy <= 20) {
          settled = true;
          navigator.geolocation.clearWatch(id);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
        }
      },
      () => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(id);
        if (best) {
          resolve({ lat: best.coords.latitude, lon: best.coords.longitude, accuracy: best.coords.accuracy });
        } else {
          reject(new Error("Position indisponible"));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );

    setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(id);
      if (best) {
        resolve({ lat: best.coords.latitude, lon: best.coords.longitude, accuracy: best.coords.accuracy });
      } else {
        reject(new Error("Position indisponible"));
      }
    }, timeoutMs);
  });
}
