import { useEffect, useMemo, useRef, useState } from "react";
import exifr from "exifr";
import { uploadPhoto, searchIvryAddress, fetchMeta, classifyPhoto, locateGps, fetchSites } from "../lib/api";
import { getDeviceId, getUploaderName } from "../lib/device";
import { nearestSites } from "../lib/geoDistance";
import AddressConfirmMap from "../components/AddressConfirmMap";

export default function UploadPage() {
  const [meta, setMeta] = useState({ categories: [], severities: [] });
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [checkingExif, setCheckingExif] = useState(false);

  // mode: idle | manual_search | confirming | confirmed
  const [mode, setMode] = useState("idle");
  const [confirmSeed, setConfirmSeed] = useState(null); // seed passe a AddressConfirmMap
  const [confirmed, setConfirmed] = useState(null); // position + adresse validees

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const [category, setCategory] = useState(null);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [severity, setSeverity] = useState("mineur");
  const [description, setDescription] = useState("");
  const [sites, setSites] = useState([]);
  const [relatedSite, setRelatedSite] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const debounceRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => {});
    fetchSites()
      .then(setSites)
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalisation non supportee"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  async function seedConfirmFromLocation(lat, lon, source) {
    try {
      const result = await locateGps(lat, lon);
      setConfirmSeed({ lat, lon, addressLabel: result.addressLabel, inIvry: result.inIvry, source });
    } catch {
      setConfirmSeed({ lat, lon, addressLabel: null, inIvry: true, source });
    }
    setMode("confirming");
  }

  async function handleFileChange(e, isLiveCapture) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    setError("");
    setSuccess("");
    setFiles(selected);
    setPreviewUrls(selected.map((f) => URL.createObjectURL(f)));
    setAddressQuery("");
    setSuggestions([]);
    setConfirmSeed(null);
    setConfirmed(null);
    setMode("idle");
    setCategory(null);
    setShowCustomCategory(false);
    setCustomCategoryText("");
    setSeverity("mineur");
    setDescription("");
    setRelatedSite(null);
    setCheckingExif(true);
    setSuggestingCategory(true);

    const primary = selected[0];

    exifr
      .gps(primary)
      .then(async (location) => {
        const lat = location?.latitude;
        const lon = location?.longitude;
        const isNullIsland = lat === 0 && lon === 0;

        if (location && Number.isFinite(lat) && Number.isFinite(lon) && !isNullIsland) {
          return seedConfirmFromLocation(lat, lon, "exif");
        }

        if (!isLiveCapture) {
          // Photo(s) choisie(s) dans la galerie sans EXIF exploitable : on ne doit surtout pas
          // utiliser la position actuelle de l'appareil, elle n'a aucun rapport avec la photo.
          setMode("manual_search");
          return;
        }

        // Prise en direct sans EXIF (frequent avec la capture caméra du navigateur) :
        // on tente la position live de l'appareil avant de demander une saisie manuelle.
        try {
          const geo = await getBrowserLocation();
          return seedConfirmFromLocation(geo.lat, geo.lon, "manual");
        } catch {
          setMode("manual_search");
        }
      })
      .catch(() => setMode("manual_search"))
      .finally(() => setCheckingExif(false));

    classifyPhoto(primary)
      .then((res) => {
        if (res.category) setCategory(res.category);
      })
      .finally(() => setSuggestingCategory(false));
  }

  function handleAddressQueryChange(value) {
    setAddressQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchIvryAddress(value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  async function handleSelectSuggestion(s) {
    setAddressQuery(s.label);
    setSuggestions([]);
    await seedConfirmFromLocation(s.lat, s.lon, "manual");
  }

  function resetForm() {
    setFiles([]);
    setPreviewUrls([]);
    setMode("idle");
    setConfirmSeed(null);
    setConfirmed(null);
    setAddressQuery("");
    setSuggestions([]);
    setCategory(null);
    setShowCustomCategory(false);
    setCustomCategoryText("");
    setSeverity("mineur");
    setDescription("");
    setRelatedSite(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function handleCategoryChipClick(value) {
    if (value === "autre") {
      setShowCustomCategory(true);
      setCategory(customCategoryText.trim() || null);
    } else {
      setShowCustomCategory(false);
      setCustomCategoryText("");
      setCategory(value);
    }
  }

  function handleCustomCategoryChange(value) {
    setCustomCategoryText(value);
    setCategory(value.trim() || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!files.length || !confirmed) return;
    setError("");
    setSuccess("");
    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("photo", files[i]);
        formData.append("uploaderName", getUploaderName());
        formData.append("deviceId", getDeviceId());
        if (category) formData.append("category", category);
        if (severity) formData.append("severity", severity);
        formData.append("lat", confirmed.lat);
        formData.append("lon", confirmed.lon);
        formData.append("addressLabel", confirmed.addressLabel || "");
        formData.append("source", confirmed.source);
        if (description.trim()) formData.append("description", description.trim());
        if (relatedSite) formData.append("relatedSite", relatedSite);

        await uploadPhoto(formData);
        setUploadProgress(i + 1);
      }
      setSuccess(files.length > 1 ? `${files.length} photos envoyees !` : "Photo envoyee !");
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const nearbySites = useMemo(() => {
    if (!confirmed || sites.length === 0) return [];
    return nearestSites(sites, confirmed.lat, confirmed.lon, 3);
  }, [confirmed, sites]);

  const readyToSubmit = files.length > 0 && mode === "confirmed" && confirmed && category && severity;

  return (
    <div className="page upload-page">
      <h1>Envoyer une photo</h1>

      {previewUrls.length > 0 && (
        <div className="file-preview-grid">
          {previewUrls.map((url, i) => (
            <img key={i} src={url} alt="Apercu" className="file-preview-thumb" />
          ))}
        </div>
      )}

      <div className="file-choice-row">
        <label className="file-choice-btn">
          Prendre une photo
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e, true)}
            hidden
          />
        </label>
        <label className="file-choice-btn">
          Choisir dans la galerie
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e, false)}
            hidden
          />
        </label>
      </div>

      {files.length > 1 && (
        <p className="hint">
          {files.length} photos selectionnees — meme adresse, categorie et gravite appliquees a
          toutes.
        </p>
      )}

      {checkingExif && <p className="hint">Recherche de la position (photo puis appareil)...</p>}

      {mode === "confirming" && confirmSeed && (
        <AddressConfirmMap
          {...confirmSeed}
          onConfirm={(result) => {
            setConfirmed(result);
            setMode("confirmed");
          }}
          onCancel={() => {
            setConfirmSeed(null);
            setMode("manual_search");
          }}
        />
      )}

      {mode === "manual_search" && (
        <div className="address-form">
          <p className="hint">Indiquez l'adresse a Ivry-sur-Seine.</p>
          <input
            type="text"
            placeholder="Rechercher une adresse a Ivry-sur-Seine..."
            value={addressQuery}
            onChange={(e) => handleAddressQueryChange(e.target.value)}
          />
          {searching && <p className="hint">Recherche...</p>}
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button type="button" onClick={() => handleSelectSuggestion(s)}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "confirmed" && confirmed && (
        <p className="hint success-hint">
          Position confirmee : {confirmed.addressLabel || "adresse inconnue"}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setConfirmSeed(confirmed);
              setMode("confirming");
            }}
          >
            Modifier
          </button>
        </p>
      )}

      {files.length > 0 && mode === "confirmed" && (
        <>
          <div className="field-block">
            <p className="field-label">
              Categorie du degat{" "}
              {suggestingCategory && <span className="hint">(analyse de la photo...)</span>}
            </p>
            <div className="chip-group">
              {meta.categories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={
                    "chip" +
                    ((c.value === "autre" ? showCustomCategory : !showCustomCategory && category === c.value)
                      ? " active"
                      : "")
                  }
                  onClick={() => handleCategoryChipClick(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {showCustomCategory && (
              <input
                type="text"
                className="custom-category-input"
                placeholder="Precisez la categorie..."
                value={customCategoryText}
                onChange={(e) => handleCustomCategoryChange(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div className="field-block">
            <p className="field-label">Gravite</p>
            <div className="chip-group">
              {meta.severities.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={"chip severity-" + s.value + (severity === s.value ? " active" : "")}
                  onClick={() => setSeverity(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-block">
            <p className="field-label">Description (optionnel)</p>
            <textarea
              className="description-input"
              placeholder="Precisez la situation, un detail utile..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          {nearbySites.length > 0 && (
            <div className="field-block">
              <p className="field-label">Cette photo concerne-t-elle un site de la ville ?</p>
              <div className="chip-group">
                {nearbySites.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    className={"chip" + (relatedSite === s.name ? " active" : "")}
                    onClick={() => setRelatedSite(s.name)}
                  >
                    {s.name} ({Math.round(s.distance)} m)
                  </button>
                ))}
                <button
                  type="button"
                  className={"chip" + (relatedSite === null ? " active" : "")}
                  onClick={() => setRelatedSite(null)}
                >
                  Aucun
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={!readyToSubmit || uploading}
      >
        {uploading
          ? `Envoi ${uploadProgress}/${files.length}...`
          : files.length > 1
            ? `Envoyer ${files.length} photos`
            : "Envoyer la photo"}
      </button>
    </div>
  );
}
