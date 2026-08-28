import { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { locateGps } from "../lib/api";

const confirmIcon = L.divIcon({
  className: "confirm-marker",
  html: `<div class="confirm-marker-dot"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function AddressConfirmMap({ lat, lon, addressLabel, inIvry, source, onConfirm, onCancel }) {
  const [position, setPosition] = useState([lat, lon]);
  const [label, setLabel] = useState(addressLabel);
  const [ivry, setIvry] = useState(inIvry);
  const [loading, setLoading] = useState(false);

  async function handleDragEnd(e) {
    const latlng = e.target.getLatLng();
    setPosition([latlng.lat, latlng.lng]);
    setLoading(true);
    try {
      const result = await locateGps(latlng.lat, latlng.lng);
      setLabel(result.addressLabel);
      setIvry(result.inIvry);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="detail-card" onClick={(e) => e.stopPropagation()}>
        <h2>Confirmer la position</h2>
        <p className="hint">
          Deplacez le repere si besoin pour ajuster la position exacte de la photo.
        </p>

        <div className="confirm-map-wrapper">
          <MapContainer
            center={position}
            zoom={17}
            scrollWheelZoom={false}
            style={{ height: "220px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={position}
              icon={confirmIcon}
              draggable
              eventHandlers={{ dragend: handleDragEnd }}
            />
          </MapContainer>
        </div>

        {loading && <p className="hint">Recherche de l'adresse...</p>}
        {!loading && (
          <p className={ivry ? "hint success-hint" : "error-text"}>
            {label || "Adresse inconnue"}
            {!ivry && " — hors Ivry-sur-Seine"}
          </p>
        )}

        <div className="detail-actions">
          <button className="secondary-btn" onClick={onCancel}>
            Choisir une autre adresse
          </button>
          <button
            onClick={() =>
              onConfirm({ lat: position[0], lon: position[1], addressLabel: label, inIvry: ivry, source })
            }
            disabled={loading}
          >
            Confirmer cette position
          </button>
        </div>
      </div>
    </div>
  );
}
