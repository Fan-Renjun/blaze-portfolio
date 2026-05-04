"use client";
import { useEffect, useRef } from "react";

// ─── colour palette (fixed, not theme-dependent) ─────────────
const C = {
  core:  [180, 220, 255] as const,   // particle bright core
  glow:  [ 80, 160, 255] as const,   // particle halo / line glow
  line:  [100, 170, 255] as const,   // connection line
};

// ─── tuning knobs ─────────────────────────────────────────────
const MAX_PARTICLES   = 100;
const AREA_PER_PART   = 13_000;
const CONNECT_DIST    = 160;
const MOUSE_RADIUS    = 180;
const MOUSE_FORCE     = 0.55;
const PARALLAX_RATIO  = 0.14;
const BASE_SPEED      = 0.38;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  phase: number;
  bFreq: number;
  bright: boolean;
}

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    let parts: Particle[] = [];
    let raf = 0;
    let time = 0;

    const mouse = { x: -9999, y: -9999 };
    let scrollY = 0;

    // ── canvas setup ─────────────────────────────────────────
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width  = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      const N = Math.min(MAX_PARTICLES, Math.floor((w * h) / AREA_PER_PART));
      parts = Array.from({ length: N }, () => ({
        x:      Math.random() * w,
        y:      Math.random() * h,
        vx:     (Math.random() - 0.5) * BASE_SPEED * 2,
        vy:     (Math.random() - 0.5) * BASE_SPEED * 2,
        r:      Math.random() * 1.4 + 0.7,
        phase:  Math.random() * Math.PI * 2,
        bFreq:  0.006 + Math.random() * 0.009,
        bright: Math.random() < 0.22,
      }));
    };

    const tick = () => {
      time++;
      ctx.clearRect(0, 0, w, h);

      const yOff = scrollY * PARALLAX_RATIO;
      const px = new Float32Array(parts.length);
      const py = new Float32Array(parts.length);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        // mouse repulsion
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < MOUSE_RADIUS * MOUSE_RADIUS && md2 > 0) {
          const md = Math.sqrt(md2);
          const f  = (1 - md / MOUSE_RADIUS) * MOUSE_FORCE;
          p.vx += (mdx / md) * f;
          p.vy += (mdy / md) * f;
        }

        p.vx *= 0.975;
        p.vy *= 0.975;
        const sp = Math.hypot(p.vx, p.vy);
        const MAX_SP = 2.0;
        if (sp > MAX_SP) { p.vx = (p.vx / sp) * MAX_SP; p.vy = (p.vy / sp) * MAX_SP; }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w; else if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; else if (p.y > h) p.y = 0;

        px[i] = p.x;
        py[i] = ((p.y - yOff) % h + h) % h;
      }

      // connection lines with shadow glow
      ctx.save();
      ctx.shadowColor = `rgba(${C.glow[0]},${C.glow[1]},${C.glow[2]},0.9)`;
      ctx.shadowBlur  = 8;

      const DIST2 = CONNECT_DIST * CONNECT_DIST;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = px[i] - px[j];
          const dy = py[i] - py[j];
          const d2 = dx * dx + dy * dy;
          if (d2 >= DIST2) continue;

          const t = 1 - d2 / DIST2;
          const bA = Math.sin(parts[i].phase + time * parts[i].bFreq);
          const bB = Math.sin(parts[j].phase + time * parts[j].bFreq);
          const alpha = t * t * 0.55 * (0.75 + (bA + bB) * 0.125);

          ctx.strokeStyle = `rgba(${C.line[0]},${C.line[1]},${C.line[2]},${alpha.toFixed(3)})`;
          ctx.lineWidth   = 0.7 + t * 0.9;
          ctx.beginPath();
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[j], py[j]);
          ctx.stroke();
        }
      }
      ctx.restore();

      // particles
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const breath   = Math.sin(p.phase + time * p.bFreq);
        const bOpacity = 0.45 + breath * 0.30;
        const bRadius  = p.r * (1 + breath * 0.28);
        const haloR    = bRadius * (p.bright ? 14 : 7);

        const g = ctx.createRadialGradient(px[i], py[i], 0, px[i], py[i], haloR);
        g.addColorStop(0, `rgba(${C.glow[0]},${C.glow[1]},${C.glow[2]},${((p.bright ? 0.72 : 0.42) * bOpacity).toFixed(3)})`);
        g.addColorStop(1, `rgba(${C.glow[0]},${C.glow[1]},${C.glow[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px[i], py[i], haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${C.core[0]},${C.core[1]},${C.core[2]},${(bOpacity * (p.bright ? 1.0 : 0.82)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], bRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    const onMouseMove  = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = ()               => { mouse.x = -9999; mouse.y = -9999; };
    const onScroll     = ()               => { scrollY = window.scrollY; };

    resize(); init(); tick();

    const ro = new ResizeObserver(() => { resize(); init(); });
    ro.observe(cv);
    window.addEventListener("mousemove",    onMouseMove,  { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll",       onScroll,     { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove",    onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll",       onScroll);
    };
  }, []);

  return <canvas ref={ref} className="bg-particles" />;
}
