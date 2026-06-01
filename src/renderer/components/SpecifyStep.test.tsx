import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpecifyStep } from './SpecifyStep';

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
