import { MAX_TRIES } from './game';
import { MODES, type Mode } from './mode';

export const STORAGE_KEY = 'plotline:v1';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** `won` is checked out; `lost` is Overdue. */
export type GameStatus = 'playing' | 'won' | 'lost';

/** One Puzzle as played. Each entry is a guessed title, or null for a skip. */
export interface PuzzleRecord {
  guesses: (string | null)[];
  status: GameStatus;
}

export interface Stats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  /** Books checked out on Clue 1..6 at indexes 0..5; Overdue at 6. */
  distribution: number[];
  /** The last Puzzle number played to a finish, for streak continuity. */
  lastPuzzle: number | null;
  lastWon: boolean;
}

export interface Settings {
  theme: ThemeSetting;
}

/** One mode's history: its finished and in-progress Puzzles, by number, and its stats. */
export interface Progress {
  results: Record<number, PuzzleRecord>;
  stats: Stats;
}

/**
 * Everything saved. Books keep the top-level results and stats they always had, so existing
 * players lose nothing; Movies, which number their Puzzles separately, keep theirs under `movie`.
 */
export interface GameState extends Progress {
  movie: Progress;
  /** The tab the player was last on. */
  mode: Mode;
  settings: Settings;
  seenHelp: boolean;
}

export const DISTRIBUTION_LABELS = [...Array.from({ length: MAX_TRIES }, (_, i) => String(i + 1)), 'X'];
const OVERDUE_SLOT = DISTRIBUTION_LABELS.length - 1;

function defaultStats(): Stats {
  return { played: 0, won: 0, currentStreak: 0, maxStreak: 0, distribution: Array(DISTRIBUTION_LABELS.length).fill(0), lastPuzzle: null, lastWon: false };
}

export function defaultState(): GameState {
  return {
    results: {},
    stats: defaultStats(),
    movie: { results: {}, stats: defaultStats() },
    mode: 'book',
    settings: { theme: 'system' },
    seenHelp: false,
  };
}

/** A mode's history within the saved state. */
export function progressFor(state: GameState, mode: Mode): Progress {
  return mode === 'movie' ? state.movie : state;
}

/** The state with one mode's history replaced. */
export function withProgress(state: GameState, mode: Mode, progress: Progress): GameState {
  return mode === 'movie' ? { ...state, movie: { results: progress.results, stats: progress.stats } } : { ...state, results: progress.results, stats: progress.stats };
}

export function emptyRecord(): PuzzleRecord {
  return { guesses: [], status: 'playing' };
}

/** Reads state, tolerating missing, corrupt, or partial data and blocked storage. */
export function loadState(storage: Storage | undefined = safeStorage()): GameState {
  const base = defaultState();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base;
    const movie = parsed.movie && typeof parsed.movie === 'object' ? parsed.movie : null;
    return {
      results: sanitizeResults(parsed.results),
      stats: sanitizeStats(parsed.stats),
      movie: { results: sanitizeResults(movie?.results), stats: sanitizeStats(movie?.stats) },
      mode: MODES.includes(parsed.mode as Mode) ? (parsed.mode as Mode) : base.mode,
      settings: { ...base.settings, ...parsed.settings },
      seenHelp: parsed.seenHelp === true,
    };
  } catch {
    return base;
  }
}

function sanitizeStats(stats: Partial<Stats> | undefined): Stats {
  const base = defaultStats();
  if (!stats || typeof stats !== 'object') return base;
  const distribution = Array.isArray(stats.distribution) && stats.distribution.length === DISTRIBUTION_LABELS.length ? stats.distribution.map((n) => Number(n) || 0) : base.distribution;
  return { ...base, ...stats, distribution };
}

function sanitizeResults(results: unknown): Record<number, PuzzleRecord> {
  if (!results || typeof results !== 'object') return {};
  const out: Record<number, PuzzleRecord> = {};
  for (const [key, value] of Object.entries(results as Record<string, unknown>)) {
    const number = Number(key);
    const record = value as Partial<PuzzleRecord> | null;
    if (!Number.isInteger(number) || !record || !Array.isArray(record.guesses)) continue;
    const guesses = record.guesses.filter((g) => g === null || typeof g === 'string').slice(0, MAX_TRIES);
    const status = record.status === 'won' || record.status === 'lost' ? record.status : 'playing';
    out[number] = { guesses, status };
  }
  return out;
}

export function saveState(state: GameState, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota exceeded: the game still works for this session.
  }
}

/** The Puzzle as the player left it, or a fresh one. */
export function recordFor(state: Progress, puzzle: number): PuzzleRecord {
  return state.results[puzzle] ?? emptyRecord();
}

/** Saves a try mid-game. Stats stay untouched until the Puzzle finishes. */
export function recordProgress<P extends Progress>(state: P, puzzle: number, record: PuzzleRecord): P {
  return { ...state, results: { ...state.results, [puzzle]: record } };
}

/** The distribution row a finished Puzzle lands in: the Clue it was solved on, or Overdue. */
export function distributionSlot(record: PuzzleRecord): number {
  return record.status === 'won' ? Math.min(OVERDUE_SLOT - 1, record.guesses.length - 1) : OVERDUE_SLOT;
}

/**
 * Records a finished Puzzle, stats included. A no-op once that Puzzle has a
 * finished record, so a Puzzle can never be counted twice.
 */
export function recordResult<P extends Progress>(state: P, puzzle: number, record: PuzzleRecord): P {
  const existing = state.results[puzzle];
  if (existing && existing.status !== 'playing') return state;
  if (record.status === 'playing') return recordProgress(state, puzzle, record);

  const won = record.status === 'won';
  const distribution = state.stats.distribution.slice();
  const slot = distributionSlot(record);
  distribution[slot] = (distribution[slot] ?? 0) + 1;
  const continues = state.stats.lastPuzzle === puzzle - 1 && state.stats.lastWon;
  const currentStreak = won ? (continues ? state.stats.currentStreak + 1 : 1) : 0;

  return {
    ...state,
    results: { ...state.results, [puzzle]: record },
    stats: {
      played: state.stats.played + 1,
      won: state.stats.won + (won ? 1 : 0),
      currentStreak,
      maxStreak: Math.max(state.stats.maxStreak, currentStreak),
      distribution,
      lastPuzzle: puzzle,
      lastWon: won,
    },
  };
}

/** The streak as of today: a missed day shows as 0 even before the next game. */
export function effectiveStreak(stats: Stats, today: number): number {
  if (stats.lastPuzzle === null) return 0;
  return today - stats.lastPuzzle <= 1 ? stats.currentStreak : 0;
}

export function wonPercent(stats: Stats): number {
  return stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
