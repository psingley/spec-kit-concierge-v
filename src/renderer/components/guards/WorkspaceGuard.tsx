import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../../hooks/store';
import { selectSessionEntered, selectWorkspaceSelectedRepo } from '../../slices/workspace.selectors';

export const WorkspaceGuard = (): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const entered = useAppSelector(selectSessionEntered);
  if (repo === null || !entered) return <Navigate to="/repos" replace />;
  return <Outlet />;
};
