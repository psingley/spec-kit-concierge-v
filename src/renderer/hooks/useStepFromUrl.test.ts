import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useStepFromUrl } from './useStepFromUrl';

vi.mock('./store', () => ({
  useAppSelector: vi.fn()
}));

import { useAppSelector } from './store';
const mockUseAppSelector = vi.mocked(useAppSelector);

const wrapper = (initialEntry: string) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initialEntry] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/workspace', element: children })
      )
    );

describe('useStepFromUrl', () => {
  it('returns step from URL when valid and available', () => {
    // First call: activeStep, second: maxReachedStep
    mockUseAppSelector
      .mockReturnValueOnce('specify')  // activeStep
      .mockReturnValueOnce('clarify'); // maxReachedStep

    const { result } = renderHook(() => useStepFromUrl(), {
      wrapper: wrapper('/workspace?step=clarify')
    });

    expect(result.current).toBe('clarify');
  });

  it('falls back to activeStep when step param is invalid', () => {
    mockUseAppSelector
      .mockReturnValueOnce('specify')  // activeStep
      .mockReturnValueOnce('specify'); // maxReachedStep

    const { result } = renderHook(() => useStepFromUrl(), {
      wrapper: wrapper('/workspace?step=bogus')
    });

    expect(result.current).toBe('specify');
  });

  it('falls back to activeStep when step is not_available (beyond maxReachedStep)', () => {
    mockUseAppSelector
      .mockReturnValueOnce('specify')  // activeStep
      .mockReturnValueOnce('clarify'); // maxReachedStep (index 1), plan is index 2 → not available

    const { result } = renderHook(() => useStepFromUrl(), {
      wrapper: wrapper('/workspace?step=plan')
    });

    expect(result.current).toBe('specify');
  });
});
