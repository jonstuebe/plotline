import type { Settings, ThemeSetting } from '../lib/storage';
import { Modal } from './Modal';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (settings: Settings) => void;
}

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  return (
    <Modal title="Settings" open={open} onClose={onClose}>
      <fieldset className="setting">
        <legend className="group-title">Appearance</legend>
        <div className="segmented">
          {THEMES.map((t) => (
            <label key={t.value} className="segment">
              <input type="radio" name="theme" value={t.value} checked={settings.theme === t.value} onChange={() => onChange({ ...settings, theme: t.value })} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="footnote">Plotline v{__APP_VERSION__} · Works offline once loaded</p>
    </Modal>
  );
}
