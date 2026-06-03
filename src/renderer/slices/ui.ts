import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type ToastEntry = {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
};

export type UiState = {
  theme: 'system' | 'light' | 'dark';
  sidebarOpen: boolean;
  activeView: string | null;
  showActivity: boolean;
  showCustomize: boolean;
  showAbout: boolean;
  showRequest: boolean;
  showArtifactViewer: boolean;
  showJiraSubmission: boolean;
  artifactViewerPath: string | null;
  artifactViewerOrigin: 'passive' | 'review' | null;
  openMenu: string | null;
  toasts: ToastEntry[];
};

export const uiInitialState: UiState = {
  theme: 'system',
  sidebarOpen: true,
  activeView: null,
  showActivity: true,
  showCustomize: false,
  showAbout: false,
  showRequest: false,
  showArtifactViewer: false,
  showJiraSubmission: false,
  artifactViewerPath: null,
  artifactViewerOrigin: null,
  openMenu: null,
  toasts: []
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: uiInitialState,
  reducers: {
    activityVisibilityToggled: (state) => {
      state.showActivity = !state.showActivity;
    },
    activityVisibilitySet: (state, action: PayloadAction<boolean>) => {
      state.showActivity = action.payload;
    },
    modalOpened: (state, action: PayloadAction<'showCustomize' | 'showAbout' | 'showRequest' | 'showJiraSubmission'>) => {
      state[action.payload] = true;
    },
    modalClosed: (state, action: PayloadAction<'showCustomize' | 'showAbout' | 'showRequest' | 'showArtifactViewer' | 'showJiraSubmission'>) => {
      state[action.payload] = false;
      if (action.payload === 'showArtifactViewer') {
        state.artifactViewerPath = null;
        state.artifactViewerOrigin = null;
      }
    },
    artifactViewerOpened: (state, action: PayloadAction<{ path: string; origin: 'passive' | 'review' }>) => {
      state.showArtifactViewer = true;
      state.artifactViewerPath = action.payload.path;
      state.artifactViewerOrigin = action.payload.origin;
    },
    artifactViewerClosed: (state) => {
      state.showArtifactViewer = false;
      state.artifactViewerPath = null;
      state.artifactViewerOrigin = null;
    },
    menuOpened: (state, action: PayloadAction<string | null>) => {
      state.openMenu = action.payload;
    },
    toastShown: {
      prepare: (payload: Omit<ToastEntry, 'id'>) => ({ payload: { id: nanoid(), ...payload } }),
      reducer: (state, action: PayloadAction<ToastEntry>) => {
        state.toasts.push(action.payload);
      }
    },
    toastDismissed: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    }
  },
  extraReducers: () => {}
});

export const { activityVisibilityToggled, activityVisibilitySet, modalOpened, modalClosed, artifactViewerOpened, artifactViewerClosed, menuOpened, toastShown, toastDismissed } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export default uiReducer;
