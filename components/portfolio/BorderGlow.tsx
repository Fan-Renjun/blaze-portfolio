"use client";
import { useRef, useCallback, useEffect, type ReactNode, type CSSProperties } from "react";

// ── helpers ──────────────────────────────────────────────────
function parseHSL(s: string) {
  const m = s.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : { h: 210, s: 100, l: 60 };
}
function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const ops = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  const vars: Record<string, string> = {};
  ops.forEach((op, i) => {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(op * intensity, 100)}%)`;
  });
  return vars;
}
const POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const GKEYS    = ["--gradient-one","--gradient-two","--gradient-three","--gradient-four","--gradient-five","--gradient-six","--gradient-seven"];
const CMAP     = [0, 1, 2, 0, 1, 2, 1];
function buildGradientVars(colors: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  GKEYS.forEach((k, i) => {
    const c = colors[Math.min(CMAP[i], colors.length - 1)];
    vars[k] = `radial-gradient(at ${POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  });
  vars["--gradient-base"] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}
function easeOut(x: number) { return 1 - Math.pow(1 - x, 3); }
function easeIn(x: number)  { return x * x * x; }
function animate({ start = 0, end = 100, duration = 1000, delay = 0,
  ease = easeOut, onUpdate, onEnd }: {
  start?: number; end?: number; duration?: number; delay?: number;
  ease?: (t: number) => number; onUpdate: (v: number) => void; onEnd?: () => void;
}) {
  const t0 = performance.now() + delay;
  function tick() {
    const t = Math.min((performance.now() - t0) / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else onEnd?.();
  }
  setTimeout(() => requestAnimationFrame(tick), delay);
}

// ── component ─────────────────────────────────────────────────
interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  edgeSensitivity?: number;
  glowColor?: string;           // "H S L"
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
  onClick?: () => void;
}

export function BorderGlow({
  children,
  className = "",
  style,
  edgeSensitivity = 30,
  glowColor = "211 100 65",
  backgroundColor = "#0e0e12",
  borderRadius = 16,
  glowRadius = 38,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ["#007AFF", "#00B4FF", "#4488FF"],
  fillOpacity = 0.4,
  onClick,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const getCenter = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [cx, cy] = getCenter(card);
    const dx = x - cx, dy = y - cy;
    const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    card.style.setProperty("--edge-proximity", (edge * 100).toFixed(3));
    card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
  }, [getCenter]);

  useEffect(() => {
    const card = cardRef.current;
    if (!animated || !card) return;
    card.classList.add("sweep-active");
    card.style.setProperty("--cursor-angle", "110deg");
    animate({ duration: 500, onUpdate: v => card.style.setProperty("--edge-proximity", String(v)) });
    animate({ ease: easeIn,  duration: 1500, end: 50, onUpdate: v =>
      card.style.setProperty("--cursor-angle", `${(465 - 110) * (v / 100) + 110}deg`) });
    animate({ ease: easeOut, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v =>
      card.style.setProperty("--cursor-angle", `${(465 - 110) * (v / 100) + 110}deg`) });
    animate({ ease: easeIn, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => card.style.setProperty("--edge-proximity", String(v)),
      onEnd: () => card.classList.remove("sweep-active"),
    });
  }, [animated]);

  const cssVars = {
    "--card-bg": backgroundColor,
    "--edge-sensitivity": edgeSensitivity,
    "--border-radius": `${borderRadius}px`,
    "--glow-padding": `${glowRadius}px`,
    "--cone-spread": coneSpread,
    "--fill-opacity": fillOpacity,
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
  } as CSSProperties;

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onClick={onClick}
      className={`border-glow-card ${className}`}
      style={{ ...cssVars, ...style }}
    >
      <span className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
