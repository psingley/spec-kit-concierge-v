import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './Stepper';
import type { StepName, StepState } from '../slices/steps';

const states: Record<StepName, StepState> = {
  specify: 'complete',
  clarify: 'pending',
  plan: 'not_available',
  tasks: 'not_available',
  analyze: 'not_available',
  review: 'not_available'
};

describe('Stepper visual contract', () => {
  it('keeps tab semantics while rendering the orb track markers required by visual diff', () => {
    const onSelectStep = vi.fn();
    const { container } = render(<Stepper states={states} viewedStep="clarify" onSelectStep={onSelectStep} />);

    expect(screen.getByRole('tablist', { name: /spec kit steps/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clarify' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Plan' })).toBeDisabled();
    expect(container.querySelector('[data-vd-role="stepper-track"]')).toBeInTheDocument();
    expect(container.querySelector('[data-vd-role="stepper-track-fill"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-vd-role="step-orb"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-vd-role="step-separator"]')).toHaveLength(5);

    fireEvent.click(screen.getByRole('tab', { name: 'Specify' }));
    expect(onSelectStep).toHaveBeenCalledWith('specify');
  });
});
