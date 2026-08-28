import { useEffect, useRef, useState } from "react";
import exifr from "exifr";
import { uploadPhoto, searchIvryAddress, fetchMeta, classifyPhoto } from "../lib/api";
import { getDeviceId, getUploaderName } from "../lib/device";

export default function UploadPage() {
  const [meta, setMeta] = useState({ categories: [], severities: [] });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [checkingExif, setCheckingExif] = useState(false);
  const [gps, setGps] = useState(null); // { lat, lon } | null
  const [hasGps, setHasGps] = useState(null); // null = pas encore verifie

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [searching, setSearching] = useState(false);

  const [category, setCategory] = useState(null);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [severity, setSeverity] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const debounceRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError("");
    setSuccess("");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setSelectedAddress(null);
    setAddressQuery("");
    setSuggestions([]);
    setHasGps(null);
    setGps(null);
    setCategory(null);
    setSeverity(null);
    setCheckingExif(true);
    setSuggestingCategory(true);

    exifr
      .gps(selected)
      .then((location) => {
        if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
          setGps({ lat: location.latitude, lon: location.longitude });
          setHasGps(true);
        } else {
          setHasGps(false);
        }
      })
      .catch(() => setHasGps(false))
      .finally(() => setCheckingExif(false));

    classifyPhoto(selected)
      .then((res) => {
        if (res.category) setCategory(res.category);
      })
      .finally(() => setSuggestingCategory(false));
  }

  function handleAddressQueryChange(value) {
    setAddressQuery(value);
    setSelectedAddress(null);
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

  function resetForm() {
    setFile(null);
    setPreviewUrl(null);
    setHasGps(null);
    setGps(null);
    setAddressQuery("");
    setSuggestions([]);
    setSelectedAddress(null);
    setCategory(null);
    setSeverity(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("photo", file);
    formData.append("uploaderName", getUploaderName());
    formData.append("deviceId", getDeviceId());
    if (category) formData.append("category", category);
    if (severity) formData.append("severity", severity);

    if (!hasGps) {
      if (!selectedAddress) {
        setError("Choisissez une adresse dans la liste proposee.");
        return;
      }
      formData.append("addressLabel", selectedAddress.label);
      formData.append("lat", selectedAddress.lat);
      formData.append("lon", selectedAddress.lon);
      formData.append("citycode", selectedAddress.citycode);
    }

    setUploading(true);
    try {
      await uploadPhoto(formData);
      setSuccess("Photo envoyee !");
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const readyToSubmit = file && !checkingExif && (hasGps || selectedAddress) && category && severity;

  return (
    <div className="page upload-page">
      <h1>Envoyer une photo</h1>

      <label className="file-drop">
        {previewUrl ? (
          <img src={previewUrl} alt="Apercu" className="file-preview" />
        ) : (
          <span>Prendre ou choisir une photo</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          hidden
        />
      </label>

      {checkingExif && <p className="hint">Lecture des donnees GPS de la photo...</p>}

      {hasGps === true && gps && (
        <p className="hint success-hint">
          Position GPS trouvee dans la photo ({gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}) — pas
          besoin de saisir une adresse.
        </p>
      )}

      {hasGps === false && (
        <div className="address-form">
          <p className="hint">
            Pas de position GPS dans cette photo. Indiquez l'adresse a Ivry-sur-Seine.
          </p>
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddress(s);
                      setAddressQuery(s.label);
                      setSuggestions([]);
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedAddress && (
            <p className="hint success-hint">Adresse retenue : {selectedAddress.label}</p>
          )}
        </div>
      )}

      {file && (
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
                  className={"chip" + (category === c.value ? " active" : "")}
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
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
        </>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={!readyToSubmit || uploading}
      >
        {uploading ? "Envoi en cours..." : "Envoyer la photo"}
      </button>
    </div>
  );
}
