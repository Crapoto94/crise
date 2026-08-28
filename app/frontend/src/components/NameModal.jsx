import { useState } from "react";

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  function handleSubmit(e) {
    e.preventDefault();
    if (trimmed.length < 2) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={handleSubmit}>
        <h2>Qui etes-vous ?</h2>
        <p>Ce nom sera associe aux photos envoyees depuis cet appareil.</p>
        <input
          type="text"
          placeholder="Prenom Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={trimmed.length < 2}>
          Valider
        </button>
      </form>
    </div>
  );
}
