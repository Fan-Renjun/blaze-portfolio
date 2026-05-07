"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Application } from "@splinetool/runtime";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

const SCENE        = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE         = 80;
const TRACK_RADIUS = 150;

export function ChatBot() {
  const [shown, setShown]     = useState(true);
  const containerRef          = useRef<HTMLDivElement>(null);
  const splineRef             = useRef<Application | null>(null);

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

  // ── Spline onLoad: store Application instance + log objects ──
  const handleLoad = useCallback((spline: Application) => {
    splineRef.current = spline;
    const names = spline.getAllObjects().map(o => o.name);
    console.log("[HIM] scene objects:", names);
  }, []);

  // ── Cursor tracking via Spline Application API ────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      const app       = splineRef.current;
      if (!container || !app) return;

      const rect = container.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 归一化偏移 [-1, 1]，超出范围则归零（回正）
      const nx = dist <= TRACK_RADIUS ? dx / TRACK_RADIUS : 0;
      const ny = dist <= TRACK_RADIUS ? dy / TRACK_RADIUS : 0;

      // 方案 A：尝试设置 scene 变量（如果场景暴露了变量）
      try { app.setVariable("mouseX", nx); } catch { /* no-op */ }
      try { app.setVariable("mouseY", ny); } catch { /* no-op */ }
      try { app.setVariable("CursorX", nx); } catch { /* no-op */ }
      try { app.setVariable("CursorY", ny); } catch { /* no-op */ }

      // 方案 B：直接旋转对象（兜底）
      // 尝试常见命名；找到就旋转
      const obj =
        app.findObjectByName("Sphere")      ??
        app.findObjectByName("Ball")        ??
        app.findObjectByName("HIM")         ??
        app.findObjectByName("Character")   ??
        app.findObjectByName("Body")        ??
        app.getAllObjects().find(o => o.name !== "Camera" && o.name !== "Light" && o.name !== "Directional Light");

      if (obj) {
        obj.rotation.y = nx * 0.5;   // 左右
        obj.rotation.x = -ny * 0.3;  // 上下（取反更自然）
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 14 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        position: "fixed",
        bottom: "max(28px, calc(env(safe-area-inset-bottom) + 12px))",
        left: "50%",
        translateX: "-50%",
        zIndex: 200,
        width: SIZE,
        height: SIZE,
        borderRadius: "50%",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <Spline
        scene={SCENE}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onLoad={handleLoad as any}
      />
    </motion.div>
  );
}
