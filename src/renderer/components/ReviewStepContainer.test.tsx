import React from 'react';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { installConciergeBridge } from '../api/testBridge';
import { createProductStore } from '../store';
import { workspaceEntered } from '../slices/workspace';
import { ReviewStepContainer } from './ReviewStepContainer';
import { ModalHost } from './ModalHost';

const repo = { id: 'r1', name: 'concierge', owner: 'org', path: '/work/wt', defaultBranch: 'main' };

describe('ReviewStepContainer manifest recovery', () => {
  it('mirrors manifest nudge and audit state into the review surface', async () => {
    installConciergeBridge({
      reviewEvidence: {
        read: vi.fn(async () => ({
          featureDir: 'specs/0013-hybrid-manifest-architecture',
          steps: [],
          artifacts: [],
          clarifications: [],
          analyzeReport: null
        }))
      },
      sessionManifest: {
        read: vi.fn(),
        reconcile: vi.fn(async () => ({ step: 'review', status: 'needs-attention', canNudge: true })),
        auditTrail: vi.fn(async () => ({ audit: [{ event: 'nudge-action', step: 'review', message: 'human escalation required' }] })),
        doctorStatus: vi.fn(),
        nudge: vi.fn(async () => ({ result: 'escalated', message: 'Ambiguity escalates to the human' }))
      }
    });
    const store = createProductStore();
    store.dispatch(workspaceEntered({ repo, branch: '014-remove-faux-traffic-lights' }));

    render(
      <Provider store={store}>
        <ReviewStepContainer />
      </Provider>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Set branch right for review/i }));

    await waitFor(() => {
      expect((window.concierge.sessionManifest!.nudge as Mock)).toHaveBeenCalledWith({ repositoryPath: '/work/wt' });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Ambiguity escalates to the human/i);
    expect(await screen.findByText(/nudge-action: human escalation required/i)).toBeVisible();
  });

  it('opens review task details through the shared ModalHost artifact viewer path', async () => {
    installConciergeBridge({
      reviewEvidence: {
        read: vi.fn(async (request: unknown) => (request as { mode?: string }).mode === 'body' ? ({
          artifactPath: '/work/wt/specs/0014/evidence.md',
          text: '# Evidence',
          size: 10,
          mtimeMs: 1
        }) : ({
          featureDir: 'specs/0014-fix-file-display',
          steps: [],
          artifacts: [
            { path: 'tasks.md', kind: 'markdown', step: 'tasks', commitSha: 'tasks-sha', required: true }
          ],
          clarifications: [],
          analyzeReport: null
        }))
      },
      tasksDetail: {
        read: vi.fn(async () => ({
          tasks: [{ id: 'T001', title: 'Render task details in ModalHost', phase: 'GREEN', dependencies: [], files: [], acceptance: 'overlay' }]
        }))
      }
    });
    const store = createProductStore();
    store.dispatch(workspaceEntered({ repo, branch: '017-fix-file-display' }));

    const { container } = render(
      <Provider store={store}>
        <ReviewStepContainer />
        <ModalHost />
      </Provider>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Open/i }));

    await waitFor(() => {
      expect(window.concierge.tasksDetail!.read).toHaveBeenCalledWith({ repositoryPath: '/work/wt', artifactPath: 'tasks.md' });
    });
    expect(await screen.findByRole('dialog', { name: 'tasks.md' })).toBeInTheDocument();
    expect(await screen.findByText('Render task details in ModalHost')).toBeInTheDocument();
    expect(container.querySelector('.modal-veil')).toHaveAttribute('data-vd-role', 'modal-veil');
    expect(container.querySelector('.modal-backdrop')).not.toBeInTheDocument();
  });
});
