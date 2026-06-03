import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignInScreen } from './SignInScreen';

const renderSignIn = (overrides: Partial<React.ComponentProps<typeof SignInScreen>> = {}) => render(
  <SignInScreen
    github="ok"
    copilot="ok"
    atlassian="out"
    identity={{ login: 'psingley' }}
    jiraAuthState={{ state: 'none' }}
    onGitHub={vi.fn()}
    onCopilot={vi.fn()}
    onAtlassian={vi.fn()}
    onSaveJiraCredential={vi.fn(async () => ({ ok: true as const, authState: { state: 'warm' as const, displayName: 'Pat User' } }))}
    onOpenJiraTokenPage={vi.fn()}
    {...overrides}
  />
);

describe('SignInScreen', () => {
  it('shows the signed-in GitHub CLI identity from auth state', () => {
    renderSignIn({ copilot: 'out' });

    expect(screen.getByText('Signed in as psingley')).toBeInTheDocument();
  });

  it('renders the first-class JIRA direct row in none, warm, and expired states', () => {
    const { rerender } = renderSignIn();

    expect(screen.getByText('JIRA')).toBeVisible();
    expect(screen.getByText('Connect to file tickets, fast and deterministic')).toBeVisible();
    expect(screen.getByRole('button', { name: /connect/i })).toBeVisible();

    rerender(
      <SignInScreen
        github="ok"
        copilot="ok"
        atlassian="out"
        identity={{ login: 'psingley' }}
        jiraAuthState={{ state: 'warm', displayName: 'Pat User', expiryDate: '2099-01-01' }}
        onGitHub={vi.fn()}
        onCopilot={vi.fn()}
        onAtlassian={vi.fn()}
        onSaveJiraCredential={vi.fn()}
        onOpenJiraTokenPage={vi.fn()}
      />
    );
    expect(screen.getByText('Connected as Pat User')).toBeVisible();
    expect(screen.getByRole('button', { name: /manage/i })).toBeVisible();

    rerender(
      <SignInScreen
        github="ok"
        copilot="ok"
        atlassian="out"
        identity={{ login: 'psingley' }}
        jiraAuthState={{ state: 'expired', displayName: 'Pat User' }}
        onGitHub={vi.fn()}
        onCopilot={vi.fn()}
        onAtlassian={vi.fn()}
        onSaveJiraCredential={vi.fn()}
        onOpenJiraTokenPage={vi.fn()}
      />
    );
    expect(screen.getByText('Connection expired, reconnect')).toBeVisible();
    expect(screen.getByRole('button', { name: /reconnect/i })).toBeVisible();
  });

  it('warns when a warm JIRA token expires within seven days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T12:00:00Z'));

    renderSignIn({ jiraAuthState: { state: 'warm', displayName: 'Pat User', expiryDate: '2026-06-05' } });

    expect(screen.getByText('token expires in 3 days')).toHaveClass('jira-auth-warn');
    vi.useRealTimers();
  });

  it('expands the inline JIRA panel, opens the token page, and saves the credential', async () => {
    const onOpenJiraTokenPage = vi.fn();
    const onSaveJiraCredential = vi.fn(async () => ({ ok: true as const, authState: { state: 'warm' as const, displayName: 'Pat User' } }));
    renderSignIn({ onOpenJiraTokenPage, onSaveJiraCredential });

    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    const panel = screen.getByRole('region', { name: /jira direct connect/i });
    expect(within(panel).getByText('Create an API token')).toBeVisible();
    fireEvent.click(within(panel).getByRole('button', { name: /open token page/i }));
    expect(onOpenJiraTokenPage).toHaveBeenCalledTimes(1);

    fireEvent.change(within(panel).getByLabelText('JIRA site URL'), { target: { value: 'https://example.atlassian.net' } });
    fireEvent.change(within(panel).getByLabelText('Email'), { target: { value: 'pat@example.com' } });
    fireEvent.change(within(panel).getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.change(within(panel).getByLabelText('Expires'), { target: { value: '2026-12-31' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSaveJiraCredential).toHaveBeenCalledWith({
      baseUrl: 'https://example.atlassian.net',
      email: 'pat@example.com',
      token: 'secret-api-token',
      expiryDate: '2026-12-31'
    }));
    await waitFor(() => expect(screen.getByText('Connected as Pat User')).toBeVisible());
  });

  it('shows the MCP fallback link only when direct JIRA is unconfigured and MCP is ok', () => {
    const onAtlassian = vi.fn();
    const { rerender } = renderSignIn({ atlassian: 'ok', onAtlassian });

    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    fireEvent.click(screen.getByRole('button', { name: /use copilot mcp instead/i }));
    expect(onAtlassian).toHaveBeenCalledTimes(1);

    rerender(
      <SignInScreen
        github="ok"
        copilot="ok"
        atlassian="ok"
        identity={{ login: 'psingley' }}
        jiraAuthState={{ state: 'warm', displayName: 'Pat User' }}
        onGitHub={vi.fn()}
        onCopilot={vi.fn()}
        onAtlassian={onAtlassian}
        onSaveJiraCredential={vi.fn()}
        onOpenJiraTokenPage={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /manage/i }));
    expect(screen.queryByRole('button', { name: /use copilot mcp instead/i })).not.toBeInTheDocument();
  });
});
