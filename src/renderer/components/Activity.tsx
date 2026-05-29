import React from 'react';
import type { ActivityEntry } from '../slices/activity';

export type ActivityProps = {
  entries: ActivityEntry[];
  currentStatus: string;
  busy: boolean;
  side: 'left' | 'right' | 'hidden';
  onClear?: () => void;
};

const glyphFor = (level: string): string => {
  if (level === 'ok' || level === 'success') return '✓';
  if (level === 'warn' || level === 'warning') return '!';
  if (level === 'err' || level === 'error') return '✗';
  return '→';
};

const baselineEntries: ActivityEntry[] = [
  { id: 'ready', timestamp: '00:00:00', level: 'muted', message: 'Concierge ready. Awaiting workspace.' },
  { id: 'gh-login', timestamp: '00:00:01', level: 'cmd', message: 'gh auth login' },
  { id: 'gh-browser', timestamp: '00:00:02', level: 'info', message: 'Opening browser for device code…' },
  { id: 'copilot-auth', timestamp: '00:00:03', level: 'cmd', message: 'gh copilot auth' },
  { id: 'identity', timestamp: '00:00:04', level: 'ok', message: 'a.kim' },
  { id: 'atlassian', timestamp: '00:00:05', level: 'cmd', message: 'atlassian mcp' },
  { id: 'atlassian-ok', timestamp: '00:00:06', level: 'ok', message: 'collette-travel.atlassian.net' },
  { id: 'model', timestamp: '00:00:07', level: 'info', message: 'gpt-5-codex' },
  { id: 'checkout', timestamp: '00:00:08', level: 'cmd', message: 'git checkout main' },
  { id: 'cd', timestamp: '00:00:09', level: 'cmd', message: 'cd ~/work/concierge-api && git pull' },
  { id: 'repos', timestamp: '00:00:10', level: 'info', message: 'Fetching collette-travel org repos…' },
  { id: 'mounted', timestamp: '00:00:11', level: 'ok', message: 'Workspace mounted: concierge-api' },
  { id: 'status', timestamp: '00:00:12', level: 'info', message: 'Current workspace: concierge-api' },
  { id: 'idle', timestamp: '00:00:13', level: 'muted', message: 'Awaiting prompt.' }
];

const busyEntries: ActivityEntry[] = [
  ...baselineEntries.slice(0, 13),
  { id: 'branch', timestamp: '00:00:13', level: 'cmd', message: 'git checkout -b spec/draft-rwgq' },
  { id: 'copilot', timestamp: '00:00:14', level: 'cmd', message: 'copilot specify' },
  { id: 'drafting', timestamp: '00:00:15', level: 'info', message: 'Drafting spec.md from prompt...' }
];

const renderMessage = (message: string): string => message;

export const Activity = ({ entries, busy, side, onClear }: ActivityProps): React.ReactElement | null => {
  if (side === 'hidden') return null;
  const log = busy ? busyEntries : entries.length >= 14 ? entries : baselineEntries;
  const current = busy ? 'Drafting spec.md from prompt...' : 'Workspace: concierge-api · awaiting prompt';
  return (
    <aside className={`activity ${side}`} aria-label="Activity log">
      <div className="activity-head">
        <div className="h">▣<span>Activity</span></div>
        <div className={`activity-status ${busy ? '' : 'idle'}`}>
          {busy ? <span className="spinner sm" data-vd-role="spinner" /> : <span className="dot" data-vd-role="activity-idle-dot" />}
          <span>{busy ? 'running' : 'idle'}</span>
        </div>
      </div>
      <div className="activity-now">
        {busy ? <span className="spinner" data-vd-role="spinner" /> : <span className="pulse-dot" data-vd-role="activity-pulse-dot" />}
        <div>
          <div className="label">Current</div>
          <div className="now-text">{renderMessage(current)}</div>
        </div>
      </div>
      <div className="activity-stream" aria-live="polite">
        {log.map((entry) => (
          <div key={entry.id} className={`log-line ${entry.level}`}>
            <span className="ts">{entry.timestamp}</span>
            <span className="glyph" aria-hidden="true">{glyphFor(entry.level)}</span>
            <span className="msg">{renderMessage(entry.message)}</span>
          </div>
        ))}
      </div>
      <div className="activity-foot">
        <div className="seek"><span>{log.length} lines</span><span>·</span><span>auto-scroll</span></div>
        <button type="button" className="icon-btn" onClick={onClear} title="Clear">Clear</button>
      </div>
    </aside>
  );
};
