import React, { useEffect, useRef } from 'react';

export type CustomizeModalProps = {
  open: boolean;
  accent: string;
  density: 'compact' | 'comfortable';
  activitySide: 'left' | 'right' | 'hidden';
  requireScroll: boolean;
  onChange: (value: Partial<Pick<CustomizeModalProps, 'accent' | 'density' | 'activitySide' | 'requireScroll'>>) => void;
  onClose: () => void;
};

export const CustomizeModal = ({ open, accent, density, activitySide, requireScroll, onChange, onClose }: CustomizeModalProps): React.ReactElement | null => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="customize-title" className="modal">
      <h2 id="customize-title">Customize</h2>
      <label>Accent <input aria-label="Accent" value={accent} onChange={(event) => onChange({ accent: event.target.value })} /></label>
      <label>Density
        <select aria-label="Density" value={density} onChange={(event) => onChange({ density: event.target.value as 'compact' | 'comfortable' })}>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </label>
      <fieldset>
        <legend>Activity side</legend>
        {(['left', 'right', 'hidden'] as const).map((side) => (
          <button key={side} type="button" aria-pressed={activitySide === side} onClick={() => onChange({ activitySide: side })}>{side}</button>
        ))}
      </fieldset>
      <button type="button" role="switch" aria-checked={requireScroll} onClick={() => onChange({ requireScroll: !requireScroll })}>Require scroll to unlock</button>
      <button ref={closeRef} type="button" onClick={onClose}>Close</button>
    </div>
  );
};
