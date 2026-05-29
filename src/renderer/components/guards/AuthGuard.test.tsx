import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthGuard } from './AuthGuard';
import { authReducer } from '../../slices/auth';
import { workspaceReducer } from '../../slices/workspace';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createTestStore = (overrides: Record<string, any> = {}) =>
  configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer },
    preloadedState: overrides
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

const renderWithRouter = (store: ReturnType<typeof createTestStore>, initialEntry = '/protected') => {
  const routes = [
    {
      path: '/',
      element: <AuthGuard />,
      children: [{ path: 'protected', element: <div data-testid="protected-content">Protected</div> }]
    },
    { path: '/sign-in', element: <div data-testid="sign-in-redirect">Sign In</div> }
  ];
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
};

describe('AuthGuard', () => {
  it('renders Outlet (children) when authenticated', () => {
    const store = createTestStore({
      auth: { copilotLoggedIn: true, githubLoggedIn: true, github: 'ok', copilot: 'ok', atlassian: 'out', identity: null, lastError: null }
    });
    renderWithRouter(store);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to /sign-in when not authenticated', () => {
    const store = createTestStore({
      auth: { copilotLoggedIn: null, githubLoggedIn: null, github: 'unknown', copilot: 'locked', atlassian: 'out', identity: null, lastError: null }
    });
    renderWithRouter(store);

    expect(screen.getByTestId('sign-in-redirect')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
