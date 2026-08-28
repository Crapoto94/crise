import { CATEGORY_LABELS, SEVERITY_LABELS, VOIRIE_LABELS } from "../lib/meta";

function voirieLabel(voirie) {
  if (!voirie) return null;
  if (voirie.statutCategory === "departementale") return voirie.rdCode || "Departementale";
  return VOIRIE_LABELS[voirie.statutCategory] || voirie.statutRaw || null;
}

export default function PhotoBadges({ category, severity, voirie, quartier }) {
  const voirieText = voirieLabel(voirie);
  if (!category && !severity && !voirieText && !quartier) return null;
  return (
    <div className="badge-row">
      {severity && (
        <span className={`badge severity-${severity}`}>{SEVERITY_LABELS[severity] || severity}</span>
      )}
      {category && <span className="badge category-badge">{CATEGORY_LABELS[category] || category}</span>}
      {voirieText && (
        <span className={`badge voirie-badge voirie-${voirie.statutCategory}`} title={voirie.fullName}>
          {voirieText}
        </span>
      )}
      {quartier && <span className="badge category-badge">{quartier}</span>}
    </div>
  );
}
