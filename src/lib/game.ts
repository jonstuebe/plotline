import type { Puzzle } from './types';
import type { PuzzleRecord } from './storage';
import { canonicalTitle, normalizeTitle } from './titles';

/** Tries per Puzzle: one per Clue. */
export const MAX_TRIES = 6;

/** True when a typed title names the Book, by its title or any alias. */
export function isAnswer(puzzle: Puzzle, raw: string): boolean {
  const key = normalizeTitle(raw);
  return !!key && [puzzle.title, ...puzzle.aliases].some((t) => normalizeTitle(t) === key);
}

/** Why a Guess can't be taken, or null if it can. A refused Guess costs no try. */
export function checkGuess(record: PuzzleRecord, raw: string): string | null {
  const key = normalizeTitle(raw);
  if (!key) return 'Type a title, or skip to the next clue.';
  if (record.guesses.some((g) => g !== null && normalizeTitle(g) === key)) return 'You already guessed that one.';
  return null;
}

/** Takes a Guess that `checkGuess` allowed: the Book is checked out, or the next Clue comes down. */
export function guess(puzzle: Puzzle, record: PuzzleRecord, raw: string): PuzzleRecord {
  const guesses = [...record.guesses, canonicalTitle(raw)];
  if (isAnswer(puzzle, raw)) return { guesses, status: 'won' };
  return { guesses, status: guesses.length >= MAX_TRIES ? 'lost' : 'playing' };
}

/** Skips to the next Clue. It uses up a try, like a wrong Guess. */
export function skip(record: PuzzleRecord): PuzzleRecord {
  const guesses = [...record.guesses, null];
  return { guesses, status: guesses.length >= MAX_TRIES ? 'lost' : 'playing' };
}

/** How many Clues are off the shelf: one more than the tries used, and all of them once the game ends. */
export function cluesShown(record: PuzzleRecord): number {
  return record.status === 'playing' ? Math.min(MAX_TRIES, record.guesses.length + 1) : MAX_TRIES;
}

/** The titles guessed so far, skips left out. */
export function guessedTitles(record: PuzzleRecord): string[] {
  return record.guesses.filter((g): g is string => g !== null);
}
