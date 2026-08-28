import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../lib/AdminContext";

export default function AdminBar() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const ok = await login(password);
    if (ok) {
      setShowLogin(false);
      setPassword("");
    } else {
      setError("Mot de passe incorrect");
    }
  }

  return (
    <header className="app-header">
      <div className="app-brand">
        <img src="/logo.jpg" alt="" className="app-logo" />
        <span className="app-title">Photos Ivry-sur-Seine</span>
      </div>
      <div className="header-actions">
        {isAdmin ? (
          <>
            <Link to="/admin" className="admin-toggle">
              Administration
            </Link>
            <button className="admin-toggle admin-active" onClick={logout}>
              Deconnexion
            </button>
          </>
        ) : (
          <button className="admin-toggle" onClick={() => setShowLogin(true)}>
            Admin
          </button>
        )}
      </div>

      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>Acces admin</h2>
            <input
              type="password"
              inputMode="numeric"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
            <button type="submit">Valider</button>
          </form>
        </div>
      )}
    </header>
  );
}
