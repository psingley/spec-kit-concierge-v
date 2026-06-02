import React from 'react';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { installConciergeBridge } from '../api/testBridge';
import { createProductStore } from '../store';
import { workspaceEntered } from '../slices/workspace';
import { ModalHost } from './ModalHost';
import { ReviewStepContainer } from './ReviewStepContainer';

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
  it('opens a JIRA dry-run preview modal from the Review step when Atlassian auth is ok', async () => {
    const unsubscribe = vi.fn();
    installConciergeBridge({
      reviewEvidence: {
        read: vi.fn(async () => ({
          featureDir: 'specs/0015-send-jira-button',
          steps: [],
          artifacts: [
            { path: 'tasks.md', kind: 'markdown', step: 'tasks', commitSha: 'tasks-sha', required: true }
          ],
          clarifications: [],
          analyzeReport: null
        }))
      },
      jiraSubmission: {
        dryRun: vi.fn(async () => ({
          featureDir: 'specs/0015-send-jira-button',
          stateDir: '/work/wt/specs/0015-send-jira-button/jira-submission-state',
          nodes: [
            { id: '0015-send-jira-button-epic', issueType: 'Epic', summary: 'Send to JIRA button', parentId: null, labels: ['spec-kit', 'SKC-idem-abcdef123456'] }
          ],
          warnings: []
        })),
        submit: vi.fn(async () => ({ subscriptionId: 'sub-1', accepted: true, featureDir: 'specs/0015-send-jira-button' })),
        subscribeSubmit: vi.fn(() => unsubscribe)
      }
    });
    const store = createProductStore();
    store.dispatch(workspaceEntered({ repo, branch: '017-send-jira-button' }));
    store.dispatch({ type: 'auth/atlassianMcpStatusHydrated', payload: { state: 'authenticated', message: 'ok' } });

    const { container } = render(
      <Provider store={store}>
        <ReviewStepContainer />
        <ModalHost />
      </Provider>
    );

    const sendButton = await screen.findByRole('button', { name: /Send to JIRA/i });
    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(window.concierge.jiraSubmission!.dryRun).toHaveBeenCalledWith({ repositoryPath: '/work/wt' });
    });
    expect(await screen.findByRole('dialog', { name: /JIRA dry-run preview/i })).toBeInTheDocument();
    expect(await screen.findByText('Send to JIRA button')).toBeVisible();
    expect(container.querySelector('.modal-veil')).toHaveAttribute('data-vd-role', 'modal-veil');
  });
});
