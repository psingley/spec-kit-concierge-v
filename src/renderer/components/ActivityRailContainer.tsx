import React from 'react';
import { useAppSelector } from '../hooks/store';
import { selectActivityBusy, selectActivityCurrentStatus, selectActivityEntries } from '../slices/activity.selectors';
import { selectPreferencesActivitySide } from '../slices/preferences.selectors';
import { selectUiShowActivity } from '../slices/ui.selectors';
import { Activity } from './Activity';

export const ActivityRailContainer = (): React.ReactElement | null => {
  const showActivity = useAppSelector(selectUiShowActivity);
  const preferredSide = useAppSelector(selectPreferencesActivitySide);
  const side = showActivity ? preferredSide : 'hidden';
  return (
    <Activity
      entries={useAppSelector(selectActivityEntries)}
      currentStatus={useAppSelector(selectActivityCurrentStatus)}
      busy={useAppSelector(selectActivityBusy)}
      side={side}
    />
  );
};
