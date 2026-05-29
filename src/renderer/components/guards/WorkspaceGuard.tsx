import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../../hooks/store';
import { selectWorkspaceSelectedRepo, selectWorkspaceBranch } from '../../slices/workspace.selectors';

export const WorkspaceGuard = (): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  if (repo === null || branch === null) return <Navigate to="/repos" replace />;
  return <Outlet />;
};
