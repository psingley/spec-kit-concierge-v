import React from 'react';

export type AppShellProps = {
  children: React.ReactNode;
};

export const AppShell = ({ children }: AppShellProps): React.ReactElement => (
  <div className="app-shell">{children}</div>
);
