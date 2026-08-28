export const CATEGORIES = [
  { value: "arbre", label: "Arbre tombe" },
  { value: "inondation", label: "Inondation" },
  { value: "toiture", label: "Toiture endommagee" },
  { value: "voirie", label: "Voirie / chaussee" },
  { value: "reseau_electrique", label: "Reseau electrique" },
  { value: "autre", label: "Autre" },
];

export const SEVERITIES = [
  { value: "mineur", label: "Mineur" },
  { value: "majeur", label: "Majeur" },
  { value: "urgent", label: "Urgent" },
];

export const DEFAULT_VISION_MODEL = "google/gemini-2.0-flash-exp:free";

export const SUGGESTED_VISION_MODELS = [
  {
    value: "google/gemini-2.0-flash-exp:free",
    label: "Google Gemini 2.0 Flash (gratuit, recommande)",
  },
  {
    value: "qwen/qwen2.5-vl-72b-instruct:free",
    label: "Qwen 2.5 VL 72B (gratuit)",
  },
  {
    value: "meta-llama/llama-3.2-11b-vision-instruct:free",
    label: "Meta Llama 3.2 11B Vision (gratuit)",
  },
];
