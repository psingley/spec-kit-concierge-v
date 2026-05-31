import { describe, expect, it, vi } from 'vitest';
import { setupWorkspaceChangeListener, workspaceChangeTopic } from './workspaceChange.listener';
import { recordActivity } from '../slices/activity';
import { repositorySelected, type RepositorySummary } from '../slices/workspace';
import type { AppStartListening } from './types';

describe('workspace change listener', () => {
  it('exports the reserved topic descriptor', () => {
    expect(workspaceChangeTopic.topic).toBe('workspaceChange');
  });

  it('registers repository selection activity logging', () => {
    const startListening = vi.fn() as unknown as AppStartListening;

    setupWorkspaceChangeListener(startListening);

    expect(startListening).toHaveBeenCalledWith(
      expect.objectContaining({ actionCreator: repositorySelected, effect: expect.any(Function) })
    );
  });

  it('records selected repositories as activity rows', async () => {
    const startListening = vi.fn();
    setupWorkspaceChangeListener(startListening as unknown as AppStartListening);
    const registration = startListening.mock.calls[0]?.[0];
    expect(registration).toBeDefined();
    const effect = registration!.effect as (
      action: ReturnType<typeof repositorySelected>,
      listenerApi: { dispatch: ReturnType<typeof vi.fn> }
    ) => Promise<void> | void;
    const repo: RepositorySummary = {
      id: 'repo-1',
      name: 'concierge-api',
      owner: 'collette-travel',
      path: '/work/concierge-api',
      defaultBranch: 'main'
    };
    const dispatch = vi.fn();

    await effect(repositorySelected(repo), { dispatch });

    expect(dispatch).toHaveBeenCalledWith(
      recordActivity(
        expect.objectContaining({
          level: 'info',
          message: 'Repo selected: collette-travel/concierge-api',
          event: 'repository-selected',
          raw: repo
        })
      )
    );
  });
});
