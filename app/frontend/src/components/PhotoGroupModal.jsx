function formatDate(sqliteDate) {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleString("fr-FR");
}

export default function PhotoGroupModal({ photos, onClose, onSelectPhoto }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="group-title">{photos.length} photos a cet endroit</h2>
        <div className="group-grid">
          {photos.map((photo) => (
            <button key={photo.id} className="group-thumb" onClick={() => onSelectPhoto(photo)}>
              <img src={photo.thumbnailUrl || `/uploads/${photo.filename}`} alt="" />
              <span className="group-thumb-caption">
                {photo.uploaderName} · {formatDate(photo.createdAt)}
              </span>
            </button>
          ))}
        </div>
        <div className="detail-actions">
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
