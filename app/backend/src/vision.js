import { CATEGORIES, DEFAULT_VISION_MODEL } from "./constants.js";
import { getSetting } from "./settings.js";

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

export async function classifyDamage(buffer, mimeType) {
  const apiKey = getSetting("openrouter_api_key");
  if (!apiKey) return null;

  const model = getSetting("vision_model", DEFAULT_VISION_MODEL);
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Classe ce degat de tempete dans une seule de ces categories: ${CATEGORY_VALUES.join(
                  ", "
                )}. Reponds uniquement avec un JSON de la forme {"category":"..."}. Si aucune categorie ne correspond clairement, utilise "autre".`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[^}]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return CATEGORY_VALUES.includes(parsed.category) ? parsed.category : null;
  } catch {
    return null;
  }
}
