import React from 'react';
import { useScrollProgress } from '../hooks/useScroll';
import logoUrl from '../../logo.png';

const STAGES = [
  'OVERVIEW',
  'PROBLEM',
  'CHAOS',
  'BREAKPOINT',
  'STRUCTURE',
  'INSIGHT',
  'DECISION',
  'AUTOMATION',
  'ABOUT',
  'CAPABILITIES',
  'CONTACT',
];

const STATES = [
  'SYSTEM LIVE',
  'DATA INGESTED',
  'ANALYZING',
  'PATTERN DETECTED',
  'RISK IDENTIFIED',
  'ACTION READY',
  'LEARNING',
  'OPTIMIZING',
  'AWAITING INPUT',
  'AWAITING INPUT',
  'AWAITING INPUT',
];

export default function HUD() {
  const p = useScrollProgress();
  const idx = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));
  const pct = (p * 100).toFixed(1).padStart(4, '0');

  return (
    <div className="hud" aria-hidden="true">
      <div className="tl">
        <span className="logo-stamp"><img src={logoUrl} alt="PRISM INTELLIGENCE" className="hud-logo" /></span>
        <div className="line soft">● {STATES[idx]}</div>
      </div>
      <div className="tr">
        <div className="line">STAGE {String(idx).padStart(2, '0')} // {STAGES[idx]}</div>
        <div className="line soft">LAT &lt;50MS · LIVE DATA SYNC</div>
      </div>
      <div className="bl">
        <div className="line">PROGRESS // {pct}%</div>
      </div>
      <div className="br">
        <div className="line">OPS STATUS — ACTIVE</div>
        <div className="line soft">DATA CONFIDENCE 98.7%</div>
      </div>
      <div className="bar"><i style={{ width: `${(p * 100).toFixed(2)}%` }} /></div>
    </div>
  );
}
