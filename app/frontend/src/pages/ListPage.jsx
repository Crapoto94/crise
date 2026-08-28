import { useEffect, useState } from "react";
import { fetchPhotos } from "../lib/api";

function formatDate(sqliteDate) {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleString("fr-FR");
}

export default function ListPage() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetchPhotos()
      .then(setPhotos)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page list-page">
      <h1>Photos envoyees</h1>
      {error && <p className="error-text">{error}</p>}
      {photos.length === 0 && !error && <p className="hint">Aucune photo pour le moment.</p>}

      <ul className="photo-list">
        {photos.map((photo) => (
          <li key={photo.id} className="photo-list-item">
            <img
              src={`/uploads/${photo.filename}`}
              alt=""
              className="thumb"
              onClick={() => setLightbox(photo)}
            />
            <div className="photo-list-info">
              <p className="address">{photo.addressLabel || "Adresse inconnue"}</p>
              <p className="uploader">{photo.uploaderName}</p>
              <p className="meta">
                {formatDate(photo.createdAt)} · {photo.source === "exif" ? "GPS photo" : "Adresse saisie"}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <img src={`/uploads/${lightbox.filename}`} alt="" />
            <p>
              <strong>{lightbox.uploaderName}</strong> — {lightbox.addressLabel || "Adresse inconnue"}
            </p>
            <button onClick={() => setLightbox(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
