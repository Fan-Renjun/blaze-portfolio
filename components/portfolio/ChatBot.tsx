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

const LOOK_STATES = [
  { y: 0.00, x: 0.00 },
  { y: 0.00, x: 0.00 },
  { y: 0.00, x: 0.00 },
  { y: 0.45, x: 0.00 },
  { y: -0.45, x: 0.00 },
  { y: 0.00, x: -0.25 },
  { y: 0.00, x: 0.20 },
  { y: 0.30, x: -0.15 },
  { y: -0.30, x: -0.15 },
];

export function ChatBot() {
  const [shown, setShown] = useState(true);
  const splineRef         = useRef<Application | null>(null);

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
    if (spline.getAllObjects().length === 0) return;
    splineRef.current = spline;

    const names = spline.getAllObjects().map(o => o.name);
    console.log("[HIM] objects:", names);
  }, []);

  // ── Random eye animation ──────────────────────────────────
  useEffect(() => {
    let rafId: number;
    let curY = 0, curX = 0, tgtY = 0, tgtX = 0;
    let stateMs = 2000, elapsed = 0;
    let blinkPhase: "idle" | "closing" | "opening" = "idle";
    let blinkCd = 2500 + Math.random() * 3000;
    let blinkSY = 1;
    let lastTs = performance.now();

    const nextLook = () => {
      const s = LOOK_STATES[Math.floor(Math.random() * LOOK_STATES.length)];
      tgtY = s.y; tgtX = s.x;
      stateMs = 1800 + Math.random() * 2800;
      elapsed = 0;
    };
    nextLook();

    // Find a target object via both SPEObject wrapper AND raw Three.js traverse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findEyes = (): any | null => {
      const app = splineRef.current;
      if (!app) return null;

      // Try SPEObject wrapper first
      const spe = app.findObjectByName("eyes") ??
                  app.findObjectByName("眼睛Instance");
      if (spe) return spe;

      // Fallback: traverse raw Three.js scene
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appAny = app as any;
      const scene = appAny._scene ?? appAny.scene ?? appAny._root;
      if (!scene?.traverse) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let found: any = null;
      scene.traverse((obj: any) => {
        if (!found && (obj.name === "eyes" || obj.name === "眼睛Instance")) {
          found = obj;
        }
      });
      return found;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let eyesObj: any = null;

    const tick = (ts: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = ts - lastTs; lastTs = ts;

      // Lazy resolve
      if (!eyesObj) { eyesObj = findEyes(); return; }

      // Look state
      elapsed += dt;
      if (elapsed >= stateMs) nextLook();
      const t = 0.05;
      curY += (tgtY - curY) * t;
      curX += (tgtX - curX) * t;
      eyesObj.rotation.y = curY;
      eyesObj.rotation.x = curX;

      // Blink
      blinkCd -= dt;
      if (blinkCd <= 0 && blinkPhase === "idle") {
        blinkPhase = "closing";
        blinkCd = 3500 + Math.random() * 4000;
      }
      if (blinkPhase === "closing") {
        blinkSY = Math.max(0, blinkSY - dt / 80);
        if (blinkSY <= 0) blinkPhase = "opening";
      } else if (blinkPhase === "opening") {
        blinkSY = Math.min(1, blinkSY + dt / 120);
        if (blinkSY >= 1) { blinkSY = 1; blinkPhase = "idle"; }
      }
      if (eyesObj.scale) eyesObj.scale.y = blinkSY;
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
