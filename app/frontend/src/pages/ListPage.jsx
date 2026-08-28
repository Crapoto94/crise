import { useEffect, useState } from "react";
import { fetchPhotos } from "../lib/api";
import PhotoDetailModal from "../components/PhotoDetailModal";

function formatDate(sqliteDate) {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleString("fr-FR");
}

export default function ListPage() {
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
              onClick={() => setSelected(photo)}
            />
            <div className="photo-list-info">
              <p className="address">{photo.addressLabel || "Adresse inconnue"}</p>
              <p className="uploader">{photo.uploaderName}</p>
              <p className="meta">
                {formatDate(photo.createdAt)} · {photo.source === "exif" ? "GPS photo" : "Adresse saisie"}
                {photo.commentCount > 0 && ` · ${photo.commentCount} commentaire${photo.commentCount > 1 ? "s" : ""}`}
              </p>
            </div>
          </li>
        ))}
      </ul>

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
