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
  it('closes an open menu when the user clicks outside', () => {
    renderTitlebar();

    fireEvent.click(screen.getByRole('button', { name: /repository/i }));
    expect(screen.getByRole('menu', { name: /repository/i })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: /outside target/i }));

    expect(screen.queryByRole('menu', { name: /repository/i })).not.toBeInTheDocument();
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
