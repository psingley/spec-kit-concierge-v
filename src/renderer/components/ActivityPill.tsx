import React from 'react';
import { PixelCSpinner } from './PixelCSpinner';

export type ActivityPillProps = {
  busy: boolean;
  currentStatus: string;
  logRate: number;
  onToggle: () => void;
};

export const ActivityPill = ({ busy, currentStatus, logRate, onToggle }: ActivityPillProps): React.ReactElement => (
  <button type="button" className="activity-pill" onClick={onToggle} aria-live="polite">
    <PixelCSpinner busy={busy} speed={1 + logRate * 2} pixelation={1 + logRate} />
    <span>{currentStatus}</span>
  </button>
);
