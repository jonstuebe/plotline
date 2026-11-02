import { useState } from 'react';
import type { Puzzle } from '../lib/types';
import { MODE_INFO, otherMode, type Mode } from '../lib/mode';
import type { PuzzleRecord } from '../lib/storage';
import { buildShareText, shareResults } from '../lib/share';
import { Countdown } from './Countdown';
import { MODE_ICON } from './Clues';
import { ShareIcon } from './Icons';

interface ResultProps {
  mode: Mode;
  puzzle: Puzzle;
  puzzleNumber: number;
  record: PuzzleRecord;
  /** True while the other mode's Puzzle is still open today, to offer it. */
  otherOpen: boolean;
  onPlayOther: () => void;
  onExpire: () => void;
  onToast: (message: string) => void;
}

/** The reveal: the answer, how it went, Share, and the countdown to tomorrow's. */
export function Result({ mode, puzzle, puzzleNumber, record, otherOpen, onPlayOther, onExpire, onToast }: ResultProps) {
  const [manual, setManual] = useState<string | null>(null);
  const won = record.status === 'won';
  const tries = record.guesses.length;
  const text = buildShareText(puzzleNumber, record, mode);
  const Icon = MODE_ICON[mode];

  const share = async () => {
    const outcome = await shareResults(text);
    if (outcome === 'copied') onToast('Copied results to clipboard');
    if (outcome === 'failed') {
      setManual(text);
      onToast('Copy your result below');
    }
  };

  return (
    <section className="card result" aria-label="Result">
      <p className="context">
        <Icon />
        {won ? (tries === 1 ? 'Solved on the first clue' : `Solved on clue ${tries}`) : 'Out of clues'}
      </p>
      <h2 className="answer">{puzzle.title}</h2>
      <p className="by">
        {MODE_INFO[mode].byPrefix}
        {puzzle.author} · {puzzle.published}
      </p>
      <div className="actions">
        <button className="btn btn-tint" type="button" onClick={share}>
          <ShareIcon />
          Share Result
        </button>
        {otherOpen ? (
          <button className="btn btn-plain" type="button" onClick={onPlayOther}>
            Play Today’s {MODE_INFO[otherMode(mode)].label}
          </button>
        ) : null}
      </div>
      <pre className="share-preview" aria-label="Your result">
        {text}
      </pre>
      {manual ? <textarea className="manual" readOnly aria-label="Your result to copy" value={manual} onFocus={(e) => e.target.select()} /> : null}
      <Countdown noun={MODE_INFO[mode].noun} onExpire={onExpire} />
    </section>
  );
}
