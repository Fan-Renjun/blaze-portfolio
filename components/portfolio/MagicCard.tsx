"use client";
import {
  useRef, useEffect, useCallback, type ReactNode, type RefObject,
} from "react";
import { gsap } from "gsap";

// ─── MagicCard ────────────────────────────────────────────────
interface MagicCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;       // "r, g, b"
  particleCount?: number;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
}

export function MagicCard({
  children,
  className = "",
  style,
  glowColor = "0, 122, 255",
  particleCount = 8,
  enableTilt = true,
  enableMagnetism = true,
  clickEffect = true,
}: MagicCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const parts    = useRef<HTMLElement[]>([]);
  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hovering = useRef(false);

  const clearParticles = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    parts.current.forEach(p =>
      gsap.to(p, { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(1.7)",
        onComplete: () => p.parentNode?.removeChild(p) })
    );
    parts.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    const card = cardRef.current;
    if (!card || !hovering.current) return;
    const { width, height } = card.getBoundingClientRect();

    for (let i = 0; i < particleCount; i++) {
      const tid = setTimeout(() => {
        if (!hovering.current || !cardRef.current) return;
        const p = document.createElement("div");
        p.style.cssText = `
          position:absolute; width:3px; height:3px; border-radius:50%;
          background:rgba(${glowColor},1);
          box-shadow:0 0 5px rgba(${glowColor},0.7);
          pointer-events:none; z-index:10;
          left:${Math.random() * width}px; top:${Math.random() * height}px;
        `;
        cardRef.current!.appendChild(p);
        parts.current.push(p);
        gsap.fromTo(p, { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(p, {
          x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 80,
          rotation: Math.random() * 360, duration: 2 + Math.random() * 2,
          ease: "none", repeat: -1, yoyo: true,
        });
        gsap.to(p, { opacity: 0.25, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
      }, i * 80);
      timers.current.push(tid);
    }
  }, [particleCount, glowColor]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onEnter = () => {
      hovering.current = true;
      spawnParticles();
      if (enableTilt) gsap.to(el, { rotateX: 4, rotateY: 4, duration: 0.3, ease: "power2.out", transformPerspective: 900 });
    };
    const onLeave = () => {
      hovering.current = false;
      clearParticles();
      if (enableTilt) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.35, ease: "power2.out" });
      if (enableMagnetism) gsap.to(el, { x: 0, y: 0, duration: 0.35, ease: "power2.out" });
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const cx = r.width / 2, cy = r.height / 2;
      if (enableTilt)
        gsap.to(el, { rotateX: ((y - cy) / cy) * -7, rotateY: ((x - cx) / cx) * 7,
          duration: 0.12, ease: "power2.out", transformPerspective: 900 });
      if (enableMagnetism)
        gsap.to(el, { x: (x - cx) * 0.035, y: (y - cy) * 0.035, duration: 0.3, ease: "power2.out" });
    };
    const onClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = Math.max(Math.hypot(x, y), Math.hypot(x - r.width, y),
        Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height));
      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position:absolute; width:${d * 2}px; height:${d * 2}px; border-radius:50%;
        background:radial-gradient(circle,rgba(${glowColor},0.35) 0%,rgba(${glowColor},0.15) 35%,transparent 70%);
        left:${x - d}px; top:${y - d}px; pointer-events:none; z-index:100;
      `;
      el.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 1 },
        { scale: 1, opacity: 0, duration: 0.7, ease: "power2.out",
          onComplete: () => ripple.remove() });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("click", onClick);
      clearParticles();
    };
  }, [spawnParticles, clearParticles, enableTilt, enableMagnetism, clickEffect]);

  return (
    <div
      ref={cardRef}
      className={`magic-card ${className}`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
}

// ─── BentoSpotlight ───────────────────────────────────────────
// Attaches a global spotlight that follows the cursor near cards.
// Requires cards to have class "magic-glow-card" for border-glow CSS vars.

interface BentoSpotlightProps {
  containerRef: RefObject<HTMLElement | null>;
  cardSelector?: string;
  spotlightRadius?: number;
  glowColor?: string;
}

export function BentoSpotlight({
  containerRef,
  cardSelector = ".magic-glow-card",
  spotlightRadius = 280,
  glowColor = "0, 122, 255",
}: BentoSpotlightProps) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Append spotlight div to body
    const spot = document.createElement("div");
    spot.style.cssText = `
      position:fixed; width:600px; height:600px; border-radius:50%;
      pointer-events:none;
      background:radial-gradient(circle,
        rgba(${glowColor},0.12) 0%,
        rgba(${glowColor},0.06) 20%,
        rgba(${glowColor},0.03) 40%,
        rgba(${glowColor},0.01) 60%,
        transparent 70%
      );
      z-index:9; opacity:0; transform:translate(-50%,-50%);
      mix-blend-mode:screen; transition:opacity 0.3s;
    `;
    document.body.appendChild(spot);

    const proximity   = spotlightRadius * 0.5;
    const fadeDist    = spotlightRadius * 0.8;

    const onMove = (e: MouseEvent) => {
      const section = container.closest(".section") ?? container;
      const sr = section.getBoundingClientRect();
      const inside = e.clientX >= sr.left && e.clientX <= sr.right
                  && e.clientY >= sr.top  && e.clientY <= sr.bottom;

      const cards = container.querySelectorAll<HTMLElement>(cardSelector);

      if (!inside) {
        spot.style.opacity = "0";
        cards.forEach(c => {
          c.style.setProperty("--glow-intensity", "0");
        });
        return;
      }

      gsap.to(spot, { left: e.clientX, top: e.clientY, duration: 0.1, ease: "power2.out" });

      let minDist = Infinity;
      cards.forEach(card => {
        const cr = card.getBoundingClientRect();
        const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
        const dist = Math.max(0,
          Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2
        );
        minDist = Math.min(minDist, dist);

        const intensity = dist <= proximity ? 1
          : dist <= fadeDist ? (fadeDist - dist) / (fadeDist - proximity) : 0;

        const rx = ((e.clientX - cr.left) / cr.width) * 100;
        const ry = ((e.clientY - cr.top)  / cr.height) * 100;
        card.style.setProperty("--glow-x", `${rx}%`);
        card.style.setProperty("--glow-y", `${ry}%`);
        card.style.setProperty("--glow-intensity", intensity.toString());
        card.style.setProperty("--glow-radius", `${spotlightRadius}px`);
      });

      const targetOpacity = minDist <= proximity ? 0.9
        : minDist <= fadeDist ? ((fadeDist - minDist) / (fadeDist - proximity)) * 0.9 : 0;
      spot.style.opacity = targetOpacity.toString();
    };

    const onLeave = () => {
      spot.style.opacity = "0";
      container.querySelectorAll<HTMLElement>(cardSelector)
        .forEach(c => c.style.setProperty("--glow-intensity", "0"));
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      spot.parentNode?.removeChild(spot);
    };
  }, [containerRef, cardSelector, spotlightRadius, glowColor]);

  return null;
}
