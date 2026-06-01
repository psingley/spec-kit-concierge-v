import React from 'react';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import { installConciergeBridge } from '../api/testBridge';
import { PassiveStepContainer } from './PassiveStepContainer';
import { passiveStepRunSucceeded } from '../slices/session';
import { workspaceEntered } from '../slices/workspace';

const repo = { id: 'r1', name: 'concierge', owner: 'org', path: '/work/wt', defaultBranch: 'main' };

describe('PassiveStepContainer artifact reads', () => {
  it('passes the worktree root + a bare artifact name; the IPC resolves the feature dir', async () => {
    installConciergeBridge();
    const read = window.concierge.artifacts!.read as Mock;
    read.mockResolvedValue({ artifactPath: 'plan.md', text: '# Plan', size: 6, mtimeMs: 1 });

    const store = createProductStore();
    // NNN-slug worktree branch (not spec/...) — the renderer must NOT derive the
    // feature dir from it; the IPC resolves it from .specify/feature.json.
    store.dispatch(workspaceEntered({ repo, branch: '014-remove-faux-traffic-lights' }));
    store.dispatch(passiveStepRunSucceeded({
      step: 'plan',
      commitSha: 'plan-sha',
      artifacts: [{ path: 'plan.md', kind: 'markdown', required: true }]
    }));

    render(
      <Provider store={store}>
        <PassiveStepContainer step="plan" />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /plan\.md/ }));

    await waitFor(() => {
      expect(read).toHaveBeenCalledWith(
        expect.objectContaining({ repositoryPath: '/work/wt', artifactPath: 'plan.md' })
      );
    });
  });
});
