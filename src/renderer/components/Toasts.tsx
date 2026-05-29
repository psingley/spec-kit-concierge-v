import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectUiToasts } from '../slices/ui.selectors';
import { toastDismissed } from '../slices/ui';

const AUTO_DISMISS_MS = 6000;

export const Toasts = (): React.ReactElement | null => {
  const toasts = useAppSelector(selectUiToasts);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      dispatch(toastDismissed(toasts[0]!.id));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.level}`}>
          <span className="toast__message">{toast.message}</span>
          <button className="toast__dismiss" onClick={() => dispatch(toastDismissed(toast.id))}>×</button>
        </div>
      ))}
    </div>
  );
};
