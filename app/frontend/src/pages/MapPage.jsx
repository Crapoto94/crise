import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchPhotos } from "../lib/api";
import { computeClusters } from "../lib/cluster";
import PhotoDetailModal from "../components/PhotoDetailModal";
import PhotoGroupModal from "../components/PhotoGroupModal";

const IVRY_CENTER = [48.8137, 2.3868];

function buildClusterIcon(photos) {
  if (photos.length === 1) {
    return L.divIcon({
      className: "photo-marker",
      html: `<img src="/uploads/${photos[0].filename}" alt="" />`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
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
      <span class="cluster-badge">${photos.length}</span>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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

  useEffect(() => {
    fetchPhotos()
      .then(setPhotos)
      .catch((err) => setError(err.message));
  }, []);

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
