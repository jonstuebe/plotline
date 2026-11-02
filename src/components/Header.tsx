import { useEffect, useState } from 'react';
import { HelpIcon, SettingsIcon, StatsIcon } from './Icons';

interface HeaderProps {
  /** Under the large title: "No. 12 · Sunday, Nov 1". */
  subtitle: string;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
}

/** An iOS navigation bar: a large title that collapses into a small centred one on scroll, and glass toolbar buttons. */
export function Header({ subtitle, onHelp, onStats, onSettings }: HeaderProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 56);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="nav">
      <div className={collapsed ? 'topbar on' : 'topbar'} aria-hidden="true">
        <span>Plotline</span>
      </div>
      <div className="toolbar">
        <button type="button" className="glass round" onClick={onHelp} aria-label="How to play">
          <HelpIcon />
        </button>
        <button type="button" className="glass round" onClick={onStats} aria-label="Statistics">
          <StatsIcon />
        </button>
        <button type="button" className="glass round" onClick={onSettings} aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>
      <h1 className="large-title">Plotline</h1>
      <p className="subtitle">{subtitle}</p>
    </header>
  );
}
