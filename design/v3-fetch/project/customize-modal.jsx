// Customize modal — accessed from the gear menu. Houses what used to be the
// floating Tweaks panel.

function CustomizeModal({ onClose, t, setTweak }) {
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal customize-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <Ico.Gear size={13} />
          <h3>Customize</h3>
          <button className="icon-btn" onClick={onClose}><Ico.X /></button>
        </div>
        <div className="modal-body customize-body">

          <CzSection label="Theme">
            <CzRow label="Accent">
              <div className="cz-swatches">
                {[
                  ["#3a7e9a", "#132f3b"],
                  ["#c4302b", "#3a1010"],
                  ["#c89b4a", "#3a2710"],
                  ["#7a3a8a", "#2a1430"],
                  ["#3b82f6", "#1e3a8a"],
                  ["#ffffff", "#3a3a3a"],
                ].map((pair) => {
                  const key = pair[0];
                  const active = Array.isArray(t.accent) && t.accent[0] === key;
                  return (
                    <button
                      key={key}
                      className={"cz-swatch " + (active ? "is-active" : "")}
                      style={{ background: key }}
                      onClick={() => setTweak("accent", pair)}
                      title={key}
                      aria-pressed={active}
                    >
                      <span className="cz-swatch-dim" style={{ background: pair[1] }} />
                    </button>
                  );
                })}
              </div>
            </CzRow>

            <CzRow label="Density">
              <CzSegmented
                value={t.density}
                options={[
                  { value: "compact", label: "Compact" },
                  { value: "regular", label: "Regular" },
                  { value: "comfy",   label: "Comfy" },
                ]}
                onChange={v => setTweak("density", v)}
              />
            </CzRow>
          </CzSection>

          <CzSection label="Layout">
            <CzRow label="Activity stream">
              <CzSegmented
                value={t.activitySide}
                options={[
                  { value: "left",   label: "Left" },
                  { value: "right",  label: "Right" },
                  { value: "hidden", label: "Off" },
                ]}
                onChange={v => setTweak("activitySide", v)}
              />
            </CzRow>
          </CzSection>

          <CzSection label="Flow">
            <CzRow label="Require scroll to unlock Clarify" inline>
              <CzToggle
                value={t.requireScrollToUnlock}
                onChange={v => setTweak("requireScrollToUnlock", v)}
              />
            </CzRow>
          </CzSection>

        </div>
      </div>
    </div>
  );
}

function CzSection({ label, children }) {
  return (
    <div className="cz-section">
      <div className="cz-section-h">{label}</div>
      <div className="cz-section-body">{children}</div>
    </div>
  );
}

function CzRow({ label, children, inline }) {
  return (
    <div className={"cz-row " + (inline ? "is-inline" : "")}>
      <div className="cz-row-label">{label}</div>
      <div className="cz-row-control">{children}</div>
    </div>
  );
}

function CzSegmented({ value, options, onChange }) {
  return (
    <div className="cz-segmented">
      {options.map(o => (
        <button
          key={o.value}
          className={"cz-seg " + (o.value === value ? "is-active" : "")}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CzToggle({ value, onChange }) {
  return (
    <button
      className={"cz-toggle " + (value ? "is-on" : "")}
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      type="button"
    >
      <span className="cz-toggle-thumb" />
    </button>
  );
}

window.CustomizeModal = CustomizeModal;
