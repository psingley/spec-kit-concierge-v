import type { AppStartListening, ListenerTopicDescriptor } from './types';
import { recordActivity } from '../slices/activity';
import { activityVisibilitySet } from '../slices/ui';

export const activityLoggerTopic: ListenerTopicDescriptor = {
  topic: 'activityLogger',
  owns: 'activity rail visibility and event fan-in'
};

export const setupActivityLoggerListener = (startListening: AppStartListening): void => {
  let openedForFirstError = false;

  startListening({
    actionCreator: recordActivity,
    effect: (action, listenerApi) => {
      if (openedForFirstError || action.payload.level !== 'error') {
        return;
      }
      openedForFirstError = true;
      listenerApi.dispatch(activityVisibilitySet(true));
    }
  });
};
