import React from 'react';
import type { ActivityEntry } from '../slices/activity';

export type ActivityProps = {
  entries: ActivityEntry[];
  currentStatus: string;
  busy: boolean;
  side: 'left' | 'right' | 'hidden';
};

const glyphFor = (level: string): string => {
  if (level === 'ok' || level === 'success') return '✓';
  if (level === 'warn' || level === 'warning') return '!';
  if (level === 'err' || level === 'error') return '✗';
  return '→';
};

export const Activity = ({ entries, currentStatus, busy, side }: ActivityProps): React.ReactElement | null => {
  if (side === 'hidden') return null;
  return (
    <aside className={`activity ${side}`} aria-label="Activity log">
      <p role="status" aria-live="polite">{busy ? currentStatus : `Idle - ${currentStatus}`}</p>
      <ol aria-live="polite">
        {entries.map((entry) => <li key={entry.id}><span aria-hidden="true">{glyphFor(entry.level)}</span> {entry.message}</li>)}
      </ol>
    </aside>
  );
};
