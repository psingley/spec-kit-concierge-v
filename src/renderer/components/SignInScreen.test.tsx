import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignInScreen } from './SignInScreen';

let copilotDeviceCodeCallback: ((event: unknown) => void) | null = null;

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
  afterEach(() => {
    copilotDeviceCodeCallback = null;
    vi.unstubAllGlobals();
  });

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

  it('expands the inline JIRA panel, opens the token page, and saves the credential', async () => {
    const onOpenJiraTokenPage = vi.fn();
    const onSaveJiraCredential = vi.fn(async () => ({ ok: true as const, authState: { state: 'warm' as const, displayName: 'Pat User' } }));
    renderSignIn({ onOpenJiraTokenPage, onSaveJiraCredential });

    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    const panel = screen.getByRole('region', { name: /jira direct connect/i });
    expect(within(panel).getByText('Create an API token')).toBeVisible();
    fireEvent.click(within(panel).getByRole('button', { name: /open token page/i }));
    expect(onOpenJiraTokenPage).toHaveBeenCalledTimes(1);

    expect(within(panel).queryByLabelText('JIRA site URL')).not.toBeInTheDocument();
    expect(within(panel).queryByLabelText('Expires')).not.toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText('Email'), { target: { value: 'pat@example.com' } });
    fireEvent.change(within(panel).getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSaveJiraCredential).toHaveBeenCalledWith({
      email: 'pat@example.com',
      token: 'secret-api-token'
    }));
    await waitFor(() => expect(screen.getByText('Connected as Pat User')).toBeVisible());
  });

  it('reveals the site field on site_not_found and distinguishes invalid credentials', async () => {
    const onSaveJiraCredential = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, status: 'site_not_found' as const })
      .mockResolvedValueOnce({ ok: false as const, status: 'invalid_credentials' as const });
    renderSignIn({ onSaveJiraCredential });

    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    const panel = screen.getByRole('region', { name: /jira direct connect/i });

    fireEvent.change(within(panel).getByLabelText('Email'), { target: { value: 'pat@vanity.example' } });
    fireEvent.change(within(panel).getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(within(panel).getByLabelText('JIRA site URL')).toBeVisible());
    expect(within(panel).getByText("We couldn't find your Jira site automatically. Paste it (e.g. https://yourcompany.atlassian.net).")).toBeVisible();

    fireEvent.change(within(panel).getByLabelText('JIRA site URL'), { target: { value: 'https://custom.atlassian.net' } });
    fireEvent.change(within(panel).getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSaveJiraCredential).toHaveBeenLastCalledWith({
      email: 'pat@vanity.example',
      token: 'secret-api-token',
      baseUrl: 'https://custom.atlassian.net'
    }));
    await waitFor(() => expect(within(panel).getByRole('alert')).toHaveTextContent('Check the email and token.'));
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

  it('shows and clears the Copilot device-code prompt while sign-in is running', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    window.concierge = {
      auth: {
        subscribeCopilotLogin: vi.fn((_subscriptionId: string, callback: (event: unknown) => void) => {
          copilotDeviceCodeCallback = callback;
          return vi.fn();
        })
      }
    } as unknown as ConciergePreloadBridge;
    const onCopilot = vi.fn();
    const { rerender } = renderSignIn({ copilot: 'starting', onCopilot });

    expect(window.concierge.auth!.subscribeCopilotLogin).toHaveBeenCalledWith(expect.any(String), expect.any(Function));
    act(() => {
      copilotDeviceCodeCallback?.({ type: 'device-code', code: '023C-3350', url: 'https://github.com/login/device' });
    });

    expect(screen.getByText('Enter this code at github.com/login/device:')).toBeVisible();
    expect(screen.getByText('023C-3350')).toHaveAttribute('data-vd-role', 'copilot-device-code');
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('023C-3350'));
    expect(screen.getByRole('link', { name: /open github device page/i })).toHaveAttribute('href', 'https://github.com/login/device');
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    rerender(
      <SignInScreen
        github="ok"
        copilot="ok"
        atlassian="out"
        identity={{ login: 'psingley' }}
        jiraAuthState={{ state: 'none' }}
        onGitHub={vi.fn()}
        onCopilot={onCopilot}
        onAtlassian={vi.fn()}
        onSaveJiraCredential={vi.fn()}
        onOpenJiraTokenPage={vi.fn()}
      />
    );
    expect(screen.queryByText('023C-3350')).not.toBeInTheDocument();
  });
});
