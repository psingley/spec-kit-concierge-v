import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { activityCleared } from '../slices/activity';
import { selectActivityBusy, selectActivityCurrentStatus, selectActivityEntries } from '../slices/activity.selectors';
import { selectPreferencesActivitySide } from '../slices/preferences.selectors';
import { selectUiShowActivity } from '../slices/ui.selectors';
import { Activity } from './Activity';

export const ActivityRailContainer = (): React.ReactElement | null => {
  const dispatch = useAppDispatch();
  const showActivity = useAppSelector(selectUiShowActivity);
  const preferredSide = useAppSelector(selectPreferencesActivitySide);
  const side = showActivity ? preferredSide : 'hidden';
  return (
    <Activity
      entries={useAppSelector(selectActivityEntries)}
      currentStatus={useAppSelector(selectActivityCurrentStatus)}
      busy={useAppSelector(selectActivityBusy)}
      side={side}
      onClear={() => dispatch(activityCleared())}
    />
  );
};
