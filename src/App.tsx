import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPuzzleDate, localDateKey } from './lib/puzzle';
import { cachedDaily, estimatedPuzzleNumber, loadDaily, type Daily } from './lib/daily';
import { distributionSlot, loadState, recordFor, recordResult, saveState, type GameState, type PuzzleRecord, type Settings } from './lib/storage';
import { applyUpdate, onUpdateAvailable } from './lib/pwa';
import { Header } from './components/Header';
import { Game } from './components/Game';
import { HelpModal } from './components/HelpModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastList, type ToastMessage } from './components/Toast';

type ModalName = 'help' | 'stats' | 'settings' | null;

/** How long the revealed Book is left alone before stats slide in over it. */
const STATS_DELAY_MS = 1500;

export function App() {
  const [now, setNow] = useState(() => new Date());
  const date = localDateKey(now);
  const [daily, setDaily] = useState<Daily>(() => cachedDaily(date) ?? { status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const [state, setState] = useState<GameState>(loadState);
  const [modal, setModal] = useState<ModalName>(() => (state.seenHelp ? null : 'help'));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [liveMessage, setLiveMessage] = useState('');

  useEffect(() => saveState(state), [state]);

  // Theme lives on <html> so CSS tokens can switch.
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = state.settings.theme;
  }, [state.settings]);

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

  // Fetch the Puzzle for the local date, unless it's already loaded.
  const dailyRef = useRef(daily);
  dailyRef.current = daily;
  useEffect(() => {
    const current = dailyRef.current;
    if (current.status === 'ready' && current.date === date) return;
    let cancelled = false;
    setDaily(cachedDaily(date) ?? { status: 'loading' });
    void loadDaily(date).then((next) => {
      if (!cancelled) setDaily(next);
    });
    return () => {
      cancelled = true;
    };
  }, [date, attempt]);

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

  const puzzleNumber = daily.status === 'ready' ? daily.number : estimatedPuzzleNumber(date);
  const record = daily.status === 'ready' ? recordFor(state, daily.number) : null;

  // Show stats shortly after the finish, once per finished Puzzle.
  const celebrated = useRef<number | null>(null);
  useEffect(() => {
    if (daily.status !== 'ready' || !record || record.status === 'playing') return;
    if (celebrated.current === daily.number) return;
    celebrated.current = daily.number;
    const id = window.setTimeout(() => setModal('stats'), STATS_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [daily, record]);

  const onRecord = useCallback(
    (next: PuzzleRecord) => {
      if (daily.status !== 'ready') return;
      setState((prev) => recordResult(prev, daily.number, next));
    },
    [daily],
  );

  const onSettings = useCallback((settings: Settings) => setState((prev) => ({ ...prev, settings })), []);

  const closeHelp = useCallback(() => {
    setModal(null);
    setState((prev) => (prev.seenHelp ? prev : { ...prev, seenHelp: true }));
  }, []);

  const highlight = record && record.status !== 'playing' ? distributionSlot(record) : null;

  return (
    <div className="app">
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} onSettings={() => setModal('settings')} />

      {daily.status === 'ready' ? (
        <Game
          key={daily.number}
          puzzle={daily.puzzle}
          puzzleNumber={daily.number}
          date={formatPuzzleDate(now)}
          record={recordFor(state, daily.number)}
          onRecord={onRecord}
          onAnnounce={setLiveMessage}
          onToast={toast}
          onExpire={refreshDate}
        />
      ) : (
        <Placeholder status={daily.status} number={puzzleNumber} date={formatPuzzleDate(now)} onRetry={retry} />
      )}

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
      <ToastList toasts={toasts} />

      <HelpModal open={modal === 'help'} onClose={closeHelp} />
      <StatsModal open={modal === 'stats'} onClose={() => setModal(null)} stats={state.stats} today={puzzleNumber} highlight={highlight} />
      <SettingsModal open={modal === 'settings'} onClose={() => setModal(null)} settings={state.settings} onChange={onSettings} />
    </div>
  );
}

function Placeholder({
  status,
  number,
  date,
  onRetry,
}: {
  status: 'loading' | 'none' | 'offline';
  number: number | null;
  date: string;
  onRetry: () => void;
}) {
  return (
    <>
      <div className="meta">
        <span>
          {number === null ? null : <strong>No. {number}, </strong>}
          {date}
        </span>
      </div>
      <div className="case">
        <div className="recess">
          {status === 'loading' ? (
            <div className="placeholder" role="status">
              <span className="placeholder-spines" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="sr-only">Fetching today’s book…</span>
            </div>
          ) : status === 'none' ? (
            <div className="placeholder">
              <h2>Back tomorrow</h2>
              <p>The shelf is empty today. Check again after midnight.</p>
            </div>
          ) : (
            <div className="placeholder">
              <h2>No connection</h2>
              <p>Plotline needs the network once a day to fetch today’s book.</p>
              <button className="button button-primary" type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
          <div className="plank" />
        </div>
      </div>
    </>
  );
}
