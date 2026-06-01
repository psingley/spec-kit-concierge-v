import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Titlebar } from './Titlebar';

const liveRepos = [
  { id: 'repo-1', owner: 'psingley', name: 'spec-kit-concierge-v', path: '/work/spec-kit-concierge-v', defaultBranch: 'main', language: 'TypeScript' },
  { id: 'repo-2', owner: 'collette-travel', name: 'itinerary-service', path: '/work/itinerary-service', defaultBranch: 'main', language: 'Go' }
];

const renderTitlebar = (overrides: Partial<React.ComponentProps<typeof Titlebar>> = {}) =>
  render(
    <div>
      <Titlebar
        repo={{ id: 'repo-1', owner: 'psingley', name: 'spec-kit-concierge-v', path: '/work/spec-kit-concierge-v', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/demo"
        identity={{ login: 'psingley', displayName: 'P Singley' }}
        github="ok"
        copilot="starting"
        atlassian="error"
        model="gpt-5-codex"
        models={[
          { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', enablement: 'default' },
          { id: 'gpt-5-codex', name: 'GPT-5 Codex', cost: 'premium' }
        ]}
        repositories={liveRepos}
        repositoriesError={false}
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
        onModelSelect={vi.fn()}
        {...overrides}
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
        models={[{ id: 'gpt-5.5', name: 'GPT-5.5', enablement: 'default' }]}
        showDraftBranch
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
        onModelSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Spec-kit Concierge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'a.kim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'collette-travel/concierge-api' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GPT-5.5default' })).toBeInTheDocument();
    expect(document.querySelector('[data-vd-role="brand-orb"]')).toBeInTheDocument();
    expect(document.querySelector('[data-vd-role="auth-identity-dot"]')).toBeInTheDocument();
  });

  it('shows generated draft sessions in the titlebar', () => {
    render(
      <Titlebar
        repo={{ id: 'repo-2', owner: 'collette-travel', name: 'concierge-api', path: '/work/concierge-api', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/draft-abcd1234"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="ok"
        model={null}
        models={[{ id: 'gpt-5.5', name: 'GPT-5.5' }]}
        showDraftBranch
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
        onModelSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'spec/draft-abcd1234' })).toBeInTheDocument();
  });

  it('lists the live signed-in repositories and closes the menu on outside click', () => {
    renderTitlebar();

    fireEvent.click(screen.getByRole('button', { name: 'psingley/spec-kit-concierge-v' }));
    const menu = screen.getByRole('dialog', { name: /repository/i });
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'spec-kit-concierge-v' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'itinerary-service' })).toBeInTheDocument();
    expect(screen.getByText('All repos')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: /outside target/i }));

    expect(screen.queryByRole('dialog', { name: /repository/i })).not.toBeInTheDocument();
  });

  it('shows an honest empty state when the signed-in account has no repositories', () => {
    renderTitlebar({ repositories: [] });

    fireEvent.click(screen.getByRole('button', { name: 'psingley/spec-kit-concierge-v' }));
    const menu = screen.getByRole('dialog', { name: /repository/i });
    expect(within(menu).getByText('No repositories found for psingley')).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'booking-engine' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'itinerary-service' })).not.toBeInTheDocument();
  });

  it('shows an honest error state when the repository query fails', () => {
    renderTitlebar({ repositories: [], repositoriesError: true });

    fireEvent.click(screen.getByRole('button', { name: 'psingley/spec-kit-concierge-v' }));
    const menu = screen.getByRole('dialog', { name: /repository/i });
    expect(within(menu).getByText('Could not load repositories')).toBeInTheDocument();
  });

  it('traps tab focus inside an open menu and closes on escape', () => {
    renderTitlebar();

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    const menu = screen.getByRole('dialog', { name: /settings/i });
    expect(screen.getByRole('button', { name: 'Report a bug' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export activity log 14 lines' })).toBeInTheDocument();
    const menuItems = within(menu).getAllByRole('button');
    menuItems[0]?.focus();

    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(menuItems[1]).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('renders live auth status rows instead of static connected copy', () => {
    renderTitlebar();

    fireEvent.click(screen.getByRole('button', { name: 'psingley' }));

    const menu = screen.getByRole('menu', { name: /authentication/i });
    expect(within(menu).getByRole('menuitem', { name: 'GitHub connected' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Copilot connecting' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Atlassian MCP error' })).toBeInTheDocument();
    expect(screen.queryByText('Atlassian MCP status shown in sign-in')).not.toBeInTheDocument();
  });

  it('lists real model options and persists the selected model through the callback', () => {
    const onModelSelect = vi.fn();
    render(
      <Titlebar
        repo={{ id: 'repo-1', owner: 'collette-travel', name: 'booking-engine', path: '/work/booking-engine', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/demo"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="ok"
        model="gpt-5.5"
        models={[
          { id: 'gpt-5.5', name: 'GPT-5.5', enablement: 'default' },
          { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', cost: 'premium' }
        ]}
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
        onModelSelect={onModelSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'GPT-5.5default' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Claude Sonnet 4.5 premium' }));

    expect(onModelSelect).toHaveBeenCalledWith('claude-sonnet-4-5');
    expect(screen.queryByText('Change between steps')).not.toBeInTheDocument();
  });

  it('disables model selection while a step is running', () => {
    const onModelSelect = vi.fn();
    render(
      <Titlebar
        repo={{ id: 'repo-1', owner: 'collette-travel', name: 'booking-engine', path: '/work/booking-engine', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/demo"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="ok"
        model="gpt-5.5"
        models={[
          { id: 'gpt-5.5', name: 'GPT-5.5', enablement: 'default' },
          { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' }
        ]}
        modelDisabled
        onCustomize={vi.fn()}
        onAbout={vi.fn()}
        onRequest={vi.fn()}
        onModelSelect={onModelSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'GPT-5.5default' }));

    expect(screen.getByRole('menuitem', { name: 'Claude Sonnet 4.5' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Claude Sonnet 4.5' }));
    expect(onModelSelect).not.toHaveBeenCalled();
  });

  it('invokes gear menu actions so containers can open the existing modals', () => {
    const onCustomize = vi.fn();
    const onAbout = vi.fn();
    const onRequest = vi.fn();
    render(
      <Titlebar
        repo={{ id: 'repo-1', owner: 'collette-travel', name: 'booking-engine', path: '/work/booking-engine', defaultBranch: 'main', language: 'TypeScript' }}
        branch="spec/demo"
        identity={{ login: 'a.kim', displayName: 'Anika Kim' }}
        github="ok"
        copilot="ok"
        atlassian="ok"
        model="gpt-5.5"
        models={[{ id: 'gpt-5.5', name: 'GPT-5.5' }]}
        onCustomize={onCustomize}
        onAbout={onAbout}
        onRequest={onRequest}
        onModelSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Report a bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    expect(onCustomize).toHaveBeenCalledTimes(1);
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onAbout).toHaveBeenCalledTimes(1);
  });
});
