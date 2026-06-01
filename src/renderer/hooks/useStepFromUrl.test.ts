import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStepFromUrl } from './useStepFromUrl';

vi.mock('./store', () => ({
  useAppSelector: vi.fn()
}));

import { useAppSelector } from './store';

const mockUseAppSelector = vi.mocked(useAppSelector);

const wrapper = (initialEntry: string) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: '/workspace', element: children })
      )
    );

describe('useStepFromUrl', () => {
  it('returns a valid available step from the URL', () => {
    mockUseAppSelector
      .mockReturnValueOnce('specify')
      .mockReturnValueOnce('clarify');

    const { result } = renderHook(() => useStepFromUrl(), {
      wrapper: wrapper('/workspace?step=clarify')
    });

    expect(result.current).toBe('clarify');
  });

  it('falls back to activeStep when the step param is invalid', () => {
    mockUseAppSelector
      .mockReturnValueOnce('specify')
      .mockReturnValueOnce('specify');

    const { result } = renderHook(() => useStepFromUrl(), {
      wrapper: wrapper('/workspace?step=bogus')
    });

    expect(result.current).toBe('specify');
  });

  it('falls back to activeStep when the URL step is beyond maxReachedStep', () => {
    mockUseAppSelector
      .mockReturnValueOnce('specify')
      .mockReturnValueOnce('clarify');

    const { result } = renderHook(() => useStepFromUrl(), {
      wrapper: wrapper('/workspace?step=plan')
    });

    expect(result.current).toBe('specify');
  });
});
