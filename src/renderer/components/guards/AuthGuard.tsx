import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../../hooks/store';
import { selectAuthGateOpen } from '../../slices/auth.selectors';

export const AuthGuard = (): React.ReactElement => {
  const gateOpen = useAppSelector(selectAuthGateOpen);
  if (!gateOpen) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
};
