import { useEffect, useRef, useState } from 'react';

const CHANNELS = [
  { id: 'pad',     label: 'Ambient Pad',    sym: '♩', default: 80 },
  { id: 'bass',    label: 'Sub Bass',       sym: '◎', default: 70 },
  { id: 'air',     label: 'Air · Noise',    sym: '∿', default: 65 },
  { id: 'shimmer', label: 'Shimmer',        sym: '✦', default: 65 },
  { id: 'fx',      label: 'Interaction FX', sym: '◆', default: 75 },
];

const INIT = Object.fromEntries(CHANNELS.map(c => [c.id, c.default]));

export default function AudioMixer({ open, onClose }) {
  const [volumes, setVolumes] = useState(INIT);
  const panelRef = useRef(null);

  const handleChange = (id, val) => {
    setVolumes(prev => ({ ...prev, [id]: val }));
    if (window.__prismMixer) window.__prismMixer.set(id, val / 100);
  };

  // Click outside + ESC to close
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      const panel = panelRef.current;
      if (!panel || panel.contains(e.target)) return;
      // Ignore the mix-btn that toggles this panel so its click doesn't re-open after close
      if (e.target.closest && e.target.closest('.mix-btn')) return;
      onClose && onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', onPointer, true);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="audio-mixer" role="dialog" aria-label="Audio Mixer" ref={panelRef}>
      <div className="mixer-header">
        <span>◈ AUDIO MIXER</span>
        <button className="mixer-close" onClick={onClose}>✕</button>
      </div>
      <div className="mixer-channels">
        {CHANNELS.map(({ id, label, sym }) => (
          <div key={id} className="mixer-ch">
            <div className="mixer-ch-label">
              <span className="mixer-sym">{sym}</span>
              <span>{label}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volumes[id]}
              onChange={e => handleChange(id, Number(e.target.value))}
              className="mixer-slider"
              aria-label={`${label} volume`}
            />
            <div className="mixer-val">{String(volumes[id]).padStart(3, '0')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
