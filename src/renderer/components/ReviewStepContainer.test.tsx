import React from 'react';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { installConciergeBridge } from '../api/testBridge';
import { createProductStore } from '../store';
import { workspaceEntered } from '../slices/workspace';
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
});
