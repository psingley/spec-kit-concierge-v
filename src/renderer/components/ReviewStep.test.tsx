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
  it('routes task details through the artifact open callback without rendering an inline backdrop', () => {
    const onArtifactOpen = vi.fn();
    const { container } = render(
      <ReviewStep evidence={evidence} loading={false} onArtifactOpen={onArtifactOpen} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Open/i }));

    expect(onArtifactOpen).toHaveBeenCalledWith('tasks.md');
    expect(container.querySelector('.modal-backdrop')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Task details/i })).not.toBeInTheDocument();
  });
});
