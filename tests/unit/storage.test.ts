import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  defaultState,
  distributionSlot,
  effectiveStreak,
  emptyRecord,
  loadState,
  recordFor,
  recordProgress,
  recordResult,
  saveState,
  wonPercent,
  type GameState,
  type PuzzleRecord,
} from '../../src/lib/storage';
import { blockedStorage, memoryStorage } from './fixtures';

const won = (guesses: (string | null)[] = ['1984']): PuzzleRecord => ({ guesses, status: 'won' });
const lost = (): PuzzleRecord => ({ guesses: ['a', 'b', null, 'c', 'd', 'e'], status: 'lost' });
const stored = (state: unknown) => memoryStorage({ [STORAGE_KEY]: JSON.stringify(state) });

/** Plays `numbers` in order, each checked out on the first Clue. */
function winStreak(numbers: number[]): GameState {
  return numbers.reduce((state, n) => recordResult(state, n, won()), defaultState());
}

describe('loadState', () => {
  it('starts fresh with nothing stored', () => {
    expect(loadState(memoryStorage())).toEqual(defaultState());
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const state = recordResult(defaultState(), 1, won(['Dune', null, '1984']));
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });

  it.each(['{', 'null', '[]', '"nope"'])('falls back to a fresh state on junk: %s', (raw) => {
    expect(loadState(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual(defaultState());
  });

  it('fills in fields a previous version never wrote', () => {
    const state = loadState(stored({ stats: { played: 3 } }));
    expect(state.stats.played).toBe(3);
    expect(state.stats.distribution).toEqual(defaultState().stats.distribution);
    expect(state.settings).toEqual(defaultState().settings);
  });

  it('drops a result that is not a list of guesses, and repairs a partial one', () => {
    expect(loadState(stored({ results: { 1: { guesses: 'Dune' }, 2: { guesses: ['Dune', 7, null], status: 'odd' } } })).results).toEqual({
      2: { guesses: ['Dune', null], status: 'playing' },
    });
  });

  it('survives blocked storage, reading and writing', () => {
    expect(loadState(blockedStorage())).toEqual(defaultState());
    expect(() => saveState(defaultState(), blockedStorage())).not.toThrow();
  });
});

describe('recordFor', () => {
  it('is empty for a Puzzle never opened', () => {
    expect(recordFor(defaultState(), 7)).toEqual(emptyRecord());
  });
});

describe('recordProgress', () => {
  it('saves a try without touching stats', () => {
    const state = recordProgress(defaultState(), 1, { guesses: [null], status: 'playing' });
    expect(state.results[1].guesses).toEqual([null]);
    expect(state.stats.played).toBe(0);
  });
});

describe('distributionSlot', () => {
  it('puts a win in the row for the Clue it came on', () => {
    expect(distributionSlot(won())).toBe(0);
    expect(distributionSlot(won(['a', null, '1984']))).toBe(2);
  });

  it('puts Overdue last', () => {
    expect(distributionSlot(lost())).toBe(6);
  });
});

describe('recordResult', () => {
  it('counts a win in its distribution row', () => {
    const state = recordResult(defaultState(), 1, won(['a', '1984']));
    expect(state.stats).toMatchObject({ played: 1, won: 1, currentStreak: 1, maxStreak: 1 });
    expect(state.stats.distribution).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });

  it('counts Overdue in the last row and breaks the streak', () => {
    const state = recordResult(winStreak([1, 2]), 3, lost());
    expect(state.stats).toMatchObject({ played: 3, won: 2, currentStreak: 0, maxStreak: 2 });
    expect(state.stats.distribution[6]).toBe(1);
  });

  it('extends a streak over consecutive days', () => {
    expect(winStreak([1, 2, 3]).stats).toMatchObject({ currentStreak: 3, maxStreak: 3 });
  });

  it('restarts the streak after a missed day, keeping the best', () => {
    const state = recordResult(winStreak([1, 2, 3]), 9, won());
    expect(state.stats).toMatchObject({ currentStreak: 1, maxStreak: 3 });
  });

  it('refuses to count a finished Puzzle twice', () => {
    const once = recordResult(defaultState(), 1, won());
    expect(recordResult(once, 1, lost())).toBe(once);
  });

  it('saves a mid-game record without counting it', () => {
    const state = recordResult(defaultState(), 1, { guesses: ['Dune'], status: 'playing' });
    expect(state.stats.played).toBe(0);
    expect(state.results[1].status).toBe('playing');
  });
});

describe('effectiveStreak', () => {
  const stats = winStreak([1, 2, 3]).stats;

  it('counts today and yesterday as unbroken', () => {
    expect(effectiveStreak(stats, 3)).toBe(3);
    expect(effectiveStreak(stats, 4)).toBe(3);
  });

  it('shows a missed day as 0 before the next game is played', () => {
    expect(effectiveStreak(stats, 5)).toBe(0);
  });
});

describe('wonPercent', () => {
  it('rounds, and is 0 with nothing played', () => {
    expect(wonPercent(defaultState().stats)).toBe(0);
    expect(wonPercent({ ...defaultState().stats, played: 3, won: 2 })).toBe(67);
  });
});
