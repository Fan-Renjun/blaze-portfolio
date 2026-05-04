"use client";
import { useEffect, useRef } from "react";

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf: number;
    let w: number, h: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const accentRGB = (): [number, number, number] => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      let hex = v.replace("#", "");
      if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
      const n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    let [AR, AG, AB] = accentRGB();
    const obs = new MutationObserver(() => { [AR, AG, AB] = accentRGB(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; bright: boolean };
    type Bokeh = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let parts: Particle[] = [];
    let bokeh: Bokeh[] = [];

    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const init = () => {
      const N = Math.min(110, Math.floor(w * h / 18000));
      parts = Array.from({ length: N }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6, bright: Math.random() < 0.25,
      }));
      const B = Math.floor(Math.min(18, w * h / 90000));
      bokeh = Array.from({ length: B }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05,
        r: Math.random() * 80 + 40, a: Math.random() * 0.05 + 0.025,
      }));
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bokeh) {
        b.x += b.vx; b.y += b.vy;
        if (b.x < -b.r) b.x = w + b.r; else if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r; else if (b.y > h + b.r) b.y = -b.r;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(${AR},${AG},${AB},${b.a})`);
        g.addColorStop(1, `rgba(${AR},${AG},${AB},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }
      const MAX_D2 = 22000;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], c = parts[j];
          const dx = a.x - c.x, dy = a.y - c.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_D2) {
            const t = 1 - d2 / MAX_D2;
            const o = t * 0.32;
            ctx.strokeStyle = `rgba(${AR},${AG},${AB},${o.toFixed(3)})`;
            ctx.lineWidth = 0.8 + t * 0.4;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
          }
        }
      }
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const haloR = p.bright ? 9 : 5;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
        g.addColorStop(0, `rgba(${AR},${AG},${AB},${p.bright ? 0.7 : 0.45})`);
        g.addColorStop(1, `rgba(${AR},${AG},${AB},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.bright ? `rgba(255,255,255,.95)` : `rgba(${AR + 80},${AG + 80},${AB + 80},.85)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize(); init(); tick();
    const ro = new ResizeObserver(() => { resize(); init(); });
    ro.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); obs.disconnect(); };
  }, []);

  return <canvas ref={ref} className="bg-particles" />;
}
