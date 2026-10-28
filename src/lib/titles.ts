import titlesData from './titles.json';

export interface Title {
  /** As shown in Suggestions and recorded as a Guess. */
  title: string;
  /** Normalized, for matching. */
  key: string;
}

/**
 * A title reduced to what a player means by it: case, accents, apostrophes,
 * punctuation and a leading "The", "A" or "An" don't count.
 */
export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');
}

/** Every title the Suggestions offer, one per normalized spelling. */
export const TITLES: Title[] = dedupe(titlesData as string[]);

function dedupe(titles: string[]): Title[] {
  const seen = new Set<string>();
  const out: Title[] = [];
  for (const title of titles) {
    const key = normalizeTitle(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ title, key });
  }
  return out;
}

/** The listed spelling of a typed title, or the typing itself, trimmed, if it isn't listed. */
export function canonicalTitle(raw: string, titles: Title[] = TITLES): string {
  const key = normalizeTitle(raw);
  return titles.find((t) => t.key === key)?.title ?? raw.trim();
}

export const SUGGESTION_LIMIT = 4;
/** Fewer typed characters than this and no Suggestions show. */
export const SUGGESTION_MIN_CHARS = 2;

/**
 * Titles to offer while typing: those starting with the query first, then
 * those with a later word starting with it. Titles already guessed are left
 * out, and nothing shows once the query is itself the only match.
 */
export function suggest(query: string, guessed: string[] = [], titles: Title[] = TITLES): Title[] {
  const q = normalizeTitle(query);
  if (q.length < SUGGESTION_MIN_CHARS) return [];
  const tried = new Set(guessed.map(normalizeTitle));
  const starts = titles.filter((t) => t.key.startsWith(q));
  const inner = titles.filter((t) => !t.key.startsWith(q) && t.key.includes(` ${q}`));
  const found = [...starts, ...inner].filter((t) => !tried.has(t.key)).slice(0, SUGGESTION_LIMIT);
  return found.length === 1 && found[0].key === q ? [] : found;
}
