import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpecifyStep } from './SpecifyStep';

const renderComplete = (requireScroll: boolean) => {
  const onBegin = vi.fn();
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
    />
  );
  return { onBegin };
};

describe('SpecifyStep scroll gate', () => {
  it('keeps the complete-state continue action locked until the review is fully scrolled', () => {
    const { onBegin } = renderComplete(true);

    const continueButton = screen.getByRole('button', { name: /continue/i });
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
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it('leaves the complete-state continue action unlocked when the scroll gate is disabled', () => {
    const { onBegin } = renderComplete(false);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(onBegin).toHaveBeenCalledTimes(1);
  });
});
