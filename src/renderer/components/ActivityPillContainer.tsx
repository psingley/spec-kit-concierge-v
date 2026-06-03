import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectActivityBusy, selectActivityCurrentStatus, selectActivityLogRate } from '../slices/activity.selectors';
import { preferencesUpdated } from '../slices/preferences';
import { selectPreferencesActivitySide } from '../slices/preferences.selectors';
import { selectSessionSpecifyPrompt, selectSessionSpecifyStarted } from '../slices/session.selectors';
import { activityVisibilitySet } from '../slices/ui';
import { selectUiShowActivity } from '../slices/ui.selectors';
import { ActivityPill } from './ActivityPill';

export const ActivityPillContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const prompt = useAppSelector(selectSessionSpecifyPrompt).trim();
  const specifyStarted = useAppSelector(selectSessionSpecifyStarted);
  const busy = useAppSelector(selectActivityBusy) || (specifyStarted && prompt.length > 0);
  const showActivity = useAppSelector(selectUiShowActivity);
  const activitySide = useAppSelector(selectPreferencesActivitySide);
  const activityVisible = showActivity && activitySide !== 'hidden';
  const nextVisibleActivitySide = activitySide === 'hidden' ? 'right' : activitySide;
  return (
    <ActivityPill
      busy={busy}
      currentStatus={useAppSelector(selectActivityCurrentStatus)}
      label={busy && prompt.length > 0 ? prompt : undefined}
      logRate={useAppSelector(selectActivityLogRate)}
      onToggle={() => {
        if (activityVisible) {
          dispatch(preferencesUpdated({ activitySide: 'hidden' }));
          dispatch(activityVisibilitySet(false));
          return;
        }
        dispatch(preferencesUpdated({ activitySide: nextVisibleActivitySide }));
        dispatch(activityVisibilitySet(true));
      }}
    />
  );
};
