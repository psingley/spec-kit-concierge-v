import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Activity } from './Activity';
import activityReducer, { recordActivity } from '../slices/activity';

describe('Activity', () => {
  it('renders real activity entries instead of demo terminal rows', () => {
    render(
      <Activity
        entries={[
          {
            id: 'github-connected',
            timestamp: '2026-05-31T14:30:00.000Z',
            level: 'ok',
            message: 'GitHub connected'
          }
        ]}
        currentStatus="GitHub connected"
        busy={false}
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(screen.getAllByText('GitHub connected')).toHaveLength(2);
    expect(screen.queryByText('gh auth login')).not.toBeInTheDocument();
    expect(screen.getByText('1 lines')).toBeInTheDocument();
  });

  it('keeps rendering real stream entries while busy', () => {
    render(
      <Activity
        entries={[
          {
            id: 'specify-progress',
            timestamp: '2026-05-31T14:31:00.000Z',
            level: 'progress',
            message: 'Bound CLI session/update: writing spec.md'
          }
        ]}
        currentStatus="Bound CLI session/update: writing spec.md"
        busy
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(screen.getAllByText('Bound CLI session/update: writing spec.md')).toHaveLength(2);
    expect(screen.queryByText('git checkout -b spec/draft-rwgq')).not.toBeInTheDocument();
  });

  it('renders one growing assistant row while keeping tool rows separate', () => {
    const { container } = render(
      <Activity
        entries={[
          {
            id: 'assistant-1',
            timestamp: '2026-06-03T00:00:00.000Z',
            level: 'progress',
            kind: 'assistant-text',
            message: 'Hello world'
          },
          {
            id: 'tool-1',
            timestamp: '2026-06-03T00:00:01.000Z',
            level: 'info',
            kind: 'tool-call',
            message: 'Running tool read'
          }
        ]}
        currentStatus="Hello world"
        busy
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(container.querySelectorAll('.activity-stream .log-line.assistant-text')).toHaveLength(1);
    expect(container.querySelectorAll('.activity-stream .log-line.tool-call')).toHaveLength(1);
    expect(screen.getByText('Running tool read')).toBeInTheDocument();
  });

  it('renders no more log lines than the capped activity slice length', () => {
    let state = activityReducer(undefined, { type: 'test/init' });
    for (let index = 0; index < 300; index += 1) {
      state = activityReducer(state, recordActivity({
        timestamp: '2026-06-03T00:00:00.000Z',
        level: 'info',
        message: `entry ${index}`
      }));
    }

    const { container } = render(
      <Activity
        entries={state.entries}
        currentStatus="entry 299"
        busy={false}
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(state.entries).toHaveLength(256);
    expect(container.querySelectorAll('.activity-stream .log-line')).toHaveLength(state.entries.length);
  });
});
