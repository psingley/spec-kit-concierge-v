import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectActivityBusy, selectActivityCurrentStatus, selectActivityLogRate } from '../slices/activity.selectors';
import { activityVisibilityToggled } from '../slices/ui';
import { ActivityPill } from './ActivityPill';

export const ActivityPillContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  return (
    <ActivityPill
      busy={useAppSelector(selectActivityBusy)}
      currentStatus={useAppSelector(selectActivityCurrentStatus)}
      logRate={useAppSelector(selectActivityLogRate)}
      onToggle={() => dispatch(activityVisibilityToggled())}
    />
  );
};
