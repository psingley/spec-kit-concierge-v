import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { act, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AppStore } from '../store';
import { createProductStore } from '../store';
import { installConciergeBridge } from '../api/testBridge';
import { WorkspaceContainer } from './WorkspaceContainer';
import {
  clarifyRunSucceeded,
  passiveStepRunSucceeded,
  specifyRunSucceeded
} from '../slices/session';

const clarifyDone = clarifyRunSucceeded({ artifactPath: 'spec.md', commitSha: 'clarify-sha', questions: [], answers: [] });

const stepState = (container: HTMLElement, step: string): string =>
  within(container.querySelector(`[data-testid="step-${step}"]`) as HTMLElement)
    .getByText(/^(complete|pending|not_available)$/).textContent ?? '';

const renderWorkspace = () => {
  installConciergeBridge();
  const store = createProductStore();
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/workspace']}>
        <WorkspaceContainer />
      </MemoryRouter>
    </Provider>
  );
  const dispatch = (action: Parameters<AppStore['dispatch']>[0]): void => {
    act(() => {
      store.dispatch(action);
    });
  };
  return { store, dispatch, ...utils };
};

describe('WorkspaceContainer step derivation (prior-step-complete unlock chain)', () => {
  it('unlocks tasks to pending once plan commits, then analyze once tasks commits', () => {
    const { dispatch, container } = renderWorkspace();

    dispatch(specifyRunSucceeded({ specMarkdown: '# Spec', artifactPath: 'spec.md', commitSha: 'specify-sha' }));
    dispatch(clarifyDone);

    // Before plan commits, tasks/analyze are locked.
    expect(stepState(container, 'plan')).toBe('pending');
    expect(stepState(container, 'tasks')).toBe('not_available');
    expect(stepState(container, 'analyze')).toBe('not_available');

    // Plan commits -> tasks unlocks to pending (was the dead-end bug).
    dispatch(passiveStepRunSucceeded({ step: 'plan', commitSha: 'plan-sha', artifacts: [] }));
    expect(stepState(container, 'plan')).toBe('complete');
    expect(stepState(container, 'tasks')).toBe('pending');
    expect(stepState(container, 'analyze')).toBe('not_available');

    // Tasks commits -> analyze unlocks to pending.
    dispatch(passiveStepRunSucceeded({ step: 'tasks', commitSha: 'tasks-sha', artifacts: [] }));
    expect(stepState(container, 'tasks')).toBe('complete');
    expect(stepState(container, 'analyze')).toBe('pending');

    // Analyze commits -> review unlocks (existing behavior, no regression).
    dispatch(passiveStepRunSucceeded({ step: 'analyze', commitSha: 'analyze-sha', artifacts: [] }));
    expect(stepState(container, 'analyze')).toBe('complete');
    expect(stepState(container, 'review')).toBe('pending');
  });

  it('keeps specify/clarify/plan unlocks intact (no regression)', () => {
    const { dispatch, container } = renderWorkspace();

    // Fresh: only specify is actionable.
    expect(stepState(container, 'specify')).toBe('pending');
    expect(stepState(container, 'clarify')).toBe('not_available');
    expect(stepState(container, 'plan')).toBe('not_available');

    dispatch(specifyRunSucceeded({ specMarkdown: '# Spec', artifactPath: 'spec.md', commitSha: 'specify-sha' }));
    expect(stepState(container, 'specify')).toBe('complete');
    expect(stepState(container, 'clarify')).toBe('pending');
    expect(stepState(container, 'plan')).toBe('not_available');

    dispatch(clarifyDone);
    expect(stepState(container, 'clarify')).toBe('complete');
    expect(stepState(container, 'plan')).toBe('pending');
    expect(stepState(container, 'tasks')).toBe('not_available');
  });
});
