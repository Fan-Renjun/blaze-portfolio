"use client";
import { useEffect, useRef } from "react";

const LAND_MASK: [number, number, [number, number][]][] = [
  [55, 70,  [[-160,-60]]],
  [45, 55,  [[-130,-55]]],
  [35, 45,  [[-125,-70]]],
  [25, 35,  [[-118,-78]]],
  [15, 25,  [[-110,-85]]],
  [10, 15,  [[-90,-78]]],
  [5, 12,   [[-80,-60]]],
  [-5, 5,   [[-78,-50]]],
  [-15,-5,  [[-78,-40]]],
  [-25,-15, [[-72,-40]]],
  [-35,-25, [[-72,-55]]],
  [-45,-35, [[-74,-62]]],
  [-55,-45, [[-74,-66]]],
  [55, 70,  [[10,40]]],
  [45, 55,  [[-5,45]]],
  [35, 45,  [[-10,40]]],
  [25, 35,  [[-10,35]]],
  [15, 25,  [[-15,40]]],
  [5, 15,   [[-15,45]]],
  [-5, 5,   [[8,42]]],
  [-15,-5,  [[12,40]]],
  [-25,-15, [[14,36]]],
  [-35,-25, [[18,32]]],
  [25, 45,  [[40,75]]],
  [15, 25,  [[40,75]]],
  [55, 75,  [[40,170]]],
  [45, 55,  [[55,140]]],
  [25, 45,  [[75,135]]],
  [15, 25,  [[75,122]]],
  [5, 15,   [[95,125]]],
  [-5, 5,   [[100,120]]],
  [10, 25,  [[68,90]]],
  [-10, 0,  [[95,140]]],
  [-25,-10, [[110,155]]],
  [-35,-25, [[112,150]]],
];

function isLand(latDeg: number, lngDeg: number): boolean {
  let lng = lngDeg;
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  for (const [a, b, ranges] of LAND_MASK) {
    if (latDeg >= a && latDeg < b) {
      for (const [s, e] of ranges) if (lng >= s && lng < e) return true;
    }
  }
  return false;
}

function buildDots(count = 1200): [number, number, number][] {
  const dots: [number, number, number][] = [];
  const phiStep = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phiStep * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const lat = Math.asin(y) * 180 / Math.PI;
    const lng = Math.atan2(z, x) * 180 / Math.PI;
    if (isLand(lat, lng)) dots.push([x, y, z]);
  }
  return dots;
}

interface GlobeProps {
  size?: number;
}

export function Globe({ size = 360 }: GlobeProps) {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  // Reduced from 5200 → 3000; canvas renders all in one draw pass
  const dotsRef = useRef<[number, number, number][] | null>(null);
  if (!dotsRef.current) dotsRef.current = buildDots(3000);
  const dots = dotsRef.current;

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const full = size + 240;
    cv.width  = full * dpr;
    cv.height = full * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    // Translate so coordinate origin matches the SVG viewBox offset
    ctx.translate(120, 120);

    const t0 = performance.now();
    let raf = 0, visible = true, lastT = 0;
    const FPS = 1000 / 24;

    const render = (now: number) => {
      if (!visible) { raf = 0; return; }
      raf = requestAnimationFrame(render);
      if (now - lastT < FPS) return;
      lastT = now;

      ctx.clearRect(-120, -120, full, full);

      const a  = ((now - t0) / 45000) * Math.PI * 2;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      const tilt = -15 * Math.PI / 180;
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const R  = size / 2 - 14;
      const cx = size / 2, cy = size / 2;

      // Single batched draw — no DOM mutations
      for (let i = 0; i < dots.length; i++) {
        const [x0, y0, z0] = dots[i];
        const x1 = x0 * cosA + z0 * sinA;
        const z1 = -x0 * sinA + z0 * cosA;
        const y2 = y0 * cosT - z1 * sinT;
        const z2 = y0 * sinT + z1 * cosT;
        if (z2 < -0.05) continue;
        const depth = (z2 + 1) / 2;
        ctx.beginPath();
        ctx.arc(cx + x1 * R, cy - y2 * R, 0.4 + depth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(0.18 + depth * 0.55).toFixed(2)})`;
        ctx.fill();
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && raf === 0) raf = requestAnimationFrame(render);
    }, { threshold: 0.01 });
    io.observe(cv);
    raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [dots, size]);

  const R  = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const off = 120, VB = size + 240;

  return (
    <div className="globe" style={{ width: size, height: size }}>
      {/* Static SVG — sphere gradients & glow halos, no animated elements */}
      <svg
        viewBox={`${-off} ${-off} ${VB} ${VB}`}
        width={VB} height={VB}
        style={{ overflow: "visible", display: "block", position: "absolute", left: -off, top: -off, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="rim" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="var(--globe-rim,#FFFFFF)" stopOpacity="0"/>
            <stop offset="78%" stopColor="var(--globe-rim,#FFFFFF)" stopOpacity="0.40"/>
            <stop offset="90%" stopColor="var(--globe-rim,#FFFFFF)" stopOpacity="0.92"/>
            <stop offset="96%" stopColor="var(--globe-rim,#FFFFFF)" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="var(--globe-rim,#FFFFFF)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="rimOuter" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--globe-halo,#A8C8FF)" stopOpacity="0"/>
            <stop offset="50%"  stopColor="var(--globe-halo,#A8C8FF)" stopOpacity="0"/>
            <stop offset="62%"  stopColor="var(--globe-halo,#A8C8FF)" stopOpacity="0.22"/>
            <stop offset="72%"  stopColor="var(--globe-halo,#B8D0FF)" stopOpacity="0.62"/>
            <stop offset="80%"  stopColor="var(--globe-halo,#B8D0FF)" stopOpacity="0.48"/>
            <stop offset="90%"  stopColor="var(--globe-halo,#A8C8FF)" stopOpacity="0.20"/>
            <stop offset="100%" stopColor="var(--globe-halo,#A8C8FF)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="rimFar" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--globe-halo,#7AA8FF)" stopOpacity="0"/>
            <stop offset="35%"  stopColor="var(--globe-halo,#7AA8FF)" stopOpacity="0"/>
            <stop offset="55%"  stopColor="var(--globe-halo,#7AA8FF)" stopOpacity="0.18"/>
            <stop offset="75%"  stopColor="var(--globe-halo,#7AA8FF)" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="var(--globe-halo,#7AA8FF)" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="globeShade" cx="38%" cy="36%" r="72%">
            <stop offset="0%"   stopColor="var(--globe-hi,#1f1f28)"  stopOpacity="1"/>
            <stop offset="55%"  stopColor="var(--globe-mid,#0c0c10)" stopOpacity="1"/>
            <stop offset="100%" stopColor="var(--globe-lo,#000000)"  stopOpacity="1"/>
          </radialGradient>
          <filter id="rimGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14"/>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={R + 140} fill="url(#rimFar)"/>
        <circle cx={cx} cy={cy} r={R + 70}  fill="url(#rimOuter)"/>
        <circle cx={cx} cy={cy} r={R + 4}   fill="url(#rim)" filter="url(#rimGlow)"/>
        <circle cx={cx} cy={cy} r={R}        fill="url(#globeShade)"/>
        <circle cx={cx} cy={cy} r={R}        fill="none" stroke="var(--globe-rim,#FFFFFF)" strokeWidth="1.2" opacity="0.72"/>
        <circle cx={cx} cy={cy} r={R + 1}    fill="none" stroke="var(--globe-rim,#FFFFFF)" strokeWidth="18"  opacity="0.28" filter="url(#rimGlow)"/>
      </svg>
      {/* Canvas — animated dot field; CSS size locked so DPR scaling doesn't distort */}
      <canvas
        ref={cvRef}
        style={{
          display: "block", position: "absolute", left: -off, top: -off,
          width: VB, height: VB,   // CSS display size = SVG display size
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
