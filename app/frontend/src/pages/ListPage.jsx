import { useEffect, useMemo, useState } from "react";
import { fetchPhotos } from "../lib/api";
import { streetFromAddress } from "../lib/address";
import { CATEGORY_LABELS, SEVERITY_LABELS } from "../lib/meta";
import PhotoDetailModal from "../components/PhotoDetailModal";
import PhotoBadges from "../components/PhotoBadges";

function formatDate(sqliteDate) {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleString("fr-FR");
}

function groupPhotos(photos, groupBy) {
  if (groupBy === "none") return [{ label: null, items: photos }];

  const map = new Map();
  for (const photo of photos) {
    const label =
      groupBy === "street"
        ? streetFromAddress(photo.addressLabel)
        : photo.addressLabel || "Adresse inconnue";
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(photo);
  }

  return Array.from(map.entries())
    .map(([label, items]) => ({ label, items }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export default function ListPage() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState("address");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  useEffect(() => {
    fetchPhotos()
      .then(setPhotos)
      .catch((err) => setError(err.message));
  }, []);

  function handlePhotoDeleted(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return photos.filter((p) => {
      const matchesQuery =
        !q ||
        (p.addressLabel || "").toLowerCase().includes(q) ||
        (p.uploaderName || "").toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      const matchesSeverity = !severityFilter || p.severity === severityFilter;
      return matchesQuery && matchesCategory && matchesSeverity;
    });
  }, [photos, query, categoryFilter, severityFilter]);

  const groups = useMemo(() => groupPhotos(filtered, groupBy), [filtered, groupBy]);

  return (
    <div className="page list-page">
      <h1>Photos envoyees</h1>

      <input
        type="text"
        className="search-input"
        placeholder="Rechercher par adresse ou par deposant..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="filter-row">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Toutes categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">Toutes gravites</option>
          {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="segmented">
        <button className={groupBy === "address" ? "active" : ""} onClick={() => setGroupBy("address")}>
          Par adresse
        </button>
        <button className={groupBy === "street" ? "active" : ""} onClick={() => setGroupBy("street")}>
          Par rue
        </button>
        <button className={groupBy === "none" ? "active" : ""} onClick={() => setGroupBy("none")}>
          Aucun
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {filtered.length === 0 && !error && <p className="hint">Aucune photo ne correspond.</p>}

      {groups.map((group) => (
        <div key={group.label ?? "all"} className="photo-group">
          {group.label && (
            <h2 className="group-header">
              {group.label} <span className="group-count">({group.items.length})</span>
            </h2>
          )}
          <ul className="photo-list">
            {group.items.map((photo) => (
              <li key={photo.id} className="photo-list-item">
                <img
                  src={`/uploads/${photo.filename}`}
                  alt=""
                  className="thumb"
                  onClick={() => setSelected(photo)}
                />
                <div className="photo-list-info">
                  <PhotoBadges category={photo.category} severity={photo.severity} />
                  <p className="address">{photo.addressLabel || "Adresse inconnue"}</p>
                  <p className="uploader">{photo.uploaderName}</p>
                  <p className="meta">
                    {formatDate(photo.createdAt)} ·{" "}
                    {photo.source === "exif" ? "GPS photo" : "Adresse saisie"}
                    {photo.commentCount > 0 &&
                      ` · ${photo.commentCount} commentaire${photo.commentCount > 1 ? "s" : ""}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

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
