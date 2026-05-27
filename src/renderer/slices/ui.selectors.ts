import type { RootState } from '../store';

export const selectUiState = (state: RootState) => state.ui;
export const selectUiTheme = (state: RootState) => state.ui.theme;
export const selectUiSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectUiActiveView = (state: RootState) => state.ui.activeView;
