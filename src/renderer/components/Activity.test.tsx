import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Activity } from './Activity';
import activityReducer, { assistantTextReceived, recordActivity } from '../slices/activity';

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

  it('renders reducer-accumulated assistant fragments as one row with separate status rows', () => {
    let state = activityReducer(undefined, assistantTextReceived({
      timestamp: '2026-06-03T00:00:00.000Z',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-1',
      text: 'Hel'
    }));
    state = activityReducer(state, assistantTextReceived({
      timestamp: '2026-06-03T00:00:01.000Z',
      step: 'plan',
      sessionId: 'plan-1',
      messageId: 'message-1',
      text: 'lo'
    }));
    state = activityReducer(state, recordActivity({
      timestamp: '2026-06-03T00:00:02.000Z',
      level: 'info',
      kind: 'status-update',
      event: 'status-update',
      message: 'Plan updated',
      step: 'plan',
      sessionId: 'plan-1'
    }));

    const { container } = render(
      <Activity
        entries={state.entries}
        currentStatus={state.currentStatus}
        busy={state.busy}
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(container.querySelectorAll('.activity-stream .log-line.assistant-text')).toHaveLength(1);
    expect(container.querySelector('.activity-stream .log-line.assistant-text .msg')).toHaveTextContent('Hello');
    expect(container.querySelectorAll('.activity-stream .log-line.status-update')).toHaveLength(1);
    expect(container.querySelector('.activity-stream .log-line.status-update .msg')).toHaveTextContent('Plan updated');
  });

  it('surfaces a stall badge while a busy stream is suspected hung', () => {
    render(
      <Activity
        entries={[]}
        currentStatus="Running plan"
        busy
        hangSuspected
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('possibly stalled')).toBeInTheDocument();
    expect(screen.queryByText('running')).not.toBeInTheDocument();
  });

  it('keeps a long-running capped stream visible without blanking', () => {
    let state = activityReducer(undefined, { type: 'test/init' });
    for (let index = 0; index < 600; index += 1) {
      state = activityReducer(state, recordActivity({
        timestamp: `2026-06-03T00:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
        level: 'info',
        kind: 'status-update',
        event: 'status-update',
        message: `long run event ${index}`
      }));
    }

    const { container } = render(
      <Activity
        entries={state.entries}
        currentStatus="Still running"
        busy
        hangSuspected
        side="right"
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('possibly stalled')).toBeInTheDocument();
    expect(screen.queryByText('No activity yet.')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.activity-stream .log-line')).toHaveLength(256);
    expect(screen.getByText('long run event 599')).toBeInTheDocument();
  });
});
