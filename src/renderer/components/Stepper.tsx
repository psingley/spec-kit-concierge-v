import React from 'react';
import type { StepName, StepState } from '../slices/steps';

export type StepperProps = {
  states: Record<StepName, StepState>;
  viewedStep: StepName;
  onSelectStep: (step: StepName) => void;
};

// Intentional design deviation: the fetched prototype swaps Tasks and Analyze,
// but constitution v1.0.4 and ROADMAP_DECISIONS govern the shipped step order.
export const stepOrder: StepName[] = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'];

const labels: Record<StepName, string> = {
  specify: 'Specify',
  clarify: 'Clarify',
  plan: 'Plan',
  tasks: 'Tasks',
  analyze: 'Analyze',
  review: 'Review'
};

const completedCount = (states: Record<StepName, StepState>): number =>
  stepOrder.filter((step) => states[step] === 'complete').length;

export const Stepper = ({ states, viewedStep, onSelectStep }: StepperProps): React.ReactElement => {
  const fillPercent = (completedCount(states) / (stepOrder.length - 1)) * 100;
  return (
    <nav className="stepper" role="tablist" aria-label="Spec Kit steps">
      {stepOrder.map((step, index) => {
        const state = states[step];
        const disabled = state === 'not_available';
        const selected = viewedStep === step;
        return (
          <React.Fragment key={step}>
            {index > 0 && <span className={`step-sep sep-${state}`} data-vd-role="step-separator" aria-hidden="true" />}
            <button
              type="button"
              role="tab"
              aria-label={labels[step]}
              aria-selected={selected}
              aria-disabled={disabled}
              disabled={disabled}
              className={`step step-tab ${state} ${selected ? 'is-viewing' : ''} ${state === 'complete' ? 'is-done' : ''} ${state === 'pending' ? 'is-current' : ''} ${disabled ? 'is-locked' : ''}`}
              data-testid={`step-${step}`}
              onClick={() => onSelectStep(step)}
            >
              <span className="step-orb" data-vd-role="step-orb" aria-hidden="true" />
              <span className="step-label">{labels[step]}</span>
              <span className="step-state" aria-hidden="true">{state}</span>
            </button>
          </React.Fragment>
        );
      })}
      <span className="stepper-track" data-vd-role="stepper-track" aria-hidden="true">
        <span className="stepper-track-fill" data-vd-role="stepper-track-fill" style={{ width: `${fillPercent}%` }} />
      </span>
    </nav>
  );
};
