import { useEffect, useRef } from 'react';

// ─── EKG shape helpers ────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Control points: [distFromCenter (0–0.5), yNorm (-1 to 1, positive = up)]
const RIGHT_PTS: [number, number][] = [
  [0.000,  1.00],   // R peak
  [0.028, -0.50],   // S dip
  [0.058,  0.00],   // back to baseline
  [0.090,  0.24],   // T wave
  [0.130,  0.00],   // T done → flat
];
const LEFT_PTS: [number, number][] = [
  [0.000,  1.00],   // R peak
  [0.022, -0.22],   // Q dip
  [0.052,  0.00],   // back to baseline
  [0.078,  0.13],   // P wave
  [0.115,  0.00],   // P done → flat
];

function ekgY(pts: [number, number][], d: number): number {
  if (d >= pts[pts.length - 1][0]) return 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (d <= x1) return lerp(y0, y1, (d - x0) / (x1 - x0));
  }
  return 0;
}

// ─── Layer definitions ────────────────────────────────────────────────────────

interface Layer {
  amplitudeScale: number;
  opacity: number;
  lineWidth: number;
  glowBlur: number;
  delay: number; // 0–1 phase offset in cycle
}

const LAYERS: Layer[] = [
  { amplitudeScale: 2.8, opacity: 0.07, lineWidth: 1,   glowBlur: 10, delay: 0.34 },
  { amplitudeScale: 1.9, opacity: 0.11, lineWidth: 1.5, glowBlur: 14, delay: 0.17 },
  { amplitudeScale: 1.0, opacity: 1.00, lineWidth: 2.5, glowBlur: 22, delay: 0.00 },
];

const CYCLE_MS = 2300; // heartbeat period
const STEPS    = 600;  // canvas segments — higher = smoother curve

// ─── Component ────────────────────────────────────────────────────────────────

const HeartbeatBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    let animId: number;
    let startTime = performance.now();
    let W = 0, H = 0, DPR = 1;

    // ── Resize handler ───────────────────────────────────────────────────────
    const resize = () => {
      DPR = window.devicePixelRatio || 1;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      ctx.scale(DPR, DPR);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Per-layer reveal/opacity given phase progress t (0–1) ────────────────
    // Option A: quick spike, propagates outward, then decays
    function getLayerState(t: number): { reveal: number; opacity: number } {
      if (t < 0.08) {
        // Fast expansion from center
        return { reveal: t / 0.08, opacity: 1 };
      } else if (t < 0.55) {
        // Fully revealed, glow fades
        return { reveal: 1, opacity: lerp(1, 0.18, (t - 0.08) / 0.47) };
      } else {
        // Quiet decay
        return { reveal: 1, opacity: lerp(0.18, 0, (t - 0.55) / 0.45) };
      }
    }

    // ── Main draw loop ───────────────────────────────────────────────────────
    function draw(now: number) {
      const elapsed = (now - startTime) % (CYCLE_MS * 100); // avoid float drift
      const cycleT  = (elapsed % CYCLE_MS) / CYCLE_MS; // 0–1

      ctx.clearRect(0, 0, W, H);

      // Radial background tint — slightly lighter at center
      const bgGrad = ctx.createRadialGradient(
        W / 2, H / 2, 0,
        W / 2, H / 2, Math.hypot(W / 2, H / 2)
      );
      bgGrad.addColorStop(0,   'rgba(0,22,42,0.45)');
      bgGrad.addColorStop(0.5, 'rgba(0,8,18,0.25)');
      bgGrad.addColorStop(1,   'rgba(0,0,10,0.55)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const cx      = W / 2;
      const cy      = H / 2;
      const halfAmp = H * 0.28; // base amplitude (fraction of canvas height)

      // ── Draw each layer ──────────────────────────────────────────────────
      for (const layer of LAYERS) {
        const layerT = ((cycleT + layer.delay) % 1 + 1) % 1;
        const { reveal, opacity } = getLayerState(layerT);

        const finalOpacity  = layer.opacity * opacity;
        const revealPx      = reveal * (W / 2); // pixels from center to reveal
        const amp           = halfAmp * layer.amplitudeScale;

        // Stroke gradient: bright at center, transparent at edges
        const fadeStart = Math.max(0, cx - revealPx);
        const fadeEnd   = Math.min(W, cx + revealPx);
        const strokeGrad = ctx.createLinearGradient(fadeStart, 0, fadeEnd, 0);
        strokeGrad.addColorStop(0,    `rgba(74,124,47,0)`);
        strokeGrad.addColorStop(0.25, `rgba(45,80,22,${finalOpacity * 0.25})`);
        strokeGrad.addColorStop(0.45, `rgba(74,124,47,${finalOpacity * 0.7})`);
        strokeGrad.addColorStop(0.5,  `rgba(107,143,62,${finalOpacity})`);
        strokeGrad.addColorStop(0.55, `rgba(74,124,47,${finalOpacity * 0.7})`);
        strokeGrad.addColorStop(0.75, `rgba(45,80,22,${finalOpacity * 0.25})`);
        strokeGrad.addColorStop(1,    `rgba(74,124,47,0)`);

        // Draw twice: wide glow pass + sharp line pass
        for (let pass = 0; pass < 2; pass++) {
          const isGlowPass = pass === 0;

          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = strokeGrad;
          ctx.lineWidth   = isGlowPass ? layer.lineWidth + 6 : layer.lineWidth;
          ctx.shadowColor = `rgba(74,124,47,${finalOpacity * 0.9})`;
          ctx.shadowBlur  = isGlowPass ? layer.glowBlur * 2 : layer.glowBlur;
          if (isGlowPass) ctx.globalAlpha = 0.35;

          let penDown = false;

          for (let i = 0; i <= STEPS; i++) {
            const nx   = i / STEPS;          // 0→1 across canvas
            const px   = nx * W;             // pixel x
            const dist = Math.abs(px - cx);  // px from center

            // Clip to reveal range (with a short soft edge)
            if (dist > revealPx + 10) {
              penDown = false;
              continue;
            }

            // EKG y
            const dNorm = dist / W;          // normalized dist from center (0–0.5)
            const side  = px >= cx ? RIGHT_PTS : LEFT_PTS;
            const yNorm = ekgY(side, dNorm);
            const py    = cy - yNorm * amp;

            if (!penDown) {
              ctx.moveTo(px, py);
              penDown = true;
            } else {
              ctx.lineTo(px, py);
            }
          }

          ctx.stroke();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'block',
      }}
    />
  );
};

export default HeartbeatBackground;
