import { describe, expect, it, vi } from 'vitest';
import { buildShareText, resultLine, scoreText, shareResults } from '../../src/lib/share';
import type { PuzzleRecord } from '../../src/lib/storage';

const record = (guesses: (string | null)[], status: PuzzleRecord['status']): PuzzleRecord => ({ guesses, status });

describe('resultLine', () => {
  it('marks wrong, skipped, correct and unneeded Clues', () => {
    expect(resultLine(record(['Dune', null, '1984'], 'won'))).toBe('🟥⬜🟩⬛⬛⬛');
  });

  it('is one green square on the first Clue', () => {
    expect(resultLine(record(['1984'], 'won'))).toBe('🟩⬛⬛⬛⬛⬛');
  });

  it('has no green when Overdue', () => {
    expect(resultLine(record(['a', null, 'b', 'c', null, 'd'], 'lost'))).toBe('🟥⬜🟥🟥⬜🟥');
  });
});

describe('scoreText', () => {
  it('counts tries when checked out, X when Overdue', () => {
    expect(scoreText(record(['Dune', null, '1984'], 'won'))).toBe('3/6');
    expect(scoreText(record(Array(6).fill(null), 'lost'))).toBe('X/6');
  });
});

describe('buildShareText', () => {
  it('gives the score without giving away the Book or the guesses', () => {
    const text = buildShareText(12, record(['Dune', null, 'Nineteen Eighty-Four'], 'won'));
    expect(text).toBe('Plotline #12 3/6\n\n📖 🟥⬜🟩⬛⬛⬛\n\nplotline.jonstuebe.com');
    expect(text).not.toMatch(/dune|eighty/i);
  });
});

describe('shareResults', () => {
  const nav = (overrides: Partial<Navigator>) => overrides as Navigator;

  it('uses the share sheet when it can', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(shareResults('x', nav({ share, canShare: () => true }))).resolves.toBe('shared');
  });

  it('treats a dismissed share sheet as aborted, not a failure', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error(), { name: 'AbortError' }));
    await expect(shareResults('x', nav({ share, canShare: () => true }))).resolves.toBe('aborted');
  });

  it('falls back to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareResults('x', nav({ clipboard: { writeText } as unknown as Clipboard }))).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('x');
  });

  it('fails when neither is available, so the text can be shown', async () => {
    await expect(shareResults('x', nav({}))).resolves.toBe('failed');
  });
});
