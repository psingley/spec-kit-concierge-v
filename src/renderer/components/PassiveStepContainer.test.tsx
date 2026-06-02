import React from 'react';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    const dispatch = vi.fn();
    mockUseAppDispatch.mockReturnValue(dispatch);

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

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ui/artifactViewerOpened',
      payload: { path: 'plan.md', origin: 'passive' }
    }));
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

  it('shows manifest nudge and audit only from reconciled needs-attention state', async () => {
    installConciergeBridge({
      sessionManifest: {
        read: vi.fn(),
        reconcile: vi.fn(async () => ({ step: 'tasks', status: 'needs-attention', canNudge: true })),
        auditTrail: vi.fn(async () => ({ audit: [{ event: 'nudge-action', step: 'tasks', message: 'refresh failed marker' }] })),
        doctorStatus: vi.fn(),
        nudge: vi.fn(async () => ({ result: 'repaired', message: 'repaired safely' }))
      }
    });

    const store = createProductStore();
    store.dispatch(workspaceEntered({ repo, branch: '014-remove-faux-traffic-lights' }));

    render(
      <Provider store={store}>
        <PassiveStepContainer step="tasks" />
      </Provider>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Set branch right for tasks/i }));

    await waitFor(() => {
      expect(window.concierge.sessionManifest!.nudge).toHaveBeenCalledWith({ repositoryPath: '/work/wt' });
    });
    expect(await screen.findByText(/nudge-action: refresh failed marker/i)).toBeVisible();
  });
});
