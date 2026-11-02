import { useEffect, useState } from 'react';
import { MODES, MODE_INFO, type Mode } from '../lib/mode';
import { DISTRIBUTION_LABELS, effectiveStreak, wonPercent, type Stats } from '../lib/storage';
import { Modal } from './Modal';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  /** The mode to show first: the tab the player is on. */
  mode: Mode;
  stats: Record<Mode, Stats>;
  /** Today's Puzzle number per mode, for a streak that's already lapsed. */
  today: Record<Mode, number | null>;
  /** Today's distribution row per mode once finished, null mid-game. */
  highlight: Record<Mode, number | null>;
}

export function StatsModal({ open, onClose, mode, stats, today, highlight }: StatsModalProps) {
  const [shown, setShown] = useState(mode);
  useEffect(() => {
    if (open) setShown(mode);
  }, [open, mode]);

  const s = stats[shown];
  const streak = today[shown] === null ? s.currentStreak : effectiveStreak(s, today[shown]!);
  const summary = [
    { value: s.played, label: 'Played' },
    { value: wonPercent(s), label: 'Win %' },
    { value: streak, label: 'Streak' },
    { value: s.maxStreak, label: 'Best Streak' },
  ];
  const peak = Math.max(1, ...s.distribution);

  return (
    <Modal title="Statistics" open={open} onClose={onClose}>
      <div className="segmented" role="radiogroup" aria-label="Show statistics for">
        {MODES.map((m) => (
          <label key={m} className="segment">
            <input type="radio" name="stats-mode" checked={shown === m} onChange={() => setShown(m)} />
            <span>{MODE_INFO[m].label}s</span>
          </label>
        ))}
      </div>
      <div className="group stats-grid">
        {summary.map((item) => (
          <div key={item.label}>
            <b>{item.value}</b>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <h3 className="group-title">Solved on Clue</h3>
      <div className="group dist">
        {s.distribution.map((count, i) => (
          <div key={i} className="dist-row">
            <span className="dist-label">
              <span aria-hidden="true">{DISTRIBUTION_LABELS[i]}</span>
              <span className="sr-only">{i === DISTRIBUTION_LABELS.length - 1 ? 'Missed' : `Clue ${DISTRIBUTION_LABELS[i]}`}</span>
            </span>
            <i className={i === highlight[shown] ? 'dist-bar mine' : 'dist-bar'} style={{ width: `${Math.max(8, (count / peak) * 100)}%` }}>
              {count}
            </i>
          </div>
        ))}
      </div>
      {s.played === 0 ? <p className="footnote">Finish your first {MODE_INFO[shown].noun} to start a streak.</p> : null}
    </Modal>
  );
}
