// File-a-request modal — feature or bug to the concierge team

function RequestModal({ onClose }) {
  const [kind, setKind] = React.useState("feature");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [severity, setSeverity] = React.useState("normal");
  const [sent, setSent] = React.useState(false);

  if (sent) {
    return (
      <div className="modal-veil" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-body" style={{ alignItems: "center", textAlign: "center", paddingTop: 32, paddingBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 22,
              background: "var(--good-bg)", color: "var(--good)",
              display: "grid", placeItems: "center", margin: "0 auto 12px",
            }}>
              <Ico.Check size={20} />
            </div>
            <h3 style={{ margin: "0 0 4px", fontWeight: 500 }}>Request sent</h3>
            <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 12.5 }}>
              The concierge team will triage and respond within 24h. Tracking ID:{" "}
              <span className="mono" style={{ color: "var(--text)" }}>CC-2419</span>
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <Ico.Send />
          <h3>File a request to the concierge team</h3>
          <button className="icon-btn" onClick={onClose}><Ico.X /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <div className="label">Request type</div>
            <div className="segctl">
              <button
                className={kind === "feature" ? "is-active" : ""}
                onClick={() => setKind("feature")}
              ><Ico.Sparkles size={11} /> &nbsp;Feature</button>
              <button
                className={kind === "bug" ? "is-active" : ""}
                onClick={() => setKind("bug")}
              ><Ico.Bug size={11} /> &nbsp;Bug</button>
            </div>
          </div>

          <div className="field">
            <div className="label">Title</div>
            <input
              placeholder={kind === "feature"
                ? "Concise summary of the requested capability…"
                : "What broke? Be specific."}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <div className="label">Details</div>
            <textarea
              placeholder={kind === "feature"
                ? "Who needs this? What problem does it solve? Any specific repos or flows?"
                : "Steps to reproduce, expected vs actual, repo, commit, env."}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {kind === "bug" && (
            <div className="field">
              <div className="label">Severity</div>
              <div className="segctl">
                <button className={severity === "low"    ? "is-active" : ""} onClick={() => setSeverity("low")}>Low</button>
                <button className={severity === "normal" ? "is-active" : ""} onClick={() => setSeverity("normal")}>Normal</button>
                <button className={severity === "high"   ? "is-active" : ""} onClick={() => setSeverity("high")}>High</button>
                <button className={severity === "block"  ? "is-active" : ""} onClick={() => setSeverity("block")}>Blocker</button>
              </div>
            </div>
          )}

          <div className="field">
            <div className="label">Attach context (auto)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span className="tag info"><Ico.Term size={10} /> activity log (last 200 lines)</span>
              <span className="tag info"><Ico.File size={10} /> current spec.md</span>
              <span className="tag"><Ico.Github size={10} /> repo context</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <span style={{ flex: 1, fontSize: 11.5, color: "var(--text-faint)" }}>
            Goes to <span className="mono" style={{ color: "var(--text-dim)" }}>#concierge-triage</span>
          </span>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={!title.trim()}
            onClick={() => setSent(true)}
          >
            <Ico.Send /> Send request
          </button>
        </div>
      </div>
    </div>
  );
}

window.RequestModal = RequestModal;
