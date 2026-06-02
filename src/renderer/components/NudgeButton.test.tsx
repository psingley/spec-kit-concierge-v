import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NudgeButton } from './NudgeButton';

describe('NudgeButton', () => {
  it('is hidden for healthy, running, or auto-recoverable states', () => {
    const { container } = render(<NudgeButton canNudge={false} step="tasks" onNudge={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces the affected step and disables duplicate clicks', async () => {
    const onNudge = vi.fn(async () => ({ result: 'repaired' as const, message: 'Branch repaired' }));
    render(<NudgeButton canNudge step="tasks" onNudge={onNudge} />);

    fireEvent.click(screen.getByRole('button', { name: /set branch right for tasks/i }));
    fireEvent.click(screen.getByRole('button', { name: /set branch right for tasks/i }));

    expect(onNudge).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/repairing tasks/i);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/branch repaired/i));
  });

  it('surfaces ambiguous escalation copy as an alert', async () => {
    render(<NudgeButton canNudge step="analyze" onNudge={vi.fn(async () => ({ result: 'escalated' as const, message: 'Ambiguity escalates to the human' }))} />);

    fireEvent.click(screen.getByRole('button', { name: /set branch right for analyze/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/ambiguity escalates to the human/i));
  });
});
