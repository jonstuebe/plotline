import { describe, expect, it } from 'vitest';
import { MAX_TRIES, checkGuess, cluesShown, guess, guessedTitles, isAnswer, skip } from '../../src/lib/game';
import { emptyRecord, type PuzzleRecord } from '../../src/lib/storage';
import { puzzle } from './fixtures';

const BOOK = puzzle();
const playing = (guesses: (string | null)[]): PuzzleRecord => ({ guesses, status: 'playing' });

describe('isAnswer', () => {
  it('takes the title however it is typed', () => {
    expect(isAnswer(BOOK, 'nineteen eighty-four')).toBe(true);
    expect(isAnswer(BOOK, '  NINETEEN   EIGHTY FOUR ')).toBe(true);
  });

  it('takes an alias', () => {
    expect(isAnswer(BOOK, '1984')).toBe(true);
  });

  it('makes a leading "The" optional, both ways', () => {
    const gatsby = puzzle({ title: 'The Great Gatsby', aliases: [] });
    expect(isAnswer(gatsby, 'Great Gatsby')).toBe(true);
    expect(isAnswer(puzzle({ title: 'Matilda', aliases: [] }), 'The Matilda')).toBe(true);
  });

  it('ignores accents and apostrophes', () => {
    const web = puzzle({ title: 'Charlotte’s Web', aliases: [] });
    expect(isAnswer(web, "charlottes web")).toBe(true);
    expect(isAnswer(puzzle({ title: 'Les Misérables', aliases: [] }), 'les miserables')).toBe(true);
  });

  it('refuses another book, and nothing at all', () => {
    expect(isAnswer(BOOK, 'Animal Farm')).toBe(false);
    expect(isAnswer(BOOK, '   ')).toBe(false);
  });
});

describe('checkGuess', () => {
  it('refuses an empty guess', () => {
    expect(checkGuess(emptyRecord(), ' ')).toMatch(/Type a title/);
  });

  it('refuses a title already guessed, however it is spelled', () => {
    expect(checkGuess(playing(['The Hobbit', null]), 'hobbit')).toMatch(/already guessed/);
  });

  it('allows anything else', () => {
    expect(checkGuess(playing([null]), 'Dune')).toBeNull();
  });
});

describe('guess', () => {
  it('checks the Book out on a correct title', () => {
    expect(guess(BOOK, playing(['Dune']), '1984')).toEqual({ guesses: ['Dune', '1984'], status: 'won' });
  });

  it('records a listed title in its listed spelling', () => {
    expect(guess(BOOK, emptyRecord(), 'the hobbit').guesses).toEqual(['The Hobbit']);
  });

  it('records an unlisted title as typed, trimmed', () => {
    expect(guess(BOOK, emptyRecord(), '  My Novel ').guesses).toEqual(['My Novel']);
  });

  it('keeps playing after a wrong title, until the tries run out', () => {
    expect(guess(BOOK, emptyRecord(), 'Dune').status).toBe('playing');
    expect(guess(BOOK, playing(['a', 'b', 'c', 'd', null]), 'Dune').status).toBe('lost');
  });

  it('still wins on the last try', () => {
    expect(guess(BOOK, playing(['a', 'b', 'c', 'd', null]), '1984').status).toBe('won');
  });
});

describe('skip', () => {
  it('uses a try', () => {
    expect(skip(emptyRecord())).toEqual({ guesses: [null], status: 'playing' });
  });

  it('runs out the tries like a wrong guess', () => {
    expect(skip(playing([null, null, null, null, null])).status).toBe('lost');
  });
});

describe('cluesShown', () => {
  it('starts with one Clue and adds one per try', () => {
    expect(cluesShown(emptyRecord())).toBe(1);
    expect(cluesShown(playing(['a', null]))).toBe(3);
  });

  it('shows every Clue once the game ends, however it ended', () => {
    expect(cluesShown({ guesses: ['1984'], status: 'won' })).toBe(MAX_TRIES);
    expect(cluesShown({ guesses: Array(MAX_TRIES).fill(null), status: 'lost' })).toBe(MAX_TRIES);
  });
});

describe('guessedTitles', () => {
  it('leaves out skips', () => {
    expect(guessedTitles(playing(['Dune', null, 'Emma']))).toEqual(['Dune', 'Emma']);
  });
});
