import { useEffect, useState } from "react";
import { fetchComments, addComment, deletePhoto, deleteComment } from "../lib/api";
import { getDeviceId, getUploaderName } from "../lib/device";
import { useAdmin } from "../lib/AdminContext";
import PhotoBadges from "./PhotoBadges";

function formatDate(sqliteDate) {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleString("fr-FR");
}

export default function PhotoDetailModal({ photo, onClose, onPhotoDeleted }) {
  const { isAdmin, password } = useAdmin();
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setLoadingComments(true);
    fetchComments(photo.id)
      .then(setComments)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingComments(false));
  }, [photo.id]);

  async function handleAddComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    try {
      const comment = await addComment(photo.id, {
        authorName: getUploaderName(),
        deviceId: getDeviceId(),
        text,
      });
      setComments((prev) => [...prev, comment]);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(id) {
    try {
      await deleteComment(id, password);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeletePhoto() {
    if (!confirm("Supprimer definitivement cette photo et ses commentaires ?")) return;
    setDeleting(true);
    try {
      await deletePhoto(photo.id, password);
      onPhotoDeleted?.(photo.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-card" onClick={(e) => e.stopPropagation()}>
        <img
          src={`/uploads/${photo.filename}`}
          alt=""
          className="detail-photo zoomable"
          onClick={() => setZoomed(true)}
        />
        <div className="detail-info">
          <PhotoBadges
            category={photo.category}
            severity={photo.severity}
            voirie={photo.voirie}
            quartier={photo.quartier}
          />
          <p className="address">{photo.addressLabel || "Adresse inconnue"}</p>
          <p className="meta">
            {photo.uploaderName} · {formatDate(photo.createdAt)}
          </p>
          {photo.description && <p className="description-text">{photo.description}</p>}
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="comments-section">
          <h3>Commentaires</h3>
          {loadingComments && <p className="hint">Chargement...</p>}
          {!loadingComments && comments.length === 0 && (
            <p className="hint">Aucun commentaire pour le moment.</p>
          )}
          <ul className="comments-list">
            {comments.map((c) => (
              <li key={c.id} className="comment-item">
                <div>
                  <p className="comment-text">{c.text}</p>
                  <p className="meta">
                    {c.authorName} · {formatDate(c.createdAt)}
                  </p>
                </div>
                {isAdmin && (
                  <button className="link-btn danger" onClick={() => handleDeleteComment(c.id)}>
                    Supprimer
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              placeholder="Ajouter un commentaire..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" disabled={posting || !text.trim()}>
              Envoyer
            </button>
          </form>
        </div>

        <div className="detail-actions">
          {isAdmin && (
            <button className="danger-btn" onClick={handleDeletePhoto} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer la photo"}
            </button>
          )}
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>

      {zoomed && (
        <div
          className="zoom-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(false);
          }}
        >
          <img src={`/uploads/${photo.filename}`} alt="" />
        </div>
      )}
    </div>
  );
}
