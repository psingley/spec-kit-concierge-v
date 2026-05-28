import React from 'react';
import type { ActivityEntry } from '../slices/activity';

export type ActivityProps = {
  entries: ActivityEntry[];
  currentStatus: string;
  busy: boolean;
  side: 'left' | 'right' | 'hidden';
};

export const Activity = ({ entries, currentStatus, busy, side }: ActivityProps): React.ReactElement | null => {
  if (side === 'hidden') return null;
  return (
    <aside className={`activity ${side}`} aria-label="Activity log">
      <p role="status" aria-live="polite">{busy ? currentStatus : `Idle - ${currentStatus}`}</p>
      <ol aria-live="polite">
        {entries.map((entry) => <li key={entry.id}>{entry.message}</li>)}
      </ol>
    </aside>
  );
};
