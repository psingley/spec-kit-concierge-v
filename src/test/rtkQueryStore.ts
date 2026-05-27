import { configureStore, type Middleware, type Reducer, type UnknownAction } from '@reduxjs/toolkit';

export type RtkQueryApiForTest<State = unknown, ReducerPath extends string = string> = {
  reducerPath: ReducerPath;
  reducer: Reducer<State, UnknownAction>;
  middleware: Middleware;
};

export const createRtkQueryTestStore = <State, ReducerPath extends string>(
  api: RtkQueryApiForTest<State, ReducerPath>
) => {
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer
    } as Record<ReducerPath, Reducer<State, UnknownAction>>,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
  });

  return {
    store,
    dispatch: store.dispatch
  };
};
