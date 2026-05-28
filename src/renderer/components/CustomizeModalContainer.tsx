import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { preferencesUpdated } from '../slices/preferences';
import { selectPreferencesAccent, selectPreferencesActivitySide, selectPreferencesDensity, selectPreferencesRequireScrollToUnlock } from '../slices/preferences.selectors';
import { modalClosed } from '../slices/ui';
import { selectUiShowCustomize } from '../slices/ui.selectors';
import { CustomizeModal } from './CustomizeModal';

export const CustomizeModalContainer = (): React.ReactElement | null => {
  const dispatch = useAppDispatch();
  return (
    <CustomizeModal
      open={useAppSelector(selectUiShowCustomize)}
      accent={useAppSelector(selectPreferencesAccent)}
      density={useAppSelector(selectPreferencesDensity)}
      activitySide={useAppSelector(selectPreferencesActivitySide)}
      requireScroll={useAppSelector(selectPreferencesRequireScrollToUnlock)}
      onChange={(value) => dispatch(preferencesUpdated({ ...value, requireScrollToUnlock: value.requireScroll }))}
      onClose={() => dispatch(modalClosed('showCustomize'))}
    />
  );
};
