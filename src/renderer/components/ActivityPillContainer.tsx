import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectActivityBusy, selectActivityCurrentStatus, selectActivityLogRate } from '../slices/activity.selectors';
import { selectSessionSpecifyPrompt, selectSessionSpecifyStarted } from '../slices/session.selectors';
import { activityVisibilityToggled } from '../slices/ui';
import { ActivityPill } from './ActivityPill';

export const ActivityPillContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const prompt = useAppSelector(selectSessionSpecifyPrompt).trim();
  const specifyStarted = useAppSelector(selectSessionSpecifyStarted);
  const busy = useAppSelector(selectActivityBusy) || (specifyStarted && prompt.length > 0);
  return (
    <ActivityPill
      busy={busy}
      currentStatus={useAppSelector(selectActivityCurrentStatus)}
      label={busy && prompt.length > 0 ? prompt : undefined}
      logRate={useAppSelector(selectActivityLogRate)}
      onToggle={() => dispatch(activityVisibilityToggled())}
    />
  );
};
