import { useState } from 'react';
import type { Puzzle } from '../lib/types';
import { MAX_TRIES } from '../lib/game';
import type { PuzzleRecord } from '../lib/storage';
import { buildShareText, shareResults } from '../lib/share';
import { Countdown } from './Countdown';
import { ShareIcon } from './Icons';

interface ResultProps {
  puzzle: Puzzle;
  puzzleNumber: number;
  record: PuzzleRecord;
  onExpire: () => void;
  onToast: (message: string) => void;
}

/** The date-due slip: the Book revealed, Checked out or Overdue, and Share. */
export function Result({ puzzle, puzzleNumber, record, onExpire, onToast }: ResultProps) {
  const [manual, setManual] = useState<string | null>(null);
  const won = record.status === 'won';
  const tries = record.guesses.length;

  const share = async () => {
    const text = buildShareText(puzzleNumber, record);
    const outcome = await shareResults(text);
    if (outcome === 'copied') onToast('Copied results to clipboard');
    if (outcome === 'failed') {
      setManual(text);
      onToast('Copy your result below');
    }
  };

  return (
    <section className="result" aria-label="Result">
      <div className="slip">
        <p className="slip-head">Date Due</p>
        <p className="kicker">{won ? (tries === 1 ? 'Checked out on the first clue' : 'Checked out') : 'Today’s book was'}</p>
        <h2 className="book-title">{puzzle.title}</h2>
        <p className="by">
          {puzzle.author}, {puzzle.published}
        </p>
        <p className="score">{won ? `Solved on clue ${tries} of ${MAX_TRIES}.` : 'Six clues down. Tomorrow’s another book.'}</p>
        <span className={won ? 'stamp' : 'stamp lost'}>{won ? `Checked out · Clue ${tries}` : 'Overdue'}</span>
        <Countdown onExpire={onExpire} />
      </div>
      <button className="share" type="button" onClick={share}>
        Share
        <ShareIcon />
      </button>
      {manual ? <textarea className="manual" readOnly aria-label="Your result to copy" value={manual} onFocus={(e) => e.target.select()} /> : null}
    </section>
  );
}
