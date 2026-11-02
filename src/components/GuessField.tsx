import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { guessedTitles } from '../lib/game';
import { MODE_INFO, type Mode } from '../lib/mode';
import { suggest, type Title } from '../lib/titles';
import type { PuzzleRecord } from '../lib/storage';
import { ArrowUpIcon } from './Icons';

interface GuessFieldProps {
  mode: Mode;
  record: PuzzleRecord;
  /** Why the last Guess was refused, if it was. */
  problem: string | null;
  /** Bumped on a refused Guess, to shake the field. */
  shake: number;
  /** Returns false when the Guess was refused, so the text stays to be fixed. */
  onGuess: (raw: string) => boolean;
  /** The text changed, so any refusal no longer applies. */
  onEdit: () => void;
}

/**
 * While the field has focus the on-screen keyboard is up: mark the page as typing (the tab bar steps aside and the
 * field sits on the keyboard), and bring the Clue in play to the top, since iOS scrolls the page when the keyboard opens.
 */
function useTypingMode(input: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let timer = 0;
    const showClue = () => {
      if (document.activeElement !== input.current) return;
      document.querySelector('.current')?.scrollIntoView?.({ block: 'start' });
    };
    // Once the keyboard has finished opening (or resizing), put the Clue back in view.
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(showClue, 120);
    };
    const onFocus = () => {
      root.setAttribute('data-typing', '');
      settle();
    };
    const onBlur = () => root.removeAttribute('data-typing');
    const el = input.current;
    el?.addEventListener('focus', onFocus);
    el?.addEventListener('blur', onBlur);
    vv?.addEventListener('resize', settle);
    return () => {
      window.clearTimeout(timer);
      el?.removeEventListener('focus', onFocus);
      el?.removeEventListener('blur', onBlur);
      vv?.removeEventListener('resize', settle);
      root.removeAttribute('data-typing');
    };
  }, [input]);
}

/** The floating guess field: the title being typed, its Suggestions above it, and the Guess button inside it. */
export function GuessField({ mode, record, problem, shake, onGuess, onEdit }: GuessFieldProps) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;
  useTypingMode(inputRef);

  const items: Title[] = open ? suggest(value, guessedTitles(record), MODE_INFO[mode].titles) : [];
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
    <>
      <p className={problem ? 'glass problem' : 'problem'} role="status">
        {problem}
      </p>
      <form ref={formRef} className="glass field" autoComplete="off" onSubmit={submit}>
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
          placeholder={`Name the ${MODE_INFO[mode].noun}`}
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
          onFocus={() => setOpen(true)}
          onBlur={() => close()}
        />
        <ul className="suggestions" id={listId} role="listbox" aria-label="Suggestions" hidden={!expanded}>
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
        <button
          className="send"
          type="submit"
          aria-label="Guess"
          // Keep focus (and the keyboard) in the field: a blur would end typing mode and move the button mid-press.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ArrowUpIcon />
        </button>
      </form>
    </>
  );
}
