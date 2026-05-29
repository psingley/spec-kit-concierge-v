import type { createMemoryRouter } from 'react-router';
import type { RootState } from '../store';
import { selectAuthGateOpen } from '../slices/auth.selectors';
import { selectWorkspaceSelectedRepo, selectWorkspaceBranch } from '../slices/workspace.selectors';
import { workspaceEntered, repositoryBrowseReset, workspaceStepViewed, specifyCompletedInWorkspace } from '../slices/workspace';
import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const navigationTopic: ListenerTopicDescriptor = {
  topic: 'navigation',
  owns: 'Redux-to-URL synchronization'
};

export const setupNavigationListener = (
  startListening: AppStartListening,
  router: ReturnType<typeof createMemoryRouter>
): void => {
  // Watch auth gate changes
  startListening({
    predicate: (_action, currentState, previousState) =>
      selectAuthGateOpen(currentState as RootState) !== selectAuthGateOpen(previousState as RootState),
    effect: (_action, listenerApi) => {
      const state = listenerApi.getState() as RootState;
      if (!selectAuthGateOpen(state)) {
        void router.navigate('/sign-in', { replace: true });
      } else if (selectWorkspaceSelectedRepo(state) === null || selectWorkspaceBranch(state) === null) {
        void router.navigate('/repos', { replace: true });
      } else {
        void router.navigate('/workspace', { replace: true });
      }
    }
  });

  // Watch workspace entry
  startListening({
    actionCreator: workspaceEntered,
    effect: () => {
      void router.navigate('/workspace?step=specify', { replace: true });
    }
  });

  // Watch workspace exit (back to repo browse)
  startListening({
    actionCreator: repositoryBrowseReset,
    effect: () => {
      void router.navigate('/repos', { replace: true });
    }
  });

  // Watch step viewed changes
  startListening({
    actionCreator: workspaceStepViewed,
    effect: (action) => {
      void router.navigate(`/workspace?step=${action.payload}`, { replace: true });
    }
  });

  // Watch specify completed (advance to clarify)
  startListening({
    actionCreator: specifyCompletedInWorkspace,
    effect: () => {
      void router.navigate('/workspace?step=clarify', { replace: true });
    }
  });
};
