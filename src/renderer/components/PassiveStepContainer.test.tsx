import React from 'react';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { createProductStore } from '../store';
import { installConciergeBridge } from '../api/testBridge';
import { PassiveStepContainer } from './PassiveStepContainer';
import { passiveStepRunSucceeded } from '../slices/session';
import { workspaceEntered } from '../slices/workspace';

vi.mock('../hooks/store', async () => {
  const actual = await vi.importActual('../hooks/store');
  return {
    ...actual,
    useAppDispatch: vi.fn()
  };
});

import { useAppDispatch } from '../hooks/store';

const mockUseAppDispatch = vi.mocked(useAppDispatch);

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

  it('resumes from a completed plan step to tasks instead of review', () => {
    installConciergeBridge();
    const dispatch = vi.fn();
    mockUseAppDispatch.mockReturnValue(dispatch);

    const store = createProductStore();
    store.dispatch(workspaceEntered({ repo, branch: '014-remove-faux-traffic-lights' }));
    store.dispatch(passiveStepRunSucceeded({
      step: 'plan',
      commitSha: 'plan-sha',
      artifacts: []
    }));

    render(
      <Provider store={store}>
        <PassiveStepContainer step="plan" />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resume Tasks' }));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'workspace/workspaceStepViewed',
      payload: 'tasks'
    }));
  });
});
