import { useEffect, useState } from "react";
import {
  fetchLogs,
  fetchBans,
  banDevice,
  unbanDevice,
  fetchAdminSettings,
  saveAdminSettings,
} from "../lib/api";
import { useAdmin } from "../lib/AdminContext";

function formatDate(sqliteDate) {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleString("fr-FR");
}

function LogsTab({ password }) {
  const [logs, setLogs] = useState([]);
  const [bans, setBans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchLogs(password), fetchBans(password)])
      .then(([logsData, bansData]) => {
        setLogs(logsData);
        setBans(bansData);
      })
      .catch((err) => setError(err.message));
  }, [password]);

  async function handleBan(deviceId) {
    const reason = window.prompt("Raison du bannissement (optionnel) :") || "";
    try {
      await banDevice(deviceId, reason, password);
      setBans((prev) => [{ deviceId, reason, bannedAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUnban(deviceId) {
    try {
      await unbanDevice(deviceId, password);
      setBans((prev) => prev.filter((b) => b.deviceId !== deviceId));
    } catch (err) {
      setError(err.message);
    }
  }

  const bannedIds = new Set(bans.map((b) => b.deviceId));

  return (
    <>
      {error && <p className="error-text">{error}</p>}

      <h2 className="group-header">Appareils bannis</h2>
      {bans.length === 0 && <p className="hint">Aucun appareil banni.</p>}
      <ul className="log-list">
        {bans.map((b) => (
          <li key={b.deviceId} className="log-item">
            <div>
              <p className="log-device">{b.deviceId}</p>
              <p className="meta">
                {b.reason || "Sans raison"} · {formatDate(b.bannedAt)}
              </p>
            </div>
            <button className="link-btn" onClick={() => handleUnban(b.deviceId)}>
              Debannir
            </button>
          </li>
        ))}
      </ul>

      <h2 className="group-header">Dernieres connexions</h2>
      <ul className="log-list">
        {logs.map((log) => (
          <li key={log.id} className="log-item">
            <div>
              <p className="log-device">
                {log.uploaderName ? decodeURIComponent(log.uploaderName) : "Anonyme"} ·{" "}
                {log.deviceId ? log.deviceId.slice(0, 8) : "?"}
              </p>
              <p className="meta">
                {log.method} {log.path} · {log.ip} · {formatDate(log.createdAt)}
              </p>
            </div>
            {log.deviceId && !bannedIds.has(log.deviceId) && (
              <button className="link-btn danger" onClick={() => handleBan(log.deviceId)}>
                Bannir
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function SettingsTab({ password }) {
  const [settings, setSettings] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdminSettings(password)
      .then((data) => {
        setSettings(data);
        setModel(data.visionModel);
      })
      .catch((err) => setError(err.message));
  }, [password]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveAdminSettings(password, { openrouterApiKey: apiKey, visionModel: model });
      setSuccess("Reglages enregistres.");
      setApiKey("");
      const data = await fetchAdminSettings(password);
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearKey() {
    if (!confirm("Supprimer la cle OpenRouter enregistree ?")) return;
    try {
      await saveAdminSettings(password, { clearOpenrouterKey: true });
      const data = await fetchAdminSettings(password);
      setSettings(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) return <p className="hint">Chargement...</p>;

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <h2 className="group-header">Reconnaissance d'image (OpenRouter)</h2>
      <p className="hint">
        {settings.openrouterKeySet
          ? `Cle configuree (${settings.openrouterKeyPreview}).`
          : "Aucune cle configuree — la categorie devra etre choisie manuellement."}
      </p>

      <label className="field-label">Cle API OpenRouter</label>
      <input
        type="password"
        placeholder={settings.openrouterKeySet ? "Laisser vide pour ne pas changer" : "sk-or-..."}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />

      <label className="field-label">Modele de vision</label>
      <select value={model} onChange={(e) => setModel(e.target.value)}>
        {settings.suggestedModels.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <div className="detail-actions">
        {settings.openrouterKeySet && (
          <button type="button" className="danger-btn" onClick={handleClearKey}>
            Supprimer la cle
          </button>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const { isAdmin, password } = useAdmin();
  const [tab, setTab] = useState("logs");

  if (!isAdmin) {
    return (
      <div className="page">
        <h1>Administration</h1>
        <p className="hint">Reserve aux administrateurs — connectez-vous via le bouton "Admin".</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Administration</h1>
      <div className="segmented">
        <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>
          Journal
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          Reglages
        </button>
      </div>

      {tab === "logs" ? <LogsTab password={password} /> : <SettingsTab password={password} />}
    </div>
  );
}
