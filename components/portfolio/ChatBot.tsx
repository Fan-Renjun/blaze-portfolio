"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

const SCENE        = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE         = 80;
const TRACK_RADIUS = 150; // px — 以球心为圆心的追踪范围

export function ChatBot() {
  const [shown, setShown] = useState(true);
  const containerRef      = useRef<HTMLDivElement>(null);

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

  // ── Cursor tracking (150px radius around sphere center) ───
  useEffect(() => {
    const send = (canvas: Element, clientX: number, clientY: number) => {
      canvas.dispatchEvent(new PointerEvent("pointermove", {
        clientX,
        clientY,
        pointerId:   1,
        pointerType: "mouse",
        isPrimary:   true,
        bubbles:     false,  // 不冒泡，避免干扰 Globe OrbitControls
        cancelable:  false,
      }));
    };

    const onMouseMove = (e: MouseEvent) => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;

      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= TRACK_RADIUS) {
        // 范围内：把偏移归一化到 [-1,1]，映射到 canvas 半宽/高
        const nx = dx / TRACK_RADIUS;
        const ny = dy / TRACK_RADIUS;
        send(canvas, cx + nx * (rect.width / 2), cy + ny * (rect.height / 2));
      } else {
        // 超出范围：发送 canvas 中心，表情回正
        send(canvas, cx, cy);
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
      <Spline scene={SCENE} />
    </motion.div>
  );
}
