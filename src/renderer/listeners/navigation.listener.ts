import type { createMemoryRouter } from 'react-router';
import type { RootState } from '../store';
import { selectAuthGateOpen } from '../slices/auth.selectors';
import { selectSessionEntered } from '../slices/workspace.selectors';
import { workspaceEntered, repositoryBrowseReset, workspaceStepViewed } from '../slices/workspace';
import type { AppStartListening, ListenerTopicDescriptor } from './types';

export const navigationTopic: ListenerTopicDescriptor = {
  topic: 'navigation',
  owns: 'Redux-to-URL synchronization'
};

export const setupNavigationListener = (
  startListening: AppStartListening,
  router: ReturnType<typeof createMemoryRouter>
): void => {
  startListening({
    predicate: (_action, currentState, previousState) =>
      selectAuthGateOpen(currentState as RootState) !== selectAuthGateOpen(previousState as RootState),
    effect: (_action, listenerApi) => {
      const state = listenerApi.getState() as RootState;
      if (!selectAuthGateOpen(state)) {
        void router.navigate('/sign-in', { replace: true });
      } else if (selectSessionEntered(state)) {
        void router.navigate('/workspace', { replace: true });
      } else {
        void router.navigate('/repos', { replace: true });
      }
    }
  });

  startListening({
    actionCreator: workspaceEntered,
    effect: () => {
      void router.navigate('/workspace?step=specify', { replace: true });
    }
  });

  startListening({
    actionCreator: repositoryBrowseReset,
    effect: () => {
      void router.navigate('/repos', { replace: true });
    }
  });

  startListening({
    actionCreator: workspaceStepViewed,
    effect: (action) => {
      void router.navigate(`/workspace?step=${action.payload}`, { replace: true });
    }
  });
};
