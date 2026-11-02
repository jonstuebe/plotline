import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPuzzleDate, localDateKey } from './lib/puzzle';
import { cachedDaily, estimatedPuzzleNumber, loadDaily, type Daily } from './lib/daily';
import { MODE_INFO, otherMode, type Mode } from './lib/mode';
import {
  distributionSlot,
  loadState,
  progressFor,
  recordFor,
  recordResult,
  saveState,
  withProgress,
  type GameState,
  type PuzzleRecord,
  type Settings,
} from './lib/storage';
import { applyUpdate, onUpdateAvailable } from './lib/pwa';
import { Header } from './components/Header';
import { Game } from './components/Game';
import { TabBar } from './components/TabBar';
import { HelpModal } from './components/HelpModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastList, type ToastMessage } from './components/Toast';

type ModalName = 'help' | 'stats' | 'settings' | null;

/** How long the answer is left alone before stats slide in over it. */
const STATS_DELAY_MS = 1500;

/** Today's Puzzle for one mode: from the cache at once, else fetched; refetched when the date rolls over or on retry. */
function useDaily(date: string, mode: Mode, attempt: number): Daily {
  const [daily, setDaily] = useState<Daily>(() => cachedDaily(date, undefined, mode) ?? { status: 'loading' });
  const dailyRef = useRef(daily);
  dailyRef.current = daily;
  useEffect(() => {
    const current = dailyRef.current;
    if (current.status === 'ready' && current.date === date) return;
    let cancelled = false;
    setDaily(cachedDaily(date, undefined, mode) ?? { status: 'loading' });
    void loadDaily(date, undefined, undefined, mode).then((next) => {
      if (!cancelled) setDaily(next);
    });
    return () => {
      cancelled = true;
    };
  }, [date, mode, attempt]);
  return daily;
}

/**
 * Keeps the floating controls above the on-screen keyboard. iOS Safari doesn't resize the page for it,
 * so the gap between the layout and visual viewports becomes `--kb`, and the tab bar steps aside while typing.
 */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb', `${Math.round(kb)}px`);
      root.toggleAttribute('data-keyboard', kb > 80);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}

/** The appearance: Automatic follows the system, live; Light and Dark override it. */
function useTheme(theme: Settings['theme']) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    // The status bar and browser chrome match the page: white, or black in dark.
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    metas.forEach((m) => {
      const dark = theme === 'dark' || (theme === 'system' && m.media.includes('dark'));
      m.content = dark ? '#000000' : '#ffffff';
    });
  }, [theme]);
}

export function App() {
  const [now, setNow] = useState(() => new Date());
  const date = localDateKey(now);
  const [attempt, setAttempt] = useState(0);
  const dailies: Record<Mode, Daily> = { book: useDaily(date, 'book', attempt), movie: useDaily(date, 'movie', attempt) };

  const [state, setState] = useState<GameState>(loadState);
  const [modal, setModal] = useState<ModalName>(() => (state.seenHelp ? null : 'help'));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [liveMessage, setLiveMessage] = useState('');
  const mode = state.mode;
  const daily = dailies[mode];

  useEffect(() => saveState(state), [state]);
  useTheme(state.settings.theme);
  useKeyboardInset();

  const refreshDate = useCallback(() => setNow(new Date()), []);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // Roll over at local midnight, and whenever the app comes back from the background.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refreshDate();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshDate);
    window.addEventListener('online', retry);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshDate);
      window.removeEventListener('online', retry);
    };
  }, [refreshDate, retry]);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.filter((t) => t.persistent), { id, content: message }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 1800);
  }, []);

  // A new service worker is waiting: offer the reload rather than forcing it mid-game.
  useEffect(
    () =>
      onUpdateAvailable(() => {
        setToasts((list) =>
          list.some((t) => t.id === 0)
            ? list
            : [
                ...list,
                {
                  id: 0,
                  persistent: true,
                  content: (
                    <>
                      A new version is ready.{' '}
                      <button type="button" className="toast-action" onClick={applyUpdate}>
                        Reload
                      </button>
                    </>
                  ),
                },
              ],
        );
      }),
    [],
  );

  const numberFor = (m: Mode) => {
    const d = dailies[m];
    return d.status === 'ready' ? d.number : estimatedPuzzleNumber(date, undefined, m);
  };
  const recordOf = (m: Mode): PuzzleRecord | null => {
    const d = dailies[m];
    return d.status === 'ready' ? recordFor(progressFor(state, m), d.number) : null;
  };
  const records = { book: recordOf('book'), movie: recordOf('movie') };
  const highlightOf = (m: Mode) => {
    const r = records[m];
    return r && r.status !== 'playing' ? distributionSlot(r) : null;
  };

  // Stats slide in shortly after a Puzzle is finished, here and now (not when revisiting one finished earlier).
  const statsTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(statsTimer.current), []);

  const onRecord = useCallback(
    (next: PuzzleRecord) => {
      if (daily.status !== 'ready') return;
      setState((prev) => withProgress(prev, mode, recordResult(progressFor(prev, mode), daily.number, next)));
      if (next.status !== 'playing') {
        window.clearTimeout(statsTimer.current);
        statsTimer.current = window.setTimeout(() => setModal('stats'), STATS_DELAY_MS);
      }
    },
    [daily, mode],
  );

  const setMode = useCallback((next: Mode) => {
    setState((prev) => (prev.mode === next ? prev : { ...prev, mode: next }));
    window.scrollTo({ top: 0 });
  }, []);

  const onSettings = useCallback((settings: Settings) => setState((prev) => ({ ...prev, settings })), []);

  const closeHelp = useCallback(() => {
    setModal(null);
    setState((prev) => (prev.seenHelp ? prev : { ...prev, seenHelp: true }));
  }, []);

  const number = numberFor(mode);
  const formattedDate = formatPuzzleDate(now);
  const other = otherMode(mode);
  const otherRecord = records[other];
  const tabBar = <TabBar mode={mode} records={records} onSelect={setMode} />;

  return (
    <div className="app">
      <Header
        subtitle={number === null ? formattedDate : `No. ${number} · ${formattedDate}`}
        onHelp={() => setModal('help')}
        onStats={() => setModal('stats')}
        onSettings={() => setModal('settings')}
      />

      {daily.status === 'ready' ? (
        <Game
          key={`${mode}-${daily.number}`}
          mode={mode}
          puzzle={daily.puzzle}
          puzzleNumber={daily.number}
          record={records[mode]!}
          otherOpen={!!otherRecord && otherRecord.status === 'playing'}
          onPlayOther={() => setMode(other)}
          onRecord={onRecord}
          onAnnounce={setLiveMessage}
          onToast={toast}
          onExpire={refreshDate}
          tabBar={tabBar}
        />
      ) : (
        <>
          <main className="content">
            <Placeholder mode={mode} status={daily.status} onRetry={retry} />
          </main>
          <div className="bottom">{tabBar}</div>
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
      <ToastList toasts={toasts} />

      <HelpModal open={modal === 'help'} onClose={closeHelp} />
      <StatsModal
        open={modal === 'stats'}
        onClose={() => setModal(null)}
        mode={mode}
        stats={{ book: state.stats, movie: state.movie.stats }}
        today={{ book: numberFor('book'), movie: numberFor('movie') }}
        highlight={{ book: highlightOf('book'), movie: highlightOf('movie') }}
      />
      <SettingsModal open={modal === 'settings'} onClose={() => setModal(null)} settings={state.settings} onChange={onSettings} />
    </div>
  );
}

function Placeholder({ mode, status, onRetry }: { mode: Mode; status: 'loading' | 'none' | 'offline'; onRetry: () => void }) {
  const noun = MODE_INFO[mode].noun;
  if (status === 'loading') {
    return (
      <section className="card current placeholder" role="status">
        <span className="spinner" aria-hidden="true" />
        <span className="sr-only">Fetching today’s {noun}…</span>
      </section>
    );
  }
  if (status === 'none') {
    return (
      <section className="card current placeholder">
        <h2>Back Tomorrow</h2>
        <p>There’s no {noun} today. Check again after midnight.</p>
      </section>
    );
  }
  return (
    <section className="card current placeholder">
      <h2>No Connection</h2>
      <p>Plotline needs the network once a day to fetch today’s {noun}.</p>
      <button className="btn btn-tint" type="button" onClick={onRetry}>
        Try Again
      </button>
    </section>
  );
}
