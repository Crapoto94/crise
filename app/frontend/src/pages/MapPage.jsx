import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchPhotos, fetchQuartiersGeoJson } from "../lib/api";
import { computeClusters } from "../lib/cluster";
import PhotoDetailModal from "../components/PhotoDetailModal";
import PhotoGroupModal from "../components/PhotoGroupModal";

const IVRY_CENTER = [48.8137, 2.3868];
const MARKER_SIZE = 44;
const MARKER_ANCHOR = MARKER_SIZE / 2;

// Grand rectangle englobant largement l'Ile-de-France, utilise comme
// contour exterieur du masque (les quartiers sont decoupes dedans en trous).
const OUTER_RING = [
  [-1, 47.5],
  [4, 47.5],
  [4, 49.5],
  [-1, 49.5],
  [-1, 47.5],
];

function buildMaskFeature(quartiersGeoJson) {
  if (!quartiersGeoJson) return null;
  const holes = quartiersGeoJson.features
    .map((f) => f.geometry?.coordinates?.[0])
    .filter(Boolean);
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [OUTER_RING, ...holes] },
  };
}

const maskStyle = { fillColor: "#1c1e21", fillOpacity: 0.45, stroke: false };
const quartierStyle = { color: "#2563eb", weight: 1.5, fillOpacity: 0, dashArray: "4 4" };

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildClusterIcon(photos) {
  const mainAuthor = photos[0].uploaderName;
  const initialsBadge = `<span class="initials-badge">${getInitials(mainAuthor)}</span>`;
  const totalComments = photos.reduce((sum, p) => sum + (p.commentCount || 0), 0);
  const commentBadge =
    totalComments > 0 ? `<span class="comment-badge">${totalComments}</span>` : "";

  if (photos.length === 1) {
    return L.divIcon({
      className: "photo-marker-wrapper",
      html: `
        <div class="photo-marker"><img src="/uploads/${photos[0].filename}" alt="" /></div>
        ${initialsBadge}
        ${commentBadge}
      `,
      iconSize: [MARKER_SIZE, MARKER_SIZE],
      iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
    });
  }

  const previewCount = Math.min(photos.length, 4);
  const imgs = photos
    .slice(0, previewCount)
    .map((p) => `<img src="/uploads/${p.filename}" alt="" />`)
    .join("");

  return L.divIcon({
    className: "photo-cluster-wrapper",
    html: `
      <div class="photo-cluster collage-${previewCount}">${imgs}</div>
      ${initialsBadge}
      ${commentBadge}
      <span class="cluster-badge">${photos.length}</span>
    `,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
  });
}

function ClusterMarkers({ photos, onOpenPhoto, onOpenGroup }) {
  const map = useMap();
  const [tick, setTick] = useState(0);

  useMapEvents({
    zoomend: () => setTick((t) => t + 1),
    moveend: () => setTick((t) => t + 1),
  });

  const clusters = useMemo(() => computeClusters(map, photos), [map, photos, tick]);

  return clusters.map((cluster) => (
    <Marker
      key={cluster.id}
      position={[cluster.lat, cluster.lon]}
      icon={buildClusterIcon(cluster.photos)}
      eventHandlers={{
        click: () => {
          if (cluster.photos.length === 1) {
            onOpenPhoto(cluster.photos[0]);
          } else {
            onOpenGroup(cluster.photos);
          }
        },
      }}
    />
  ));
}

export default function MapPage() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [group, setGroup] = useState(null);
  const [quartiersGeoJson, setQuartiersGeoJson] = useState(null);

  useEffect(() => {
    fetchPhotos()
      .then(setPhotos)
      .catch((err) => setError(err.message));
    fetchQuartiersGeoJson()
      .then(setQuartiersGeoJson)
      .catch(() => {});
  }, []);

  const maskFeature = useMemo(() => buildMaskFeature(quartiersGeoJson), [quartiersGeoJson]);

  function handlePhotoDeleted(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setGroup((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
  }

  return (
    <div className="page map-page">
      <h1>Carte des photos</h1>
      {error && <p className="error-text">{error}</p>}
      <div className="map-wrapper">
        <MapContainer center={IVRY_CENTER} zoom={15} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {maskFeature && <GeoJSON data={maskFeature} style={maskStyle} interactive={false} />}
          {quartiersGeoJson && <GeoJSON data={quartiersGeoJson} style={quartierStyle} />}
          <ClusterMarkers
            photos={photos}
            onOpenPhoto={setSelected}
            onOpenGroup={setGroup}
          />
        </MapContainer>
      </div>

      {group && (
        <PhotoGroupModal
          photos={group}
          onClose={() => setGroup(null)}
          onSelectPhoto={(photo) => {
            setGroup(null);
            setSelected(photo);
          }}
        />
      )}

      {selected && (
        <PhotoDetailModal
          photo={selected}
          onClose={() => setSelected(null)}
          onPhotoDeleted={handlePhotoDeleted}
        />
      )}
    </div>
  );
}
