import type { createMemoryRouter } from 'react-router';
import type { RootState } from '../store';
import { selectAuthGateOpen } from '../slices/auth.selectors';
import { selectSessionEntered, selectWorkspaceActiveStep } from '../slices/workspace.selectors';
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
  const navigateIfChanged = (to: string): void => {
    const current = `${router.state.location.pathname}${router.state.location.search}`;
    if (current !== to) {
      void router.navigate(to, { replace: true });
    }
  };

  startListening({
    predicate: (_action, currentState, previousState) =>
      selectAuthGateOpen(currentState as RootState) !== selectAuthGateOpen(previousState as RootState),
    effect: (_action, listenerApi) => {
      const state = listenerApi.getState() as RootState;
      if (!selectAuthGateOpen(state)) {
        navigateIfChanged('/sign-in');
      } else if (selectSessionEntered(state)) {
        navigateIfChanged('/workspace');
      } else {
        navigateIfChanged('/repos');
      }
    }
  });

  startListening({
    actionCreator: workspaceEntered,
    effect: (_action, listenerApi) => {
      const state = listenerApi.getState() as RootState;
      navigateIfChanged(`/workspace?step=${selectWorkspaceActiveStep(state)}`);
    }
  });

  startListening({
    actionCreator: repositoryBrowseReset,
    effect: () => {
      navigateIfChanged('/repos');
    }
  });

  startListening({
    actionCreator: workspaceStepViewed,
    effect: (action) => {
      navigateIfChanged(`/workspace?step=${action.payload}`);
    }
  });
};
