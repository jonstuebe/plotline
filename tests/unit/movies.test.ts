import { describe, expect, it } from 'vitest';
import data from '../../worker/movies.json';
import movieTitles from '../../src/lib/movie-titles.json';
import type { Puzzle } from '../../src/lib/types';
import { MAX_TRIES } from '../../src/lib/game';
import { normalizeTitle } from '../../src/lib/titles';

// Movie Puzzles share the Book shape; `author` holds the director.
const MOVIES = data as Puzzle[];

describe('the movie puzzles', () => {
  const words = (clue: string) => clue.trim().split(/\s+/).length;
  const listed = new Set((movieTitles as string[]).map(normalizeTitle));

  it('number their ids in order from 1', () => {
    expect(MOVIES.map((p) => p.id)).toEqual(MOVIES.map((_, i) => i + 1));
  });

  it('have one Clue per try, each exactly five words', () => {
    for (const p of MOVIES) {
      expect(p.clues, p.title).toHaveLength(MAX_TRIES);
      for (const clue of p.clues) expect(words(clue), `${p.title}: ${clue}`).toBe(5);
    }
  });

  it('name the director in the last Clue', () => {
    const surname = (director: string) => normalizeTitle(director.split(' ').at(-1)!);
    for (const p of MOVIES) expect(normalizeTitle(p.clues.at(-1)!), p.title).toContain(surname(p.author));
  });

  it('never give the title away before the last two Clues', () => {
    for (const p of MOVIES) {
      for (const clue of p.clues.slice(0, 4)) expect(normalizeTitle(clue), `${p.title}: ${clue}`).not.toContain(normalizeTitle(p.title));
    }
  });

  it('are in the movie Suggestions, so a player can always pick the answer', () => {
    for (const p of MOVIES) expect(listed.has(normalizeTitle(p.title)), p.title).toBe(true);
  });

  it('have aliases that differ from the title and from each other', () => {
    for (const p of MOVIES) {
      const keys = [p.title, ...p.aliases].map(normalizeTitle);
      expect(new Set(keys).size, p.title).toBe(keys.length);
    }
  });

  it('never repeat a Movie', () => {
    const keys = MOVIES.map((p) => normalizeTitle(p.title));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('list each Suggestion once', () => {
    const keys = (movieTitles as string[]).map(normalizeTitle);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
