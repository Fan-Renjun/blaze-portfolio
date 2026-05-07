"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Application } from "@splinetool/runtime";
import type { SplineProps } from "@splinetool/react-spline";

const Spline = dynamic<SplineProps>(
  () => import("@splinetool/react-spline"),
  { ssr: false, loading: () => null }
);

const SCENE = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE  = 80;

// ── Look states: rotation targets (radians) ────────────────
// forward 出现 4 次权重，让眼睛大部分时间看正前方
const LOOK_STATES = [
  { y:  0.00, x:  0.00 },  // forward ×4
  { y:  0.00, x:  0.00 },
  { y:  0.00, x:  0.00 },
  { y:  0.00, x:  0.00 },
  { y:  0.40, x:  0.00 },  // left
  { y: -0.40, x:  0.00 },  // right
  { y:  0.00, x: -0.22 },  // up
  { y:  0.00, x:  0.18 },  // down
  { y:  0.28, x: -0.14 },  // upper-left
  { y: -0.28, x: -0.14 },  // upper-right
];

export function ChatBot() {
  const [shown, setShown] = useState(true);
  const splineRef         = useRef<Application | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eyesRef           = useRef<any>(null);

  // ── Scroll visibility ─────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setShown(false);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(true), 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(timer); };
  }, []);

  // ── Spline onLoad ─────────────────────────────────────────
  const handleLoad = useCallback((spline: Application) => {
    if (spline.getAllObjects().length === 0) return; // StrictMode 空场景
    splineRef.current = spline;
    eyesRef.current   = spline.findObjectByName("eyes") ?? null;
  }, []);

  // ── Random eye animation loop ─────────────────────────────
  useEffect(() => {
    let rafId: number;

    // Current & target rotation
    let curY = 0, curX = 0;
    let tgtY = 0, tgtX = 0;

    // State timer
    let stateRemaining = 2000;

    // Blink state
    type BlinkPhase = "idle" | "closing" | "opening";
    let blinkPhase: BlinkPhase = "idle";
    let blinkCountdown = 2500 + Math.random() * 3000;
    let blinkScaleY    = 1;

    const nextLook = () => {
      const s = LOOK_STATES[Math.floor(Math.random() * LOOK_STATES.length)];
      tgtY = s.y;
      tgtX = s.x;
      stateRemaining = 1800 + Math.random() * 2800;
    };
    nextLook();

    let lastTs = performance.now();

    const tick = (ts: number) => {
      rafId  = requestAnimationFrame(tick);
      const dt = ts - lastTs;
      lastTs   = ts;

      // Resolve eyes ref lazily (in case onLoad fires after first tick)
      if (!eyesRef.current && splineRef.current) {
        eyesRef.current = splineRef.current.findObjectByName("eyes") ?? null;
      }
      const eyes = eyesRef.current;
      if (!eyes) return;

      // ── Look state machine ──────────────────────────────
      stateRemaining -= dt;
      if (stateRemaining <= 0) nextLook();

      // Smooth lerp toward target (eyes glide naturally)
      const t = 0.05;
      curY += (tgtY - curY) * t;
      curX += (tgtX - curX) * t;
      eyes.rotation.y = curY;
      eyes.rotation.x = curX;

      // ── Blink state machine ─────────────────────────────
      blinkCountdown -= dt;
      if (blinkCountdown <= 0 && blinkPhase === "idle") {
        blinkPhase     = "closing";
        blinkCountdown = 3500 + Math.random() * 4000; // next blink interval
      }
      if (blinkPhase === "closing") {
        blinkScaleY = Math.max(0, blinkScaleY - dt / 80);  // close in ~80ms
        if (blinkScaleY <= 0) blinkPhase = "opening";
      } else if (blinkPhase === "opening") {
        blinkScaleY = Math.min(1, blinkScaleY + dt / 120); // open in ~120ms
        if (blinkScaleY >= 1) { blinkScaleY = 1; blinkPhase = "idle"; }
      }
      if (eyes.scale) eyes.scale.y = blinkScaleY;
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <motion.div
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 14 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        position:     "fixed",
        bottom:       "max(28px, calc(env(safe-area-inset-bottom) + 12px))",
        left:         "50%",
        translateX:   "-50%",
        zIndex:       200,
        width:        SIZE,
        height:       SIZE,
        borderRadius: "50%",
        overflow:     "hidden",
        cursor:       "pointer",
      }}
    >
      <Spline scene={SCENE} onLoad={handleLoad} />
    </motion.div>
  );
}
