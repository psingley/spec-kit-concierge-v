import type { RootState } from '../store';

export const selectUiState = (state: RootState) => state.ui;
export const selectUiTheme = (state: RootState) => state.ui.theme;
export const selectUiSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectUiActiveView = (state: RootState) => state.ui.activeView;
export const selectUiShowActivity = (state: RootState) => state.ui.showActivity;
export const selectUiShowCustomize = (state: RootState) => state.ui.showCustomize;
export const selectUiShowAbout = (state: RootState) => state.ui.showAbout;
export const selectUiShowRequest = (state: RootState) => state.ui.showRequest;
export const selectUiShowArtifactViewer = (state: RootState) => state.ui.showArtifactViewer;
export const selectUiShowJiraSubmission = (state: RootState) => state.ui.showJiraSubmission;
export const selectUiArtifactViewerPath = (state: RootState) => state.ui.artifactViewerPath;
export const selectUiArtifactViewerOrigin = (state: RootState) => state.ui.artifactViewerOrigin;
export const selectUiOpenMenu = (state: RootState) => state.ui.openMenu;
export const selectUiToasts = (state: RootState) => state.ui.toasts;
