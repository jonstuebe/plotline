import { useCallback, useState } from 'react';
import type { Puzzle } from '../lib/types';
import { MAX_TRIES, checkGuess, cluesShown, guess, skip } from '../lib/game';
import type { PuzzleRecord } from '../lib/storage';
import { Shelf } from './Shelf';
import { GuessCard } from './GuessCard';
import { Result } from './Result';

interface GameProps {
  puzzle: Puzzle;
  puzzleNumber: number;
  /** Today's date as shown above the shelf. */
  date: string;
  record: PuzzleRecord;
  onRecord: (record: PuzzleRecord) => void;
  onAnnounce: (message: string) => void;
  onToast: (message: string) => void;
  onExpire: () => void;
}

export function Game({ puzzle, puzzleNumber, date, record, onRecord, onAnnounce, onToast, onExpire }: GameProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const playing = record.status === 'playing';
  const shown = cluesShown(record);

  const announce = (next: PuzzleRecord, wrong: string | null) => {
    if (next.status === 'won') onAnnounce(`Correct: ${puzzle.title}.`);
    else if (next.status === 'lost') onAnnounce(`Out of tries. It was ${puzzle.title}.`);
    else onAnnounce(`${wrong ? `Not ${wrong}.` : 'Skipped.'} Clue ${cluesShown(next)} revealed.`);
  };

  const onGuess = (raw: string): boolean => {
    const refused = checkGuess(record, raw);
    if (refused) {
      setProblem(refused);
      setShake((n) => n + 1);
      return false;
    }
    const next = guess(puzzle, record, raw);
    setProblem(null);
    onRecord(next);
    announce(next, next.guesses.at(-1) ?? null);
    return true;
  };

  const onSkip = () => {
    const next = skip(record);
    setProblem(null);
    onRecord(next);
    announce(next, null);
  };

  // On a phone the keyboard covers half the screen: bring the newest Clue up to the top.
  const onTyping = useCallback(() => {
    const latest = document.querySelector('.spine.latest');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    latest?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  return (
    <>
      <div className="meta">
        <span>
          <strong>No. {puzzleNumber}</strong>, {date}
        </span>
        {playing ? (
          <span>
            Try {record.guesses.length + 1} of {MAX_TRIES}
          </span>
        ) : null}
      </div>

      <Shelf clues={puzzle.clues} shown={shown} puzzleNumber={puzzleNumber} playing={playing} />

      {playing ? (
        <GuessCard
          record={record}
          clue={puzzle.clues[shown - 1]}
          clueNumber={shown}
          problem={problem}
          shake={shake}
          onGuess={onGuess}
          onSkip={onSkip}
          onTyping={onTyping}
          onEdit={() => setProblem(null)}
        />
      ) : (
        <Result puzzle={puzzle} puzzleNumber={puzzleNumber} record={record} onExpire={onExpire} onToast={onToast} />
      )}
    </>
  );
}
