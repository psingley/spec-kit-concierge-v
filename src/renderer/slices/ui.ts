import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastEntry = {
  id: string;
  level: 'error' | 'warn' | 'info';
  message: string;
};

export type UiState = {
  theme: 'system' | 'light' | 'dark';
  sidebarOpen: boolean;
  showActivity: boolean;
  showCustomize: boolean;
  showAbout: boolean;
  showRequest: boolean;
  openMenu: string | null;
  toasts: ToastEntry[];
};

export const uiInitialState: UiState = {
  theme: 'system',
  sidebarOpen: true,
  showActivity: false,
  showCustomize: false,
  showAbout: false,
  showRequest: false,
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
    modalOpened: (state, action: PayloadAction<'showCustomize' | 'showAbout' | 'showRequest'>) => {
      state[action.payload] = true;
    },
    modalClosed: (state, action: PayloadAction<'showCustomize' | 'showAbout' | 'showRequest'>) => {
      state[action.payload] = false;
    },
    menuOpened: (state, action: PayloadAction<string | null>) => {
      state.openMenu = action.payload;
    },
    toastShown: (state, action: PayloadAction<Omit<ToastEntry, 'id'>>) => {
      const id = `toast-${Date.now()}-${state.toasts.length}`;
      state.toasts.push({ id, ...action.payload });
    },
    toastDismissed: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    }
  },
  extraReducers: () => {}
});

export const { activityVisibilityToggled, activityVisibilitySet, modalOpened, modalClosed, menuOpened, toastShown, toastDismissed } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export default uiReducer;
