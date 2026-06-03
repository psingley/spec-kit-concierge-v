import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtifactViewer } from './ArtifactViewer';

describe('ArtifactViewer overlay shell', () => {
  it('renders loading, error, markdown, tasks, and plain text inside the modal veil shell', () => {
    const { container, rerender } = render(
      <ArtifactViewer path="plan.md" text="" loading onClose={vi.fn()} />
    );

    expect(container.querySelector('.modal-veil')).toBeInTheDocument();
    expect(container.querySelector('[data-vd-role="modal-veil"]')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'plan.md' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading artifact...');

    rerender(<ArtifactViewer path="plan.md" text="" loading={false} error="Unable to read artifact." onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to read artifact.');

    rerender(<ArtifactViewer path="plan.md" text="# Plan" loading={false} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument();

    rerender(<ArtifactViewer path="tasks.md" text="" loading={false} tasks={[{ id: 'T001', title: 'Write tests', dependencies: [], files: [] }]} onClose={vi.fn()} />);
    expect(screen.getByText('T001')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();

    rerender(<ArtifactViewer path="notes.txt" text="plain notes" loading={false} onClose={vi.fn()} />);
    expect(screen.getByText('plain notes')).toBeInTheDocument();
  });

  it('dismisses from close button and backdrop click without a modal-backdrop class', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ArtifactViewer path="spec.md" text="# Spec" loading={false} onClose={onClose} />
    );

    expect(container.querySelector('.modal-backdrop')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close artifact viewer' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.modal-veil')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
