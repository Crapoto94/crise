import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "voiries.json");

const MATCH_THRESHOLD = 0.72;

function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(s) {
  return stripAccents(String(s).toLowerCase())
    .replace(/[''-]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function streetFromAddress(label) {
  if (!label) return null;
  let s = label.replace(/\s+\d{5}\s+.+$/, "").trim();
  s = s.replace(/^\d+\s*(bis|ter|quater)?\s*/i, "").trim();
  return s || null;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

let voiries = [];
try {
  const raw = fs.readFileSync(dataPath, "utf-8");
  voiries = JSON.parse(raw).map((v) => ({ ...v, normalized: normalize(v.fullName) }));
} catch {
  voiries = [];
}

export function matchVoirie(addressLabel) {
  const street = streetFromAddress(addressLabel);
  if (!street) return null;
  const normalizedStreet = normalize(street);
  if (!normalizedStreet) return null;

  const exact = voiries.find((v) => v.normalized === normalizedStreet);
  if (exact) {
    return {
      codeRivoli: exact.codeRivoli,
      fullName: exact.fullName,
      statutRaw: exact.statutRaw,
      statutCategory: exact.statutCategory,
      rdCode: exact.rdCode,
      score: 1,
    };
  }

  let best = null;
  let bestScore = 0;
  for (const v of voiries) {
    const score = similarity(normalizedStreet, v.normalized);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  if (best && bestScore >= MATCH_THRESHOLD) {
    return {
      codeRivoli: best.codeRivoli,
      fullName: best.fullName,
      statutRaw: best.statutRaw,
      statutCategory: best.statutCategory,
      rdCode: best.rdCode,
      score: Math.round(bestScore * 100) / 100,
    };
  }

  return null;
}
