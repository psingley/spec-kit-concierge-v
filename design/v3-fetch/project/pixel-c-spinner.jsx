// Reusable pixel-C spinner. Same breathing/refining animation as the activity
// pill, exposed at any size. Used:
//   - tiny in the activity-stream toggle pill (size 9, cell 2)
//   - large as the "Syncing to JIRA" hero (size 9, cell 8+)

function PixelCSpinner({
  size = 9,
  cell = 2,
  pixelation = 1,
  color,
  busy = false,
  speed = 1,
  perfect = false,
}) {
  const canvasRef = React.useRef(null);
  // Live params — read by the render loop without restarting the effect on
  // every change. Otherwise the canvas reinitializes whenever pixelation /
  // speed update (e.g. each RAF in the JIRA syncing view), causing flicker.
  const liveRef = React.useRef({ pixelation, color, busy, speed });
  liveRef.current = { pixelation, color, busy, speed };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * cell * dpr;
    canvas.height = size * cell * dpr;
    canvas.style.width = `${size * cell}px`;
    canvas.style.height = `${size * cell}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const center = (size - 1) / 2;
    const maxR = Math.hypot(center, center);
    const pixels = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const d = Math.hypot(dx, dy);
        let a = Math.atan2(dy, dx);
        if (a < 0) a += Math.PI * 2;
        const jitter = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        pixels.push({ x, y, d, a, jitter: Math.abs(jitter) });
      }
    }

    const resolveColor = () => {
      if (liveRef.current.color) return liveRef.current.color;
      const cs = getComputedStyle(canvas);
      return (liveRef.current.busy
        ? cs.getPropertyValue("--accent").trim() || "#3a7e9a"
        : cs.getPropertyValue("--text-dim").trim() || "#888");
    };

    const CYCLE_TYPES = perfect
      ? ["sharp", "bold", "sharp", "bold"]
      : ["pixely", "sharp", "bold", "pixely", "pixely"];

    const WEDGE = Math.PI * 0.32;
    const ROT = 0;

    const render = (t, kind) => {
      const onColor = resolveColor();
      ctx.clearRect(0, 0, size * cell, size * cell);
      ctx.fillStyle = onColor;

      const breath = (1 - Math.cos(t * Math.PI * 2)) / 2;
      let rOuter = (0.78 + breath * 0.2) * maxR + 0.3;
      let rInner = Math.max(1.4, rOuter * 0.45);
      let wedge = WEDGE * (0.6 + breath * 0.4);
      let refinedness = 0;

      if (kind === "sharp") {
        const phase = Math.abs(Math.cos(t * Math.PI * 2));
        refinedness = Math.pow(phase, 3);
        rOuter = (0.74 + breath * 0.22) * maxR + 0.3;
        rInner = Math.max(1.5, rOuter * 0.48);
        wedge = WEDGE * (0.55 + breath * 0.45);
      } else if (kind === "bold") {
        const phase = (1 - Math.cos(t * Math.PI * 2)) / 2;
        refinedness = Math.pow(phase, 2);
        rOuter = (0.86 + breath * 0.18) * maxR + 0.5;
        rInner = Math.max(1.1, rOuter * 0.34);
        wedge = WEDGE * (0.5 + (1 - breath) * 0.4);
      }

      const baseGrit = perfect ? 0 : liveRef.current.pixelation;
      const jOuter = (0.9 * (1 - refinedness) + 0.05 * refinedness) * baseGrit;
      const jInner = (0.8 * (1 - refinedness) + 0.05 * refinedness) * baseGrit;
      const jWedge = (0.15 * (1 - refinedness) + 0.02 * refinedness) * baseGrit;

      ctx.globalAlpha = 0.9;
      for (const p of pixels) {
        const dx = Math.abs(p.x - center);
        const dy = Math.abs(p.y - center);
        if (dx >= center - 0.25 && dy >= center - 0.25) continue;

        const outerEdge = rOuter - p.d;
        const innerEdge = p.d - rInner;
        if (outerEdge < p.jitter * jOuter - 0.15) continue;
        if (innerEdge < -p.jitter * jInner - 0.1) continue;

        let a = (p.a + ROT) % (Math.PI * 2);
        if (a > Math.PI) a -= Math.PI * 2;
        if (Math.abs(a) < wedge / 2 + p.jitter * jWedge - 0.05) continue;

        ctx.fillRect(p.x * cell, p.y * cell, cell, cell);
      }
    };

    let frame = 0;
    let cycleIndex = 0;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const delta = now - last;
      if (delta >= 42) {
        const basePeriod = liveRef.current.busy ? 70 : 110;
        const PERIOD = Math.max(32, Math.round(basePeriod / liveRef.current.speed));
        const nextFrame = frame + 1;
        if (nextFrame >= PERIOD) {
          cycleIndex = (cycleIndex + 1) % CYCLE_TYPES.length;
          frame = 0;
        } else {
          frame = nextFrame;
        }
        render(frame / PERIOD, CYCLE_TYPES[cycleIndex]);
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, cell, perfect]);

  return <canvas ref={canvasRef} className="pixel-c-canvas" />;
}

window.PixelCSpinner = PixelCSpinner;
