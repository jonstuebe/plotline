import { MAX_TRIES } from './game';
import type { PuzzleRecord } from './storage';

export const GAME_URL = 'plotline.jonstuebe.com';

export const MARKS = {
  wrong: '🟥',
  skip: '⬜',
  correct: '🟩',
  /** A Clue the player never needed. */
  unused: '⬛',
};

/** The spoiler-free row, e.g. `🟥⬜🟩⬛⬛⬛`: one square per Clue, no titles. */
export function resultLine(record: PuzzleRecord): string {
  const won = record.status === 'won';
  const last = record.guesses.length - 1;
  const marks = record.guesses.map((g, i) => (g === null ? MARKS.skip : won && i === last ? MARKS.correct : MARKS.wrong));
  return marks.join('') + MARKS.unused.repeat(Math.max(0, MAX_TRIES - marks.length));
}

/** The score after the Puzzle number: tries used when checked out, X when Overdue. */
export function scoreText(record: PuzzleRecord): string {
  return `${record.status === 'won' ? record.guesses.length : 'X'}/${MAX_TRIES}`;
}

export function buildShareText(puzzleNumber: number, record: PuzzleRecord): string {
  return `Plotline #${puzzleNumber} ${scoreText(record)}\n\n📖 ${resultLine(record)}\n\n${GAME_URL}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'aborted' | 'failed';

/**
 * Native share sheet where available (phones), clipboard otherwise.
 * 'failed' means the caller should show the text for manual copying.
 */
export async function shareResults(text: string, nav: Navigator = navigator): Promise<ShareOutcome> {
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ text })) {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'aborted';
      // Otherwise fall through to the clipboard.
    }
  }
  try {
    if (!nav.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
