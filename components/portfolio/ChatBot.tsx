"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

const SCENE = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE  = 80;

export function ChatBot() {
  const [shown, setShown]   = useState(true);
  const containerRef        = useRef<HTMLDivElement>(null);

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

  // ── Global cursor tracking → Spline canvas ────────────────
  // Spline runtime 监听 canvas 上的 PointerEvent（不是 MouseEvent）。
  // 以画布中心为基准做坐标映射，X 轴取反修正场景内方向问题。
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = rect.left  + rect.width  / 2;  // canvas 中心 X
      const cy = rect.top   + rect.height / 2;  // canvas 中心 Y

      // 光标相对视口中心的归一化偏移 (-1 ~ 1)
      const ndx = (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2);
      const ndy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

      // 映射到 canvas：X 取反修正 Spline 场景的反向追踪
      const targetX = cx + ndx * (rect.width  / 2);
      const targetY = cy + ndy * (rect.height / 2);

      // Spline runtime 监听 pointermove，用 PointerEvent 才能被接收
      canvas.dispatchEvent(new PointerEvent("pointermove", {
        clientX:     targetX,
        clientY:     targetY,
        pointerId:   1,
        pointerType: "mouse",
        isPrimary:   true,
        bubbles:     true,
        cancelable:  true,
      }));
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
