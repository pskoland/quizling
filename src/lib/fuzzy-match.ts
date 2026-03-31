/**
 * Smart fuzzy answer matching for quiz answers.
 * Handles typos, date formats, number words, and case differences.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'januar', '1': 'januar',
  '02': 'februar', '2': 'februar',
  '03': 'mars', '3': 'mars',
  '04': 'april', '4': 'april',
  '05': 'mai', '5': 'mai',
  '06': 'juni', '6': 'juni',
  '07': 'juli', '7': 'juli',
  '08': 'august', '8': 'august',
  '09': 'september', '9': 'september',
  '10': 'oktober',
  '11': 'november',
  '12': 'desember',
};

const NUMBER_WORDS: Record<string, string> = {
  'null': '0', 'en': '1', 'ett': '1', 'to': '2', 'tre': '3',
  'fire': '4', 'fem': '5', 'seks': '6', 'syv': '7', 'sju': '7',
  'åtte': '8', 'atte': '8', 'ni': '9', 'ti': '10',
};

/** Normalize a date-like string to "D. monthname" format */
function normalizeDate(s: string): string | null {
  // Match "DD.MM", "D.MM", "DD/MM", "D/MM"
  const dateMatch = s.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthName = MONTH_NAMES[dateMatch[2]];
    if (monthName) return `${day}. ${monthName}`;
  }
  // Match "D. monthname" or "D monthname"
  const namedMatch = s.match(/^(\d{1,2})\.?\s*([a-zæøå]+)$/i);
  if (namedMatch) {
    const day = parseInt(namedMatch[1]);
    return `${day}. ${namedMatch[2].toLowerCase()}`;
  }
  return null;
}

/** Normalize number words to digits */
function normalizeNumberWord(s: string): string {
  return NUMBER_WORDS[s.toLowerCase()] ?? s;
}

/**
 * Strip common Norwegian suffixes to get a rough word stem.
 * This isn't a full stemmer — just enough to match common
 * answer variants like kondensering/kondensasjon, fordamping/fordampning, etc.
 */
function norwegianStem(s: string): string {
  return s
    .replace(/(ering|asjon|ning|else|ment|itet|inne|skap|ende|inga|sjon|ing|ene|ene|ane|ør|er|en|et|ar)$/, '')
    .replace(/(.)\1$/, '$1'); // collapse trailing double letter
}

/**
 * Check if a player's answer matches the correct answer using fuzzy matching.
 * Returns true if the answers are considered equivalent.
 */
export function isAnswerCorrect(playerAnswer: string | undefined, correctAnswer: string): boolean {
  if (!playerAnswer) return false;

  const pa = playerAnswer.trim().toLowerCase();
  const ca = correctAnswer.trim().toLowerCase();

  // Exact match
  if (pa === ca) return true;

  // Substring match (original behavior)
  if (pa.includes(ca) || ca.includes(pa)) return true;

  // Levenshtein distance for typos (allow up to 2 edits for words > 3 chars)
  const maxDist = Math.min(2, Math.floor(Math.max(pa.length, ca.length) / 3));
  if (levenshtein(pa, ca) <= maxDist) return true;

  // Norwegian stem comparison (e.g. kondensering ≈ kondensasjon)
  if (pa.length >= 5 && ca.length >= 5) {
    const paStem = norwegianStem(pa);
    const caStem = norwegianStem(ca);
    if (paStem.length >= 4 && caStem.length >= 4 && paStem === caStem) return true;
    // Also allow small distance between stems
    if (paStem.length >= 4 && caStem.length >= 4 && levenshtein(paStem, caStem) <= 1) return true;
  }

  // Date normalization
  const paNorm = normalizeDate(pa);
  const caNorm = normalizeDate(ca);
  if (paNorm && caNorm && paNorm === caNorm) return true;
  if (paNorm && paNorm === ca) return true;
  if (caNorm && pa === caNorm) return true;

  // Number word normalization
  const paNum = normalizeNumberWord(pa);
  const caNum = normalizeNumberWord(ca);
  if (paNum === caNum) return true;

  return false;
}
