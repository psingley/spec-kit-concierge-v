import React from 'react';
import type { StepName, StepState } from '../slices/steps';

export type StepperProps = {
  states: Record<StepName, StepState>;
  viewedStep: StepName;
  onSelectStep: (step: StepName) => void;
};

export const stepOrder: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];

export const Stepper = ({ states, viewedStep, onSelectStep }: StepperProps): React.ReactElement => (
  <nav className="stepper" role="tablist" aria-label="Spec Kit steps">
    {stepOrder.map((step) => {
      const state = states[step];
      const disabled = state === 'not_available';
      return (
        <button
          key={step}
          type="button"
          role="tab"
          aria-selected={viewedStep === step}
          aria-disabled={disabled}
          disabled={disabled}
          className={`step-tab ${state}`}
          data-testid={`step-${step}`}
          onClick={() => onSelectStep(step)}
        >
          <span>{step}</span>
          <strong>{state}</strong>
        </button>
      );
    })}
  </nav>
);
