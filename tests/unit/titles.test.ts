import { describe, expect, it } from 'vitest';
import { TITLES, canonicalTitle, normalizeTitle, suggest } from '../../src/lib/titles';

const titles = (list: ReturnType<typeof suggest>) => list.map((t) => t.title);

describe('normalizeTitle', () => {
  it.each([
    ['The Great Gatsby', 'great gatsby'],
    ['A Tale of Two Cities', 'tale of two cities'],
    ['Tess of the d’Urbervilles', 'tess of the durbervilles'],
    ['Moby-Dick', 'moby dick'],
    ['J.R.R. Tolkien', 'jrr tolkien'],
    ['Les Misérables', 'les miserables'],
    ['  Theory  ', 'theory'],
  ])('%s → %s', (raw, key) => {
    expect(normalizeTitle(raw)).toBe(key);
  });
});

describe('TITLES', () => {
  it('lists each spelling once', () => {
    const keys = TITLES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    // "The Lord of the Flies" and "Lord of the Flies" normalize alike.
    expect(TITLES.filter((t) => t.key === 'lord of the flies')).toHaveLength(1);
  });
});

describe('canonicalTitle', () => {
  it('uses the listed spelling', () => {
    expect(canonicalTitle('moby dick')).toBe('Moby-Dick');
  });

  it('keeps an unlisted title as typed', () => {
    expect(canonicalTitle(' Something Else ')).toBe('Something Else');
  });
});

describe('suggest', () => {
  it('needs two characters', () => {
    expect(suggest('h')).toEqual([]);
    expect(suggest('ha').length).toBeGreaterThan(0);
  });

  it('offers titles starting with the query first, then a later word', () => {
    // "The Pearl" counts as starting with "pe": the leading "The" is optional.
    expect(titles(suggest('pe'))).toEqual(['The Pearl', 'Persepolis', 'Persuasion', 'Peter Pan']);
    expect(titles(suggest('ra'))[0]).toBe('The Raven');
    expect(titles(suggest('mockingbird'))).toEqual(['To Kill a Mockingbird']);
  });

  it('ignores a leading "The" in the query', () => {
    expect(titles(suggest('the hob'))).toContain('The Hobbit');
  });

  it('offers at most four', () => {
    expect(suggest('harry').length).toBe(4);
  });

  it('leaves out titles already guessed', () => {
    expect(titles(suggest('hobbit', ['The Hobbit']))).toEqual([]);
  });

  it('goes quiet once the query is the only match', () => {
    expect(suggest('the hobbit')).toEqual([]);
  });
});
