// Activity stream toggle pill — terminal icon on left, pixel-C spinner on
// the right. Always-visible activity indicator even when the stream is
// collapsed.

function ActivityPill({ open, busy, log, step, maxStep, onToggle }) {
  // Track recent log additions to derive an activity rate.
  const rateRef = React.useRef({ recentTs: [], lastLen: 0 });
  const [speed, setSpeed] = React.useState(1);

  React.useEffect(() => {
    const r = rateRef.current;
    const now = performance.now();
    const delta = (log?.length || 0) - r.lastLen;
    r.lastLen = log?.length || 0;
    for (let i = 0; i < delta; i++) r.recentTs.push(now);
    while (r.recentTs.length && now - r.recentTs[0] > 6000) r.recentTs.shift();
    const rate = r.recentTs.length / 6;
    const boost = Math.min(1, rate / 2);
    setSpeed(1 + boost * 2);  // up to 3× speed
  }, [log?.length]);

  const STEP_PIXEL = {
    specify: 1.0,
    clarify: 0.85,
    plan:    0.7,
    analyze: 0.55,
    tasks:   0.4,
    final:   0.2,
  };
  const finished = maxStep === "final";
  const pixelation = finished ? 0 : (STEP_PIXEL[step] ?? 1.0);

  return (
    <button
      className={"activity-pill " + (open ? "is-open" : "") + (busy ? " is-busy" : "")}
      onClick={onToggle}
      title={open ? "Hide activity stream" : "Show activity stream"}
    >
      <span className="ap-term">
        <Ico.Term size={12} />
      </span>
      <span className="ap-divider" />
      <span className="ap-spinner-wrap">
        <PixelCSpinner size={9} cell={2} busy={busy} pixelation={pixelation} speed={speed} />
      </span>
    </button>
  );
}

window.ActivityPill = ActivityPill;
