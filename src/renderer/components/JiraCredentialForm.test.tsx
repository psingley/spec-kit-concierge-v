import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JiraCredentialForm } from './JiraCredentialForm';

describe('JiraCredentialForm', () => {
  it('renders email and token only, then submits without site or expiry', async () => {
    const onSave = vi.fn(async () => ({ ok: true as const, authState: { state: 'warm' as const, displayName: 'Pat User' } }));
    render(<JiraCredentialForm authState={{ state: 'none' }} onSave={onSave} />);

    expect(screen.getByLabelText('Email')).toBeVisible();
    expect(screen.getByLabelText('API token')).toBeVisible();
    expect(screen.queryByLabelText('JIRA site URL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Expires')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pat@example.com' } });
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      email: 'pat@example.com',
      token: 'secret-api-token'
    }));
  });

  it('reveals confirm-site fallback on site_not_found and shows credential guidance on invalid_credentials', async () => {
    const onSave = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, status: 'site_not_found' as const })
      .mockResolvedValueOnce({ ok: false as const, status: 'invalid_credentials' as const });
    render(<JiraCredentialForm authState={{ state: 'none' }} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pat@vanity.example' } });
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByLabelText('JIRA site URL')).toBeVisible());
    expect(screen.getByText("We couldn't find your Jira site automatically. Paste it (e.g. https://yourcompany.atlassian.net).")).toBeVisible();

    fireEvent.change(screen.getByLabelText('JIRA site URL'), { target: { value: 'https://custom.atlassian.net' } });
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'secret-api-token' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({
      email: 'pat@vanity.example',
      token: 'secret-api-token',
      baseUrl: 'https://custom.atlassian.net'
    }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Check the email and token.'));
  });
});
