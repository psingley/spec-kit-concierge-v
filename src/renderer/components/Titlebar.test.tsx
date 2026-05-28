import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Titlebar } from './Titlebar';

const renderTitlebar = () =>
  render(
    <div>
      <Titlebar
        repo={{ id: 'repo-1', owner: 'collette-travel', name: 'booking-engine', path: '/work/booking-engine', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/demo"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="out"
        model="gpt-5-codex"
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
      />
      <button type="button">Outside target</button>
    </div>
  );

describe('Titlebar dropdowns', () => {
  it('renders the workspace titlebar chips required by the visual contract', () => {
    render(
      <Titlebar
        repo={{ id: 'repo-2', owner: 'collette-travel', name: 'concierge-api', path: '/work/concierge-api', defaultBranch: 'main', language: 'TypeScript' }}
        branch="main"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="ok"
        model={null}
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
      />
    );

    expect(screen.getByText('Spec-kit Concierge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'a.kim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'collette-travel/concierge-api' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claude Sonnet 4.5default' })).toBeInTheDocument();
    expect(document.querySelector('[data-vd-role="brand-orb"]')).toBeInTheDocument();
    expect(document.querySelector('[data-vd-role="auth-identity-dot"]')).toBeInTheDocument();
  });

  it('shows the default branch for generated draft sessions in the titlebar', () => {
    render(
      <Titlebar
        repo={{ id: 'repo-2', owner: 'collette-travel', name: 'concierge-api', path: '/work/concierge-api', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/draft-abcd1234"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="ok"
        model={null}
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'main' })).toBeInTheDocument();
  });

  it('closes an open menu when the user clicks outside', () => {
    renderTitlebar();

    fireEvent.click(screen.getByRole('button', { name: 'collette-travel/booking-engine' }));
    expect(screen.getByRole('dialog', { name: /repository/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'concierge-api42h ago' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'itinerary-servicemain' })).toBeInTheDocument();
    expect(screen.getByText('All repos')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: /outside target/i }));

    expect(screen.queryByRole('dialog', { name: /repository/i })).not.toBeInTheDocument();
  });

  it('traps tab focus inside an open menu and closes on escape', () => {
    renderTitlebar();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const menu = screen.getByRole('menu', { name: /settings/i });
    const menuItems = within(menu).getAllByRole('menuitem');
    menuItems[0]?.focus();

    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(menuItems[1]).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: /settings/i })).not.toBeInTheDocument();
  });
});
