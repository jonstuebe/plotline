import { useEffect, useRef, type CSSProperties } from 'react';

interface ShelfProps {
  clues: string[];
  /** How many Clues are off the shelf. The rest show as locked spines. */
  shown: number;
  puzzleNumber: number;
  /** While playing, the newest Clue stands out from the rest. */
  playing: boolean;
}

/** Book-cloth colours, rotated by Puzzle so each day's shelf looks different. */
const CLOTH = ['#7A1F2B', '#1F3A5F', '#2F5A3A', '#6E5418', '#4B2A5C', '#1E5A5A', '#6B3A1F', '#33415C'];
const WIDTHS = [96, 90, 100, 93, 98, 88];
const OFFSETS = [2, 8, 0, 5, 1, 7];

/** The bookcase: one spine per Clue, revealed top to bottom. */
export function Shelf({ clues, shown, puzzleNumber, playing }: ShelfProps) {
  // Spines revealed since the last render slide off the shelf; the first render doesn't animate.
  const previous = useRef(shown);
  const freshFrom = previous.current;
  useEffect(() => {
    previous.current = shown;
  }, [shown]);

  return (
    <div className="case">
      <div className="recess">
        <ol className="clues" aria-label="Clues">
          {clues.map((clue, i) => {
            const style = {
              '--c': CLOTH[(i * 3 + puzzleNumber) % CLOTH.length],
              width: `${WIDTHS[i % WIDTHS.length]}%`,
              marginLeft: `${OFFSETS[i % OFFSETS.length]}%`,
            } as CSSProperties;
            const callNumber = (
              <span className="callno" aria-hidden="true">
                {i + 1}
              </span>
            );
            if (i >= shown) {
              return (
                <li key={i} className="spine locked" style={style}>
                  {callNumber}
                  <span className="bars" aria-hidden="true">
                    {clue.split(' ').map((word, j) => (
                      <i key={j} style={{ width: `${Math.max(16, word.replace(/[^\p{L}\p{N}’-]/gu, '').length * 7)}px` }} />
                    ))}
                  </span>
                  <span className="sr-only">Clue {i + 1}, still on the shelf</span>
                </li>
              );
            }
            const classes = ['spine'];
            if (playing && i === shown - 1) classes.push('latest');
            if (i >= freshFrom) classes.push('fresh');
            return (
              <li key={i} className={classes.join(' ')} style={style}>
                {callNumber}
                <span className="txt">
                  <span className="sr-only">Clue {i + 1}: </span>
                  {clue}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="plank" />
      </div>
    </div>
  );
}
