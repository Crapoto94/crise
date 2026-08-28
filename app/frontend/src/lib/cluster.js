const PIXEL_THRESHOLD = 36;

export function computeClusters(map, photos) {
  if (!photos.length) return [];
  const zoom = map.getZoom();

  const addressMap = new Map();
  for (const p of photos) {
    const key = `${p.lat.toFixed(5)}_${p.lon.toFixed(5)}`;
    if (!addressMap.has(key)) addressMap.set(key, []);
    addressMap.get(key).push(p);
  }

  const groups = Array.from(addressMap.values()).map((groupPhotos) => ({
    lat: groupPhotos[0].lat,
    lon: groupPhotos[0].lon,
    photos: groupPhotos,
    point: map.project([groupPhotos[0].lat, groupPhotos[0].lon], zoom),
  }));

  const used = new Array(groups.length).fill(false);
  const clusters = [];

  for (let i = 0; i < groups.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const members = [groups[i]];
    for (let j = i + 1; j < groups.length; j++) {
      if (used[j]) continue;
      const dx = groups[j].point.x - groups[i].point.x;
      const dy = groups[j].point.y - groups[i].point.y;
      if (Math.sqrt(dx * dx + dy * dy) < PIXEL_THRESHOLD) {
        used[j] = true;
        members.push(groups[j]);
      }
    }

    const allPhotos = members
      .flatMap((m) => m.photos)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const biggest = members.reduce((a, b) => (b.photos.length > a.photos.length ? b : a));

    clusters.push({
      id: allPhotos.map((p) => p.id).sort((a, b) => a - b).join("-"),
      lat: biggest.lat,
      lon: biggest.lon,
      photos: allPhotos,
    });
  }

  return clusters;
}
