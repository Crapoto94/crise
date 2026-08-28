import { CATEGORY_LABELS, SEVERITY_LABELS } from "../lib/meta";

export default function PhotoBadges({ category, severity }) {
  if (!category && !severity) return null;
  return (
    <div className="badge-row">
      {severity && (
        <span className={`badge severity-${severity}`}>{SEVERITY_LABELS[severity] || severity}</span>
      )}
      {category && <span className="badge category-badge">{CATEGORY_LABELS[category] || category}</span>}
    </div>
  );
}
