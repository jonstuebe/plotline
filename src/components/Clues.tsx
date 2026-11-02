import { useEffect, useRef, type CSSProperties } from 'react';
import { MAX_TRIES } from '../lib/game';
import { MODE_INFO, type Mode } from '../lib/mode';
import type { PuzzleRecord } from '../lib/storage';
import { BookIcon, FilmIcon, XmarkIcon } from './Icons';

export const MODE_ICON = { book: BookIcon, movie: FilmIcon };

interface CurrentClueProps {
  mode: Mode;
  clue: string;
  /** Which Clue this is, 1 to 6. */
  number: number;
  onSkip: () => void;
}

/** The Clue in play, with the page dots and Skip. On the last Clue, skipping ends the Puzzle, so it says Give Up. */
export function CurrentClue({ mode, clue, number, onSkip }: CurrentClueProps) {
  const Icon = MODE_ICON[mode];
  return (
    <section className="card current" aria-label="Current clue">
      <p className="context">
        <Icon />
        {MODE_INFO[mode].label} · Clue {number} of {MAX_TRIES}
      </p>
      <p key={`${mode}-${number}`} className="clue">
        {clue}
      </p>
      <div className="now-foot">
        <div className="dots" aria-hidden="true">
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <i key={i} className={i < number - 1 ? 'past' : i === number - 1 ? 'now' : ''} />
          ))}
        </div>
        <button type="button" className="skip" onClick={onSkip}>
          {number === MAX_TRIES ? 'Give Up' : 'Skip'}
        </button>
      </div>
    </section>
  );
}

interface ClueListProps {
  clues: string[];
  record: PuzzleRecord;
  /** How many Clues are revealed. The rest show as placeholder bars. */
  shown: number;
}

/**
 * Every Clue so far, each with the try spent on it, then the locked ones. While playing, the Clue in play sits in
 * its own card above, so it's left out here. Locked Clues never reach the page: only bars sized to their words do.
 */
export function ClueList({ clues, record, shown }: ClueListProps) {
  const playing = record.status === 'playing';
  const listed = playing ? shown - 1 : shown;
  const won = record.status === 'won';
  const last = record.guesses.length - 1;

  // A Clue revealed since the last render fades in; the first render doesn't animate.
  const previous = useRef(listed);
  const freshFrom = previous.current;
  useEffect(() => {
    previous.current = listed;
  }, [listed]);

  if (!listed && !playing) return null;
  return (
    <>
      <h2 className="section">{playing ? 'Clues' : 'All Clues'}</h2>
      <ol className="card list" aria-label="Clues">
        {clues.slice(0, listed).map((clue, i) => {
          const tried = i < record.guesses.length && !(won && i === last);
          const g = record.guesses[i];
          return (
            <li key={i} className={i >= freshFrom ? 'fresh' : undefined}>
              <span className="num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="row">
                <span className="row-text">
                  <span className="sr-only">Clue {i + 1}: </span>
                  {clue}
                </span>
                {tried ? (
                  <span className="row-sub">
                    {g === null ? (
                      'Skipped'
                    ) : (
                      <>
                        <XmarkIcon />
                        <span className="sr-only">Wrong guess: </span>
                        {g}
                      </>
                    )}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
        {playing
          ? clues.slice(shown).map((clue, j) => (
              <li key={`locked-${j}`} className="locked">
                <span className="num" aria-hidden="true">
                  {shown + j + 1}
                </span>
                <span className="bars" aria-hidden="true">
                  {clue.split(' ').map((word, k) => (
                    <i key={k} style={{ '--w': `${Math.max(2, word.replace(/[^\p{L}\p{N}’-]/gu, '').length) * 7}px` } as CSSProperties} />
                  ))}
                </span>
                <span className="sr-only">Clue {shown + j + 1}, locked</span>
              </li>
            ))
          : null}
      </ol>
    </>
  );
}
