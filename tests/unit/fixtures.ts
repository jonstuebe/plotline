import type { Puzzle } from '../../src/lib/types';

export function puzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: 1,
    title: 'Nineteen Eighty-Four',
    author: 'George Orwell',
    published: '1949',
    aliases: ['1984'],
    clues: [
      'Man keeps a private diary.',
      'His job: rewriting old newspapers.',
      'Television watches you back. Always.',
      'Two plus two equals five.',
      'Winston Smith versus Big Brother.',
      'George Orwell’s final novel, 1949.',
    ],
    ...overrides,
  };
}

/** A localStorage stand-in: no jsdom quirks, and inspectable. */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

/** A storage that refuses everything, like Safari private mode. */
export function blockedStorage(): Storage {
  const throwing = () => {
    throw new Error('Storage blocked');
  };
  return { length: 0, clear: throwing, getItem: throwing, key: throwing, removeItem: throwing, setItem: throwing };
}
