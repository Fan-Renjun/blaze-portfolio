"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Application } from "@splinetool/runtime";
import type { SplineProps } from "@splinetool/react-spline";

// 显式传 SplineProps 类型，onLoad 才能正确传递
const Spline = dynamic<SplineProps>(
  () => import("@splinetool/react-spline"),
  { ssr: false, loading: () => null }
);

const SCENE        = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE         = 80;
const TRACK_RADIUS = 150;

export function ChatBot() {
  const [shown, setShown] = useState(true);
  const containerRef      = useRef<HTMLDivElement>(null);
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
    // React StrictMode 会触发两次 onLoad，第二次 objects 为空
    // 只保留第一次有效的 Application 实例
    if (spline.getAllObjects().length === 0) return;
    splineRef.current = spline;
  }, []);

  // ── Cursor tracking via Application API ──────────────────
  // 直接操作 Spline 场景内 eyes 组的旋转，放弃 setVariable 方案
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

      // 归一化偏移 [-1,1]，超出范围归零让眼睛回正
      const nx = dist <= TRACK_RADIUS ? dx / TRACK_RADIUS : 0;
      const ny = dist <= TRACK_RADIUS ? dy / TRACK_RADIUS : 0;

      const eyes = app.findObjectByName("eyes");
      if (eyes) {
        // -nx 修正方向：cursor 左移 → 眼睛左看（旋转为负）
        eyes.rotation.y = -nx * 0.4;
        eyes.rotation.x =  ny * 0.25;
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
      <Spline scene={SCENE} onLoad={handleLoad} />
    </motion.div>
  );
}
