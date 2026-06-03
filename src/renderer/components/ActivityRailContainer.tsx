import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { activityCleared, activityFollowStateChanged, type ActivityFollowState } from '../slices/activity';
import { selectActivityBusy, selectActivityCurrentStatus, selectActivityEntries, selectActivityFollowState, selectActivityHangSuspected } from '../slices/activity.selectors';
import { selectPreferencesActivitySide } from '../slices/preferences.selectors';
import { selectUiShowActivity } from '../slices/ui.selectors';
import { Activity, type ActivityScrollMetrics } from './Activity';

export const ACTIVITY_FOLLOW_DEBOUNCE_MS = 150;

export const followStateFromScrollMetrics = (metrics: ActivityScrollMetrics): ActivityFollowState => {
  const distanceFromBottom = metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
  return distanceFromBottom <= metrics.clientHeight ? 'following' : 'paused';
};

export const ActivityRailContainer = (): React.ReactElement | null => {
  const dispatch = useAppDispatch();
  const showActivity = useAppSelector(selectUiShowActivity);
  const preferredSide = useAppSelector(selectPreferencesActivitySide);
  const side = showActivity ? preferredSide : 'hidden';
  const followTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onScrollPositionChanged = React.useCallback((metrics: ActivityScrollMetrics) => {
    if (followTimer.current !== undefined) {
      clearTimeout(followTimer.current);
    }
    followTimer.current = setTimeout(() => {
      dispatch(activityFollowStateChanged({ followState: followStateFromScrollMetrics(metrics) }));
      followTimer.current = undefined;
    }, ACTIVITY_FOLLOW_DEBOUNCE_MS);
  }, [dispatch]);

  React.useEffect(() => () => {
    if (followTimer.current !== undefined) {
      clearTimeout(followTimer.current);
    }
  }, []);

  return (
    <Activity
      entries={useAppSelector(selectActivityEntries)}
      currentStatus={useAppSelector(selectActivityCurrentStatus)}
      busy={useAppSelector(selectActivityBusy)}
      hangSuspected={useAppSelector(selectActivityHangSuspected)}
      followState={useAppSelector(selectActivityFollowState)}
      side={side}
      onClear={() => dispatch(activityCleared())}
      onScrollPositionChanged={onScrollPositionChanged}
    />
  );
};
