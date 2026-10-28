import { describe, expect, it } from 'vitest';
import data from '../../worker/puzzles.json';
import type { Puzzle } from '../../src/lib/types';
import { LAUNCH_DATE, isTodaySomewhere, parseDateKey, puzzleForDate, puzzleNumber } from '../../worker/puzzles';
import { MAX_TRIES } from '../../src/lib/game';
import { TITLES, normalizeTitle } from '../../src/lib/titles';
import { HELP_EXAMPLE } from '../../src/components/HelpModal';
import { puzzle } from './fixtures';

const PUZZLES = data as Puzzle[];
const at = (key: string, hour = 0) => parseDateKey(key)! + hour * 3_600_000;

describe('parseDateKey', () => {
  it('reads a valid key as UTC midnight', () => {
    expect(parseDateKey('2026-10-27')).toBe(Date.UTC(2026, 9, 27));
  });

  it.each(['2026-13-01', '2026-02-30', '2026-1-1', 'yesterday', ''])('rejects %s', (key) => {
    expect(parseDateKey(key)).toBeNull();
  });
});

describe('puzzleNumber', () => {
  it('is 1 on the launch date', () => {
    expect(puzzleNumber(parseDateKey(LAUNCH_DATE)!)).toBe(1);
  });

  it('counts on by whole days across a DST boundary', () => {
    expect(puzzleNumber(parseDateKey('2026-11-03')!)).toBe(8);
  });

  it('is 0 or less before launch', () => {
    expect(puzzleNumber(parseDateKey('2026-10-26')!)).toBe(0);
  });
});

describe('isTodaySomewhere', () => {
  const date = parseDateKey('2026-10-27')!;

  it('opens 14 hours early, for UTC+14', () => {
    expect(isTodaySomewhere(date, at('2026-10-26', 10) - 1)).toBe(false);
    expect(isTodaySomewhere(date, at('2026-10-26', 10))).toBe(true);
  });

  it('closes 12 hours late, for UTC−12', () => {
    expect(isTodaySomewhere(date, at('2026-10-28', 12) - 1)).toBe(true);
    expect(isTodaySomewhere(date, at('2026-10-28', 12))).toBe(false);
  });
});

describe('puzzleForDate', () => {
  const list = [puzzle({ id: 1 }), puzzle({ id: 2 })];

  it('serves the nth Puzzle on the nth day', () => {
    expect(puzzleForDate(list, '2026-10-28')).toEqual({ number: 2, puzzle: list[1] });
  });

  it('has nothing before launch or after the list runs out', () => {
    expect(puzzleForDate(list, '2026-10-26')).toBeNull();
    expect(puzzleForDate(list, '2026-10-29')).toBeNull();
  });
});

describe('the shipped puzzles', () => {
  const words = (clue: string) => clue.trim().split(/\s+/).length;
  const listed = new Set(TITLES.map((t) => t.key));

  it('number their ids in order from 1', () => {
    expect(PUZZLES.map((p) => p.id)).toEqual(PUZZLES.map((_, i) => i + 1));
  });

  it('have one Clue per try, each exactly five words', () => {
    for (const p of PUZZLES) {
      expect(p.clues, p.title).toHaveLength(MAX_TRIES);
      for (const clue of p.clues) expect(words(clue), `${p.title}: ${clue}`).toBe(5);
    }
  });

  it('name the author in the last Clue', () => {
    const surname = (author: string) => normalizeTitle(author.split(' ').at(-1)!);
    for (const p of PUZZLES) expect(normalizeTitle(p.clues.at(-1)!), p.title).toContain(surname(p.author));
  });

  it('never give the title away before the last two Clues', () => {
    for (const p of PUZZLES) {
      for (const clue of p.clues.slice(0, 4)) expect(normalizeTitle(clue), `${p.title}: ${clue}`).not.toContain(normalizeTitle(p.title));
    }
  });

  it('are in the Suggestions, so a player can always pick the answer', () => {
    for (const p of PUZZLES) expect(listed.has(normalizeTitle(p.title)), p.title).toBe(true);
  });

  it('have aliases that differ from the title and from each other', () => {
    for (const p of PUZZLES) {
      const keys = [p.title, ...p.aliases].map(normalizeTitle);
      expect(new Set(keys).size, p.title).toBe(keys.length);
    }
  });

  it('never repeat a Book', () => {
    const keys = PUZZLES.map((p) => normalizeTitle(p.title));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('leave the help card’s example out, so it spoils nothing', () => {
    expect(words(HELP_EXAMPLE.clue)).toBe(5);
    expect(PUZZLES.map((p) => normalizeTitle(p.title))).not.toContain(normalizeTitle(HELP_EXAMPLE.title));
    expect(PUZZLES.flatMap((p) => p.clues)).not.toContain(HELP_EXAMPLE.clue);
  });
});
