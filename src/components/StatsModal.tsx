import { DISTRIBUTION_LABELS, effectiveStreak, wonPercent, type Stats } from '../lib/storage';
import { Modal } from './Modal';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  stats: Stats;
  /** Today's Puzzle number, for a streak that's already lapsed. */
  today: number | null;
  /** Today's distribution row once finished, null mid-game. */
  highlight: number | null;
}

export function StatsModal({ open, onClose, stats, today, highlight }: StatsModalProps) {
  const streak = today === null ? stats.currentStreak : effectiveStreak(stats, today);
  const summary = [
    { value: stats.played, label: 'Played' },
    { value: wonPercent(stats), label: 'Win %' },
    { value: streak, label: 'Streak' },
    { value: stats.maxStreak, label: 'Best streak' },
  ];
  const peak = Math.max(1, ...stats.distribution);

  return (
    <Modal title="Reading record" open={open} onClose={onClose}>
      <div className="stats-grid">
        {summary.map((item) => (
          <div key={item.label}>
            <b>{item.value}</b>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <h3 className="dist-title">Checked out on clue</h3>
      <div className="dist">
        {stats.distribution.map((count, i) => (
          <div key={i} className="dist-row">
            <span className="dist-label">
              <span aria-hidden="true">{DISTRIBUTION_LABELS[i]}</span>
              <span className="sr-only">{i === DISTRIBUTION_LABELS.length - 1 ? 'Overdue' : `Clue ${DISTRIBUTION_LABELS[i]}`}</span>
            </span>
            <i className={i === highlight ? 'dist-bar is-mine' : 'dist-bar'} style={{ width: `${Math.max(8, (count / peak) * 100)}%` }}>
              {count}
            </i>
          </div>
        ))}
      </div>
      {stats.played === 0 ? <p className="modal-footnote">Finish your first book to start a streak.</p> : null}
    </Modal>
  );
}
