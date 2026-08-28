import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchPhotos } from "../lib/api";
import PhotoDetailModal from "../components/PhotoDetailModal";

const IVRY_CENTER = [48.8137, 2.3868];

function thumbnailIcon(filename) {
  return L.divIcon({
    className: "photo-marker",
    html: `<img src="/uploads/${filename}" alt="" />`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

export default function MapPage() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchPhotos()
      .then(setPhotos)
      .catch((err) => setError(err.message));
  }, []);

  function handlePhotoDeleted(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
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
          {photos.map((photo) => (
            <Marker key={photo.id} position={[photo.lat, photo.lon]} icon={thumbnailIcon(photo.filename)}>
              <Popup>
                <img src={`/uploads/${photo.filename}`} alt="" className="popup-photo" />
                <p>
                  <strong>{photo.uploaderName}</strong>
                </p>
                <p>{photo.addressLabel || "Adresse inconnue"}</p>
                <p className="popup-date">
                  {new Date(photo.createdAt.replace(" ", "T") + "Z").toLocaleString("fr-FR")}
                </p>
                <button className="link-btn" onClick={() => setSelected(photo)}>
                  Voir / commenter{photo.commentCount > 0 ? ` (${photo.commentCount})` : ""}
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

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
