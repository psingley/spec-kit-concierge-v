import React from 'react';
import type { ActivityEntry } from '../slices/activity';

export type ActivityProps = {
  entries: ActivityEntry[];
  currentStatus: string;
  busy: boolean;
  hangSuspected?: boolean;
  side: 'left' | 'right' | 'hidden';
  onClear?: () => void;
  onScrollPositionChanged?: (metrics: ActivityScrollMetrics) => void;
};

export type ActivityScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

const glyphFor = (level: string): string => {
  if (level === 'ok' || level === 'success') return '✓';
  if (level === 'warn' || level === 'warning') return '!';
  if (level === 'err' || level === 'error') return '✗';
  return '→';
};

const renderMessage = (message: string): string => message;
const classForEntry = (entry: ActivityEntry): string =>
  ['log-line', entry.level, entry.kind ?? entry.event].filter(Boolean).join(' ');

export const Activity = ({ entries, currentStatus, busy, hangSuspected = false, side, onClear }: ActivityProps): React.ReactElement | null => {
  if (side === 'hidden') return null;
  const stalled = busy && hangSuspected;
  return (
    <aside className={`activity ${side}`} aria-label="Activity log">
      <div className="activity-head">
        <div className="h">▣<span>Activity</span></div>
        <div className={`activity-status ${busy ? '' : 'idle'} ${stalled ? 'stalled' : ''}`}>
          {stalled ? <span className="dot" data-vd-role="activity-stalled-dot" /> : busy ? <span className="spinner sm" data-vd-role="spinner" /> : <span className="dot" data-vd-role="activity-idle-dot" />}
          <span>{stalled ? 'possibly stalled' : busy ? 'running' : 'idle'}</span>
        </div>
      </div>
      <div className="activity-now">
        {busy ? <span className="spinner" data-vd-role="spinner" /> : <span className="pulse-dot" data-vd-role="activity-pulse-dot" />}
        <div>
          <div className="label">Current</div>
          <div className="now-text">{renderMessage(currentStatus)}</div>
        </div>
      </div>
      <div className="activity-stream" role="log" aria-label="Activity log entries" aria-live="polite" tabIndex={0}>
        {entries.length === 0 ? (
          <div className="log-line muted">
            <span className="ts">--:--:--</span>
            <span className="glyph" aria-hidden="true">{glyphFor('muted')}</span>
            <span className="msg">No activity yet.</span>
          </div>
        ) : entries.map((entry) => (
          <div key={entry.id} className={classForEntry(entry)}>
            <span className="ts">{entry.timestamp}</span>
            <span className="glyph" aria-hidden="true">{glyphFor(entry.level)}</span>
            <span className="msg">{renderMessage(entry.message)}</span>
          </div>
        ))}
      </div>
      <div className="activity-foot">
        <div className="seek"><span>{entries.length} lines</span><span>·</span><span>auto-scroll</span></div>
        <button type="button" className="icon-btn" onClick={onClear} title="Clear">Clear</button>
      </div>
    </aside>
  );
};
