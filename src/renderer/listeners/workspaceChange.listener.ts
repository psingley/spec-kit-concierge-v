import type { AppStartListening, ListenerTopicDescriptor } from './types';
import { recordActivity } from '../slices/activity';
import { repositorySelected } from '../slices/workspace';

export const workspaceChangeTopic: ListenerTopicDescriptor = {
  topic: 'workspaceChange',
  owns: 'workspace change coordination'
};

export const setupWorkspaceChangeListener = (startListening: AppStartListening): void => {
  startListening({
    actionCreator: repositorySelected,
    effect: (action, listenerApi) => {
      listenerApi.dispatch(
        recordActivity({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Repo selected: ${action.payload.owner}/${action.payload.name}`,
          event: 'repository-selected',
          raw: action.payload
        })
      );
    }
  });
};
