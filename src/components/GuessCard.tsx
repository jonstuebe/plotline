import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_TRIES, guessedTitles } from '../lib/game';
import { suggest, type Title } from '../lib/titles';
import type { PuzzleRecord } from '../lib/storage';

interface GuessCardProps {
  record: PuzzleRecord;
  /** The Clue currently off the shelf, and its number. */
  clue: string;
  clueNumber: number;
  /** Why the last Guess was refused, if it was. */
  problem: string | null;
  /** Bumped on a refused Guess, to shake the form. */
  shake: number;
  /** Returns false when the Guess was refused, so the text stays to be fixed. */
  onGuess: (raw: string) => boolean;
  onSkip: () => void;
  onTyping: () => void;
  /** The text changed, so any refusal no longer applies. */
  onEdit: () => void;
}

/** The catalog card: the current Clue, the title being typed with its Suggestions, and the tries so far. */
export function GuessCard({ record, clue, clueNumber, problem, shake, onGuess, onSkip, onTyping, onEdit }: GuessCardProps) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;

  const items: Title[] = open ? suggest(value, guessedTitles(record)) : [];
  const expanded = items.length > 0;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = (title: Title) => {
    setValue(title.title);
    close();
    inputRef.current?.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    close();
    if (onGuess(value)) setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!expanded) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  // Restart the shake without remounting, which would drop focus and the typed text.
  useEffect(() => {
    const form = formRef.current;
    if (!shake || !form) return;
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
  }, [shake]);

  // iOS Safari doesn't blur an input when you tap elsewhere: close the keyboard
  // on any tap outside the form, but not on a scroll.
  useEffect(() => {
    let start: { x: number; y: number; outside: boolean } | null = null;
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, outside: !(e.target as Element | null)?.closest?.('form') };
    };
    const up = (e: PointerEvent) => {
      if (start?.outside && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 10 && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
      start = null;
    };
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', up, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
    };
  }, []);

  return (
    <section className="play" aria-label="Your guess">
      <div className="card">
        <div className="card-head">
          <b>TITLE</b>
          <span>
            Card {record.guesses.length + 1} of {MAX_TRIES}
          </span>
        </div>
        <p className="cardclue">
          <b>Clue {clueNumber}</b>
          {clue}
        </p>
        <form ref={formRef} className="guess-form" autoComplete="off" onSubmit={submit}>
          <label className="sr-only" htmlFor={`${listId}-input`}>
            Your guess
          </label>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            placeholder="name the book…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onEdit();
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => {
              setOpen(true);
              onTyping();
            }}
            onBlur={() => close()}
          />
          <ul className="sugg" id={listId} role="listbox" aria-label="Suggestions" hidden={!expanded}>
            {items.map((item, i) => (
              <li
                key={item.key}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                // Pick before the input blurs and closes the list.
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
              >
                {item.title}
              </li>
            ))}
          </ul>
          <button className="stampbtn" type="submit">
            Guess
          </button>
        </form>
        <p className="hint" role="status">
          {problem}
        </p>
        {record.guesses.length ? (
          <ul className="guesses" aria-label="Your guesses">
            {record.guesses.map((g, i) =>
              g === null ? (
                <li key={i} className="skip">
                  skipped
                </li>
              ) : (
                <li key={i} className="miss">
                  <span className="sr-only">Not </span>
                  {g}
                </li>
              ),
            )}
          </ul>
        ) : null}
      </div>
      <button className="skipbtn" type="button" onClick={onSkip}>
        Pull the next clue off the shelf
      </button>
    </section>
  );
}
