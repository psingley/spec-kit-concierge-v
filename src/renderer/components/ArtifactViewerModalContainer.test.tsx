import React from 'react';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { installConciergeBridge } from '../api/testBridge';
import { createProductStore } from '../store';
import { artifactViewerOpened } from '../slices/ui';
import { workspaceEntered } from '../slices/workspace';
import { ArtifactViewerModalContainer } from './ArtifactViewerModalContainer';

const repo = { id: 'r1', name: 'concierge', owner: 'org', path: '/work/wt', defaultBranch: 'main' };

const renderOpenContainer = (path: string, origin: 'passive' | 'review' = 'passive') => {
  installConciergeBridge({
    artifacts: {
      read: vi.fn(async (request: unknown) => {
        const { artifactPath } = request as { artifactPath: string };
        return { artifactPath, text: '# Artifact body', size: 15, mtimeMs: 1 };
      })
    },
    tasksDetail: {
      read: vi.fn(async () => ({ tasks: [{ id: 'T001', title: 'Build review overlay', phase: 'GREEN', dependencies: [], files: [], acceptance: 'visible' }] }))
    },
    reviewEvidence: {
      read: vi.fn(async (request: unknown) => {
        const { artifactPath } = request as { artifactPath: string };
        return { artifactPath, text: '# Review body', size: 13, mtimeMs: 1 };
      })
    }
  });
  const store = createProductStore();
  store.dispatch(workspaceEntered({ repo, branch: '017-fix-file-display' }));
  store.dispatch(artifactViewerOpened({ path, origin }));
  const utils = render(
    <Provider store={store}>
      <button type="button">origin button</button>
      <ArtifactViewerModalContainer />
    </Provider>
  );
  return { store, ...utils };
};

const renderClosedContainer = () => {
  installConciergeBridge();
  const store = createProductStore();
  store.dispatch(workspaceEntered({ repo, branch: '017-fix-file-display' }));
  const utils = render(
    <Provider store={store}>
      <button type="button">origin button</button>
      <ArtifactViewerModalContainer />
    </Provider>
  );
  return { store, ...utils };
};

describe('ArtifactViewerModalContainer', () => {
  it('routes relative artifacts through artifacts:read and renders the shared dialog', async () => {
    renderOpenContainer('plan.md');

    await waitFor(() => {
      expect(window.concierge.artifacts!.read).toHaveBeenCalledWith({ repositoryPath: '/work/wt', artifactPath: 'plan.md' });
    });
    expect(await screen.findByRole('dialog', { name: 'plan.md' })).toHaveAttribute('aria-modal', 'true');
    expect(await screen.findByRole('heading', { name: 'Artifact body' })).toBeInTheDocument();
  });

  it('routes tasks artifacts through tasks:detail', async () => {
    renderOpenContainer('tasks.md', 'review');

    await waitFor(() => {
      expect(window.concierge.tasksDetail!.read).toHaveBeenCalledWith({ repositoryPath: '/work/wt', artifactPath: 'tasks.md' });
    });
    expect(await screen.findByText('T001')).toBeInTheDocument();
    expect(screen.getByText('Build review overlay')).toBeInTheDocument();
  });

  it('routes absolute review evidence paths through review:evidence body mode', async () => {
    renderOpenContainer('/work/wt/specs/0014/evidence.md', 'review');

    await waitFor(() => {
      expect(window.concierge.reviewEvidence!.read).toHaveBeenCalledWith({ repositoryPath: '/work/wt', artifactPath: '/work/wt/specs/0014/evidence.md', mode: 'body' });
    });
    expect(await screen.findByRole('heading', { name: 'Review body' })).toBeInTheDocument();
  });

  it('closes on Escape and backdrop click while clearing shared UI state', async () => {
    const { store, container } = renderOpenContainer('spec.md');

    await screen.findByRole('dialog', { name: 'spec.md' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(store.getState().ui.showArtifactViewer).toBe(false);
    expect(screen.queryByRole('dialog', { name: 'spec.md' })).not.toBeInTheDocument();

    store.dispatch(artifactViewerOpened({ path: 'spec.md', origin: 'passive' }));
    await screen.findByRole('dialog', { name: 'spec.md' });
    fireEvent.click(container.querySelector('.modal-veil')!);
    expect(store.getState().ui.showArtifactViewer).toBe(false);
  });

  it('returns focus to the invoking control when the modal closes', async () => {
    const { store } = renderClosedContainer();
    const originButton = screen.getByRole('button', { name: 'origin button' });
    originButton.focus();

    act(() => {
      store.dispatch(artifactViewerOpened({ path: 'plan.md', origin: 'passive' }));
    });
    await screen.findByRole('dialog', { name: 'plan.md' });
    expect(screen.getByRole('button', { name: 'Close artifact viewer' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Close artifact viewer' }));
    expect(originButton).toHaveFocus();
  });
});
