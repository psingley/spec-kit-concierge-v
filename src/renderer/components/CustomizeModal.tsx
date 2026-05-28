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
      <section className="modal-section" aria-label="Accent">
        <span>Accent</span>
        <span className="swatch" aria-label={`Teal accent ${accent}`} role="img" />
      </section>
      <section className="modal-section">
        <span>Density</span>
        <div className="tile-row">
          {(['comfortable', 'compact'] as const).map((value) => (
            <button key={value} type="button" className="tile" aria-pressed={density === value} onClick={() => onChange({ density: value })}>{value}</button>
          ))}
        </div>
      </section>
      <fieldset className="modal-section">
        <legend>Activity side</legend>
        <div className="tile-row">
        {(['right', 'hidden'] as const).map((side) => (
          <button key={side} type="button" aria-pressed={activitySide === side} onClick={() => onChange({ activitySide: side })}>{side}</button>
        ))}
        </div>
      </fieldset>
      <button type="button" className="switch" role="switch" aria-checked={requireScroll} onClick={() => onChange({ requireScroll: !requireScroll })}>Require scroll to unlock</button>
      <button ref={closeRef} type="button" onClick={onClose}>Close</button>
    </div>
  );
};
