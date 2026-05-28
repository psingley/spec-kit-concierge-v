// Activity stream — right-side log panel with current state + spinner

function Activity({ log, busy, current, onClear }) {
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [log.length]);

  return (
    <aside className="activity">
      <div className="activity-head">
        <div className="h">
          <Ico.Term size={12} />
          <span>Activity</span>
        </div>
        <div className={"activity-status " + (busy ? "" : "idle")}>
          {busy ? <div className="spinner sm" /> : <span className="dot" />}
          <span>{busy ? "running" : "idle"}</span>
        </div>
      </div>

      <div className="activity-now">
        {busy ? <div className="spinner" /> : <div className="pulse-dot" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label">Current</div>
          <div className="now-text" dangerouslySetInnerHTML={{ __html: current }} />
        </div>
      </div>

      <div className="activity-stream" ref={streamRef}>
        {log.map((l, i) => (
          <div key={i} className={"log-line " + l.k}>
            <span className="ts">{l.t}</span>
            <span className="glyph">{l.g}</span>
            <span className="msg" dangerouslySetInnerHTML={{ __html: l.m }} />
          </div>
        ))}
      </div>

      <div className="activity-foot">
        <div className="seek">
          <span>{log.length} lines</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span>auto-scroll</span>
        </div>
        <button className="icon-btn" onClick={onClear} title="Clear">
          <Ico.X /> Clear
        </button>
      </div>
    </aside>
  );
}

window.Activity = Activity;
