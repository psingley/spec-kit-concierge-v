import React from 'react';
import { Ico } from './Icons';
import { PixelCSpinner } from './PixelCSpinner';

export type ActivityPillProps = {
  busy: boolean;
  currentStatus: string;
  label?: string;
  logRate: number;
  onToggle: () => void;
};

export const ActivityPill = ({ busy, label, logRate, onToggle }: ActivityPillProps): React.ReactElement => {
  const statusLabel = busy ? label ?? 'Running' : 'Idle';
  return (
    <button type="button" className={`activity-pill ${busy ? 'is-busy' : ''}`} onClick={onToggle} aria-live="polite" aria-label={statusLabel}>
      <span className="ap-label">{statusLabel}</span>
      <span className="ap-term" data-vd-role="activity-terminal-icon" aria-hidden="true">
        <Ico.Term size={12} />
      </span>
      <span className="ap-divider" data-vd-role="activity-pill-divider" aria-hidden="true" />
      <span className="ap-spinner-wrap">
        <PixelCSpinner busy={busy} size={9} cell={2} color={busy ? 'var(--accent)' : undefined} speed={1 + logRate * 2} pixelation={busy ? 1 : 1 + logRate} />
      </span>
    </button>
  );
};
