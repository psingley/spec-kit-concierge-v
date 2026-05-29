import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UiState = {
  theme: 'system' | 'light' | 'dark';
  sidebarOpen: boolean;
  activeView: string | null;
  showActivity: boolean;
  showCustomize: boolean;
  showAbout: boolean;
  showRequest: boolean;
  openMenu: string | null;
};

export const uiInitialState: UiState = {
  theme: 'system',
  sidebarOpen: true,
  activeView: null,
  showActivity: false,
  showCustomize: false,
  showAbout: false,
  showRequest: false,
  openMenu: null
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
    }
  },
  extraReducers: () => {}
});

export const { activityVisibilityToggled, activityVisibilitySet, modalOpened, modalClosed, menuOpened } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export default uiReducer;
