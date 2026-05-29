import React from 'react';
import { createMemoryRouter, Navigate, Outlet } from 'react-router';
import type { AppStore } from './store';
import { selectAuthGateOpen } from './slices/auth.selectors';
import { selectWorkspaceSelectedRepo, selectWorkspaceBranch } from './slices/workspace.selectors';
import { SignInScreenContainer } from './components/SignInScreenContainer';
import { RepoBrowseScreenContainer } from './components/RepoBrowseScreenContainer';
import { TitlebarContainer } from './components/TitlebarContainer';
import { WorkspaceContainer } from './components/WorkspaceContainer';
import { AuthGuard } from './components/guards/AuthGuard';
import { WorkspaceGuard } from './components/guards/WorkspaceGuard';

const deriveInitialEntry = (store: AppStore): string => {
  const state = store.getState();
  if (!selectAuthGateOpen(state)) return '/sign-in';
  if (selectWorkspaceSelectedRepo(state) === null || selectWorkspaceBranch(state) === null) return '/repos';
  return '/workspace';
};

const RootLayout = (): React.ReactElement =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(TitlebarContainer),
    React.createElement(Outlet)
  );

export const createAppRouter = (store: AppStore) => {
  const routes = [
    {
      element: React.createElement(RootLayout),
      children: [
        {
          path: '/sign-in',
          element: React.createElement(SignInScreenContainer)
        },
        {
          path: '/repos',
          element: React.createElement(AuthGuard),
          children: [
            {
              index: true,
              element: React.createElement(
                'div',
                { className: 'workspace' },
                React.createElement(RepoBrowseScreenContainer)
              )
            }
          ]
        },
        {
          path: '/workspace',
          element: React.createElement(AuthGuard),
          children: [
            {
              element: React.createElement(WorkspaceGuard),
              children: [
                {
                  index: true,
                  element: React.createElement(WorkspaceContainer)
                }
              ]
            }
          ]
        },
        {
          path: '*',
          element: React.createElement(CatchAllRedirect, { store })
        }
      ]
    }
  ];

  return createMemoryRouter(routes, {
    initialEntries: [deriveInitialEntry(store)]
  });
};

type CatchAllRedirectProps = { store: AppStore };

const CatchAllRedirect = ({ store }: CatchAllRedirectProps): React.ReactElement => {
  const state = store.getState();
  if (!selectAuthGateOpen(state)) return React.createElement(Navigate, { to: '/sign-in', replace: true });
  if (selectWorkspaceSelectedRepo(state) === null || selectWorkspaceBranch(state) === null) {
    return React.createElement(Navigate, { to: '/repos', replace: true });
  }
  return React.createElement(Navigate, { to: '/workspace', replace: true });
};
