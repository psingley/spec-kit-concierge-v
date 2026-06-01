import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { toastDismissed } from '../slices/ui';
import { selectUiToasts } from '../slices/ui.selectors';

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
    <div className="toasts-container" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.level}`}>
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__dismiss"
            aria-label="Dismiss notification"
            onClick={() => dispatch(toastDismissed(toast.id))}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
};
