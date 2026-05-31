import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Activity } from './Activity';

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
});
