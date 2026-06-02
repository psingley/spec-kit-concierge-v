import React, { useState } from 'react';

export type NudgeButtonResult = {
  result: 'repaired' | 'no-op' | 'escalated' | 'rejected';
  message: string;
};

export type NudgeButtonProps = {
  canNudge: boolean;
  step: string;
  onNudge: () => Promise<NudgeButtonResult>;
};

export const NudgeButton = ({ canNudge, step, onNudge }: NudgeButtonProps): React.ReactElement | null => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [alert, setAlert] = useState<string | undefined>();

  if (!canNudge) return null;

  const handleClick = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setAlert(undefined);
    setMessage(`Repairing ${step}`);
    const result = await onNudge();
    setMessage(result.message);
    if (result.result === 'escalated' || result.result === 'rejected') {
      setAlert(result.message);
    }
    setBusy(false);
  };

  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void handleClick()} aria-label={`Set branch right for ${step}`}>
        Set branch right
      </button>
      <div role="status">{message ?? `Needs attention: ${step}`}</div>
      {alert === undefined ? null : <div role="alert">{alert}</div>}
    </div>
  );
};
