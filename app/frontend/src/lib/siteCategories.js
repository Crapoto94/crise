const ICONS = {
  administratif:
    '<path d="M8 1.5L14 5.5H2L8 1.5Z"/><rect x="2.5" y="6" width="1.5" height="6.5"/><rect x="5.2" y="6" width="1.5" height="6.5"/><rect x="9.3" y="6" width="1.5" height="6.5"/><rect x="12" y="6" width="1.5" height="6.5"/><rect x="1.5" y="13" width="13" height="1.3"/>',
  culturel:
    '<path d="M8 3.3C6.3 2.2 3.5 2.1 2 2.8V12.6C3.5 12 6.3 12.1 8 13.2C9.7 12.1 12.5 12 14 12.6V2.8C12.5 2.1 9.7 2.2 8 3.3Z"/><rect x="7.4" y="3.3" width="1.2" height="9.6" fill="#000" opacity="0.3"/>',
  technique:
    '<path d="M12.6 2.4a2.8 2.8 0 00-3.6 3.6L3.4 11.6l1 1 5.6-5.6a2.8 2.8 0 003.6-3.6l-1.4 1.4-1-1 1.4-1.4Z"/>',
  foyer: '<path d="M8 1.5L1.5 7.2V14h4.2V9.3h4.6V14h4.2V7.2L8 1.5Z"/>',
  centre_de_vacances:
    '<path d="M8 2.3L2 13.5h3l3-6.8 3 6.8h3L8 2.3Z"/><rect x="7.4" y="2.3" width="1.2" height="11.2"/>',
  cite: '<rect x="3" y="1.8" width="10" height="12.2"/><rect x="5" y="3.8" width="1.8" height="1.8" fill="#000" opacity="0.3"/><rect x="9.2" y="3.8" width="1.8" height="1.8" fill="#000" opacity="0.3"/><rect x="5" y="7" width="1.8" height="1.8" fill="#000" opacity="0.3"/><rect x="9.2" y="7" width="1.8" height="1.8" fill="#000" opacity="0.3"/><rect x="5" y="10.2" width="1.8" height="1.8" fill="#000" opacity="0.3"/><rect x="9.2" y="10.2" width="1.8" height="1.8" fill="#000" opacity="0.3"/>',
  petite_enfance:
    '<rect x="6" y="1.5" width="4" height="2.6" rx="0.8"/><path d="M6 4.5H10L10.8 12.5A1.8 1.8 0 019 14.3H7A1.8 1.8 0 015.2 12.5L6 4.5Z"/>',
  scolaire:
    '<path d="M8 2.5L1.2 6L8 9.5L14.8 6L8 2.5Z"/><path d="M4 7.6V10.8C4 11.9 5.8 12.9 8 12.9S12 11.9 12 10.8V7.6L8 9.6L4 7.6Z"/>',
  sante: '<rect x="6.6" y="1.8" width="2.8" height="12.4"/><rect x="1.8" y="6.6" width="12.4" height="2.8"/>',
  social:
    '<path d="M8 13.2S2 9.6 2 5.9C2 3.9 3.6 2.3 5.6 2.3C6.9 2.3 8 3 8 3S9.1 2.3 10.4 2.3C12.4 2.3 14 3.9 14 5.9C14 9.6 8 13.2 8 13.2Z"/>',
  cimetiere: '<rect x="7.1" y="1.6" width="1.8" height="12.4"/><rect x="4" y="5.6" width="8" height="1.8"/>',
  espaces_verts:
    '<path d="M13.2 2.8C8.4 2.6 3.4 5.2 3.1 10C3 11.4 3.6 12.6 3.6 12.6S9.2 11.9 11 7.8C11.9 5.8 13 4.6 13.2 2.8Z"/>',
};

const DEFAULT_ICON = '<circle cx="8" cy="8" r="4.2"/>';

export const SITE_CATEGORIES = [
  { value: "administratif", label: "Administratif", color: "#2563eb", icon: ICONS.administratif },
  { value: "culturel", label: "Culturel", color: "#9333ea", icon: ICONS.culturel },
  { value: "technique", label: "Technique", color: "#6b7280", icon: ICONS.technique },
  { value: "foyer", label: "Foyer", color: "#d97706", icon: ICONS.foyer },
  { value: "centre_de_vacances", label: "Centre de vacances", color: "#059669", icon: ICONS.centre_de_vacances },
  { value: "cite", label: "Cite", color: "#0891b2", icon: ICONS.cite },
  { value: "petite_enfance", label: "Petite enfance", color: "#ec4899", icon: ICONS.petite_enfance },
  { value: "scolaire", label: "Scolaire", color: "#4f46e5", icon: ICONS.scolaire },
  { value: "sante", label: "Sante", color: "#dc2626", icon: ICONS.sante },
  { value: "social", label: "Social", color: "#ea580c", icon: ICONS.social },
  { value: "cimetiere", label: "Cimetiere", color: "#44403c", icon: ICONS.cimetiere },
  { value: "espaces_verts", label: "Espaces verts", color: "#16a34a", icon: ICONS.espaces_verts },
];

export const OTHER_SITE_CATEGORY = {
  value: "__autres__",
  label: "Autres sites",
  color: "#9ca3af",
  icon: DEFAULT_ICON,
};

const KNOWN_VALUES = new Set(SITE_CATEGORIES.map((c) => c.value));

export function resolveSiteCategory(value) {
  return SITE_CATEGORIES.find((c) => c.value === value) || OTHER_SITE_CATEGORY;
}

export function legendCategoryKey(value) {
  return KNOWN_VALUES.has(value) ? value : OTHER_SITE_CATEGORY.value;
}

export const DEFAULT_VISIBLE_CATEGORIES = new Set(SITE_CATEGORIES.map((c) => c.value));
