import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReviewEvidence } from '../api/reviewEvidence.factory';
import { ReviewStep } from './ReviewStep';

const evidence: ReviewEvidence = {
  featureDir: 'specs/0014-fix-file-display',
  steps: [],
  artifacts: [
    { path: 'tasks.md', kind: 'markdown', step: 'tasks', commitSha: 'tasks-sha', required: true }
  ],
  clarifications: [],
  analyzeReport: null
};

describe('ReviewStep presentation', () => {
  it('routes task details through the artifact open callback and local task modal', () => {
    const onArtifactOpen = vi.fn();
    render(
      <ReviewStep
        evidence={evidence}
        loading={false}
        artifactPath={null}
        artifactText=""
        artifactLoading={false}
        artifactTasks={[]}
        onArtifactOpen={onArtifactOpen}
        onArtifactClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Open/i }));

    expect(onArtifactOpen).toHaveBeenCalledWith('tasks.md');
    expect(screen.getByRole('dialog', { name: /Task details/i })).toBeInTheDocument();
  });

  it('renders Send to JIRA enabled only when Atlassian auth and tasks.md are present', () => {
    const onSendToJira = vi.fn();
    const { rerender } = render(
      <ReviewStep
        evidence={evidence}
        loading={false}
        artifactPath={null}
        artifactText=""
        artifactLoading={false}
        artifactTasks={[]}
        onArtifactOpen={vi.fn()}
        onArtifactClose={vi.fn()}
        jiraAvailable={false}
        jiraDisabledReason="Atlassian auth required"
        onSendToJira={onSendToJira}
      />
    );

    expect(screen.getByRole('button', { name: /Send to JIRA/i })).toBeDisabled();
    expect(screen.getByText('Atlassian auth required')).toBeVisible();

    rerender(
      <ReviewStep
        evidence={evidence}
        loading={false}
        artifactPath={null}
        artifactText=""
        artifactLoading={false}
        artifactTasks={[]}
        onArtifactOpen={vi.fn()}
        onArtifactClose={vi.fn()}
        jiraAvailable
        onSendToJira={onSendToJira}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Send to JIRA/i }));

    expect(onSendToJira).toHaveBeenCalledTimes(1);
  });
});
