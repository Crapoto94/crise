import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchPhotos, fetchQuartiersGeoJson, fetchSites } from "../lib/api";
import { computeClusters } from "../lib/cluster";
import {
  SITE_CATEGORIES,
  OTHER_SITE_CATEGORY,
  resolveSiteCategory,
  legendCategoryKey,
  DEFAULT_VISIBLE_CATEGORIES,
} from "../lib/siteCategories";
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

  const countBadge =
    photos.length > 1 ? `<span class="cluster-badge">${photos.length}</span>` : "";

  return L.divIcon({
    className: "photo-marker-wrapper",
    html: `
      <div class="photo-marker"><img src="/uploads/${photos[0].filename}" alt="" /></div>
      ${initialsBadge}
      ${commentBadge}
      ${countBadge}
    `,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
  });
}

const SITE_ICON_SIZE = 22;

const SITE_ICON_SIZE_LARGE = 34;

function buildSiteIcon(category, large) {
  const meta = resolveSiteCategory(category);
  const size = large ? SITE_ICON_SIZE_LARGE : SITE_ICON_SIZE;
  const glyphSize = large ? 20 : 13;
  return L.divIcon({
    className: large ? "site-marker site-marker-large" : "site-marker",
    html: `<div class="site-marker-dot" style="background:${meta.color}"><svg viewBox="0 0 16 16" width="${glyphSize}" height="${glyphSize}" fill="#fff">${meta.icon}</svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const siteIconCache = new Map();
function getSiteIcon(category, large) {
  const key = `${category}:${large ? "l" : "s"}`;
  if (!siteIconCache.has(key)) siteIconCache.set(key, buildSiteIcon(category, large));
  return siteIconCache.get(key);
}

function SiteMarkers({ sites, visibleCategories }) {
  return sites
    .filter((s) => visibleCategories.has(legendCategoryKey(s.category)))
    .map((s) => (
      <Marker
        key={s.code}
        position={[s.lat, s.lon]}
        icon={getSiteIcon(s.category, s.large)}
        zIndexOffset={s.large ? -900 : -1000}
      >
        <Tooltip>{s.name}</Tooltip>
      </Marker>
    ));
}

function SiteLegend({ visibleCategories, onToggle }) {
  const items = [...SITE_CATEGORIES, OTHER_SITE_CATEGORY];
  return (
    <div className="site-legend">
      {items.map((c) => (
        <button
          key={c.value}
          type="button"
          className={"legend-chip" + (visibleCategories.has(c.value) ? " active" : "")}
          style={visibleCategories.has(c.value) ? { borderColor: c.color, color: c.color } : undefined}
          onClick={() => onToggle(c.value)}
        >
          <span className="legend-dot" style={{ background: c.color }} />
          {c.label}
        </button>
      ))}
    </div>
  );
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
      zIndexOffset={1000}
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
  const [sites, setSites] = useState([]);
  const [visibleCategories, setVisibleCategories] = useState(DEFAULT_VISIBLE_CATEGORIES);

  useEffect(() => {
    fetchPhotos()
      .then(setPhotos)
      .catch((err) => setError(err.message));
    fetchQuartiersGeoJson()
      .then(setQuartiersGeoJson)
      .catch(() => {});
    fetchSites()
      .then(setSites)
      .catch(() => {});
  }, []);

  function toggleCategory(value) {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

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
          <SiteMarkers sites={sites} visibleCategories={visibleCategories} />
          <ClusterMarkers
            photos={photos}
            onOpenPhoto={setSelected}
            onOpenGroup={setGroup}
          />
        </MapContainer>
      </div>

      <SiteLegend visibleCategories={visibleCategories} onToggle={toggleCategory} />

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
