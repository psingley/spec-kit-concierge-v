import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignInScreen } from './SignInScreen';

describe('SignInScreen', () => {
  it('shows the signed-in GitHub CLI identity from auth state', () => {
    render(
      <SignInScreen
        github="ok"
        copilot="out"
        atlassian="out"
        identity={{ login: 'psingley' }}
        onGitHub={vi.fn()}
        onCopilot={vi.fn()}
        onAtlassian={vi.fn()}
      />
    );

    expect(screen.getByText('Signed in as psingley')).toBeInTheDocument();
  });
});
