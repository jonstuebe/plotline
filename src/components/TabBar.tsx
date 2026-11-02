import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { MAX_TRIES, cluesShown } from '../lib/game';
import { MODES, MODE_INFO, type Mode } from '../lib/mode';
import type { PuzzleRecord } from '../lib/storage';
import { BookIcon, CheckIcon, FilmIcon, XmarkIcon } from './Icons';

const MODE_ICON = { book: BookIcon, movie: FilmIcon };
const PAD = 4; // the tab bar's inner padding, matching .tabbar

/** UIScrollView's rubber band: the further past the edge, the less it gives. */
const rubber = (over: number, dim: number) => Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / dim + 1)) * dim;

function statusText(record: PuzzleRecord | null): string {
  if (!record) return '';
  if (record.status === 'won') return `, solved in ${record.guesses.length}`;
  if (record.status === 'lost') return ', missed';
  return `, clue ${cluesShown(record)} of ${MAX_TRIES}`;
}

interface TabBarProps {
  mode: Mode;
  /** Today's record for each mode, or null while its Puzzle hasn't loaded. */
  records: Record<Mode, PuzzleRecord | null>;
  onSelect: (mode: Mode) => void;
}

/**
 * The iOS 26 tab bar. Pressing lifts the selection into a glass lens that follows the finger; past either end it
 * stretches against a rubber band, and on release it springs to the nearest tab and selects it. Taps and keys still work.
 */
export function TabBar({ mode, records, onSelect }: TabBarProps) {
  const nav = useRef<HTMLElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ id: number } | null>(null);
  const [lifted, setLifted] = useState(false);
  const [over, setOver] = useState<Mode | null>(null);

  const slot = () => (nav.current!.clientWidth - PAD * 2) / MODES.length;
  const indexAt = (left: number) => Math.max(0, Math.min(MODES.length - 1, Math.round(left / slot())));

  // Put the lens's left edge at `left` (px from the first slot), rubber-banding and stretching past the ends.
  const place = (left: number) => {
    const w = slot();
    const max = w * (MODES.length - 1);
    const give = w * 0.15; // iOS lets the lens strain only a short way past the end
    const past = left < 0 ? rubber(left, give) : left > max ? rubber(left - max, give) : 0;
    const x = left < 0 ? past : left > max ? max + past : left;
    const el = lens.current!;
    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--stretch', String(1 + (Math.abs(past) / w) * 0.4)); // the lens pulls longer as it strains
    el.style.setProperty('--origin', past < 0 ? 'right' : 'left');
    const m = MODES[indexAt(x)];
    setOver((o) => (o === m ? o : m));
  };
  const fingerLeft = (e: PointerEvent) => e.clientX - nav.current!.getBoundingClientRect().left - PAD - slot() / 2;

  const down = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep the drag even when the finger leaves the bar
    } catch {
      // The pointer is already gone; the drag simply ends on the next up or cancel.
    }
    setLifted(true);
    place(fingerLeft(e));
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    place(fingerLeft(e));
  };
  const release = (e: PointerEvent<HTMLElement>, commit: boolean) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    if (commit) onSelect(MODES[indexAt(fingerLeft(e))]);
    // Hand the lens back to CSS, which springs it home to the selected tab.
    const el = lens.current!;
    el.style.removeProperty('--x');
    el.style.removeProperty('--stretch');
    setLifted(false);
    setOver(null);
  };

  return (
    <nav
      ref={nav}
      className="glass tabbar"
      aria-label="Today’s puzzles"
      data-lifted={lifted ? '' : undefined}
      style={{ '--tab': MODES.indexOf(mode) } as CSSProperties}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={(e) => release(e, true)}
      onPointerCancel={(e) => release(e, false)}
    >
      <span ref={lens} className="lens" aria-hidden="true" />
      {MODES.map((m) => {
        const Icon = MODE_ICON[m];
        const record = records[m];
        const finished = record && record.status !== 'playing';
        const lit = over ? over === m : m === mode;
        return (
          <button key={m} type="button" aria-pressed={m === mode} className={lit ? 'tab lit' : 'tab'} onClick={() => onSelect(m)}>
            <span className="tab-icon">
              <Icon />
              {finished ? (
                <span className={`badge ${record.status}`} aria-hidden="true">
                  {record.status === 'won' ? <CheckIcon /> : <XmarkIcon />}
                </span>
              ) : null}
            </span>
            <span>{MODE_INFO[m].label}</span>
            <span className="sr-only">{statusText(record)}</span>
          </button>
        );
      })}
    </nav>
  );
}
