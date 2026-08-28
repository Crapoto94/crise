export function streetFromAddress(label) {
  if (!label) return "Adresse inconnue";
  let s = label.replace(/\s+\d{5}\s+.+$/, "").trim();
  s = s.replace(/^\d+\s*(bis|ter|quater)?\s*/i, "").trim();
  return s || label;
}
