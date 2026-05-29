import React, { useEffect, useRef } from 'react';
import { Ico } from './Icons';

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
  const accentPairs = [
    ['#3a7e9a', '#132f3b'],
    ['#c4302b', '#3a1010'],
    ['#c89b4a', '#3a2710'],
    ['#7a3a8a', '#2a1430'],
    ['#3b82f6', '#1e3a8a'],
    ['#ffffff', '#3a3a3a']
  ];
  return (
    <div className="modal-veil" data-vd-role="modal-veil" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="customize-title" className="modal customize-modal" data-vd-role="modal-veil" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <Ico.Gear size={13} />
          <h2 id="customize-title">Customize</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Ico.X size={13} /></button>
        </div>
        <div className="modal-body customize-body">
          <div className="cz-section">
            <div className="cz-section-h">Theme</div>
            <div className="cz-section-body">
              <div className="cz-row">
                <div className="cz-row-label">Accent</div>
                <div className="cz-row-control">
                  <div className="cz-swatches">
                    {accentPairs.map(([primary, dim]) => (
                      <button
                        key={primary}
                        type="button"
                        className={`cz-swatch ${accent === primary ? 'is-active' : ''}`}
                        style={{ background: primary }}
                        aria-label={`Accent ${primary}`}
                        aria-pressed={accent === primary}
                        onClick={() => onChange({ accent: primary })}
                      >
                        <span className="cz-swatch-dim" style={{ background: dim }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cz-row">
                <div className="cz-row-label">Density</div>
                <div className="cz-row-control">
                  <div className="cz-segmented segmented">
                    <button type="button" className={`cz-seg ${density === 'compact' ? 'is-active' : ''}`} onClick={() => onChange({ density: 'compact' })}>Compact</button>
                    <button type="button" className={`cz-seg ${density === 'comfortable' ? 'is-active' : ''}`} onClick={() => onChange({ density: 'comfortable' })}>Regular</button>
                    <button type="button" className="cz-seg" onClick={() => onChange({ density: 'comfortable' })}>Comfy</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="cz-section">
            <div className="cz-section-h">Layout</div>
            <div className="cz-section-body">
              <div className="cz-row">
                <div className="cz-row-label">Activity stream</div>
                <div className="cz-row-control">
                  <div className="cz-segmented segmented">
                    <button type="button" className={`cz-seg ${activitySide === 'left' ? 'is-active' : ''}`} onClick={() => onChange({ activitySide: 'left' })}>Left</button>
                    <button type="button" className={`cz-seg ${activitySide === 'right' ? 'is-active' : ''}`} onClick={() => onChange({ activitySide: 'right' })}>Right</button>
                    <button type="button" className={`cz-seg ${activitySide === 'hidden' ? 'is-active' : ''}`} onClick={() => onChange({ activitySide: 'hidden' })}>Off</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="cz-section">
            <div className="cz-section-h">Flow</div>
            <div className="cz-section-body">
              <div className="cz-row is-inline">
                <div className="cz-row-label">Require scroll to unlock Clarify</div>
                <div className="cz-row-control">
                  <button type="button" className={`cz-toggle ${requireScroll ? 'is-on' : ''}`} role="switch" aria-checked={requireScroll} aria-label="Require scroll to unlock Clarify" onClick={() => onChange({ requireScroll: !requireScroll })}>
                    <span className="cz-toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
