import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpecifyStep } from './SpecifyStep';
import { SpecifyStepContainer } from './SpecifyStepContainer';
import { createProductStore } from '../store';
import { specifyPromptChanged } from '../slices/session';
import { workspaceEntered } from '../slices/workspace';

const runSpecify = vi.fn();

vi.mock('../api/copilotSpecify.endpoint', () => ({
  copilotSpecifyApi: {
    useRunSpecifyMutation: () => [runSpecify]
  }
}));

const renderComplete = (requireScroll: boolean) => {
  const onBegin = vi.fn();
  const onAdvanceToClarify = vi.fn();
  render(
    <SpecifyStep
      prompt="Build it"
      running={false}
      specMarkdown={'# Spec\n\n## Acceptance Criteria\n\n- Read the whole thing.'}
      failureReason={null}
      canBegin
      requireScroll={requireScroll}
      onPromptChange={vi.fn()}
      onBegin={onBegin}
      onAdvanceToClarify={onAdvanceToClarify}
    />
  );
  return { onBegin, onAdvanceToClarify };
};

describe('SpecifyStep scroll gate', () => {
  it('keeps the complete-state continue action locked until the review is fully scrolled', () => {
    const { onAdvanceToClarify } = renderComplete(true);

    const continueButton = screen.getByRole('button', { name: /clarify/i });
    expect(continueButton).toBeDisabled();

    const review = screen.getByTestId('spec-review-scroll');
    Object.defineProperties(review, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, value: 300 }
    });
    fireEvent.scroll(review);

    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(onAdvanceToClarify).toHaveBeenCalledTimes(1);
  });

  it('leaves the complete-state continue action unlocked when the scroll gate is disabled', () => {
    const { onAdvanceToClarify } = renderComplete(false);

    const continueButton = screen.getByRole('button', { name: /clarify/i });
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(onAdvanceToClarify).toHaveBeenCalledTimes(1);
  });
});

describe('SpecifyStep CTA routing', () => {
  it('advances the view (not re-run specify) when the post-completion Clarify CTA is clicked', () => {
    const { onBegin, onAdvanceToClarify } = renderComplete(false);

    const clarifyButton = screen.getByRole('button', { name: /clarify/i });
    fireEvent.click(clarifyButton);

    expect(onAdvanceToClarify).toHaveBeenCalledTimes(1);
    expect(onBegin).not.toHaveBeenCalled();
  });

  it('runs specify when the initial Begin specify button is clicked', () => {
    const onBegin = vi.fn();
    const onAdvanceToClarify = vi.fn();
    render(
      <SpecifyStep
        prompt="Build it"
        running={false}
        specMarkdown=""
        failureReason={null}
        canBegin
        requireScroll={false}
        onPromptChange={vi.fn()}
        onBegin={onBegin}
        onAdvanceToClarify={onAdvanceToClarify}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /begin specify/i }));

    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onAdvanceToClarify).not.toHaveBeenCalled();
  });
});

describe('SpecifyStepContainer branch-null sessions', () => {
  beforeEach(() => {
    runSpecify.mockReset();
  });

  it('begins specify with the repo default branch when the entered worktree session has branch=null', () => {
    const store = createProductStore();
    const repo = {
      id: 'repo-1',
      name: 'concierge',
      owner: 'octo',
      path: '/work/concierge',
      defaultBranch: 'main'
    };
    store.dispatch(workspaceEntered({ repo, branch: null }));
    store.dispatch(specifyPromptChanged('Build the router'));

    render(
      <Provider store={store}>
        <SpecifyStepContainer />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /begin specify/i }));

    expect(runSpecify).toHaveBeenCalledWith({
      repositoryPath: '/work/concierge',
      branch: 'main',
      prompt: 'Build the router',
      modelId: null
    });
  });
});
