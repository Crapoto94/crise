export const CATEGORIES = [
  { value: "arbre", label: "Arbre tombe" },
  { value: "inondation", label: "Inondation" },
  { value: "toiture", label: "Toiture endommagee" },
  { value: "voirie", label: "Voirie / chaussee" },
  { value: "reseau_electrique", label: "Reseau electrique" },
  { value: "vehicule", label: "Vehicule" },
  { value: "autre", label: "Autre" },
];

export const SEVERITIES = [
  { value: "mineur", label: "Mineur" },
  { value: "majeur", label: "Majeur" },
  { value: "urgent", label: "Urgent" },
];

// Liste verifiee via https://openrouter.ai/api/v1/models le 2026-08-28.
// Les modeles gratuits d'OpenRouter changent souvent de disponibilite :
// si la classification echoue, changer de modele dans /admin > Reglages.
export const DEFAULT_VISION_MODEL = "minimax/minimax-m3:free";

export const SUGGESTED_VISION_MODELS = [
  {
    value: "minimax/minimax-m3:free",
    label: "MiniMax M3 (gratuit, recommande)",
  },
  {
    value: "google/gemma-4-31b-it:free",
    label: "Google Gemma 4 31B (gratuit)",
  },
  {
    value: "google/gemma-4-26b-a4b-it:free",
    label: "Google Gemma 4 26B (gratuit, plus rapide)",
  },
  {
    value: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    label: "Nvidia Nemotron Nano Omni 30B (gratuit)",
  },
];
