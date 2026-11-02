import { useState, type ReactNode } from 'react';
import type { Puzzle } from '../lib/types';
import { checkGuess, cluesShown, guess, skip } from '../lib/game';
import { MODE_INFO, type Mode } from '../lib/mode';
import type { PuzzleRecord } from '../lib/storage';
import { ClueList, CurrentClue } from './Clues';
import { GuessField } from './GuessField';
import { Result } from './Result';

interface GameProps {
  mode: Mode;
  puzzle: Puzzle;
  puzzleNumber: number;
  record: PuzzleRecord;
  /** True while the other mode's Puzzle is still open today. */
  otherOpen: boolean;
  onPlayOther: () => void;
  onRecord: (record: PuzzleRecord) => void;
  onAnnounce: (message: string) => void;
  onToast: (message: string) => void;
  onExpire: () => void;
  /** The tab bar, which floats under the guess field. */
  tabBar: ReactNode;
}

/** One mode's Puzzle for today: the Clue in play or the reveal, the Clues so far, and the floating guess field. */
export function Game({ mode, puzzle, puzzleNumber, record, otherOpen, onPlayOther, onRecord, onAnnounce, onToast, onExpire, tabBar }: GameProps) {
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
    const next = guess(puzzle, record, raw, MODE_INFO[mode].titles);
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

  return (
    <>
      <main className="content">
        {playing ? (
          <CurrentClue mode={mode} clue={puzzle.clues[shown - 1]} number={shown} onSkip={onSkip} />
        ) : (
          <Result
            mode={mode}
            puzzle={puzzle}
            puzzleNumber={puzzleNumber}
            record={record}
            otherOpen={otherOpen}
            onPlayOther={onPlayOther}
            onExpire={onExpire}
            onToast={onToast}
          />
        )}
        <ClueList clues={puzzle.clues} record={record} shown={shown} />
      </main>
      <div className="bottom">
        {playing ? <GuessField key={mode} mode={mode} record={record} problem={problem} shake={shake} onGuess={onGuess} onEdit={() => setProblem(null)} /> : null}
        {tabBar}
      </div>
    </>
  );
}
