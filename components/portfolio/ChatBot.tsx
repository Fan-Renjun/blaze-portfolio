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
  // Spline 只处理 canvas 自身的 mousemove 事件。
  // 做法：监听全局 mousemove，把鼠标在页面上的归一化位置
  // 映射到 canvas 坐标，再派发 synthetic event 给 canvas。
  // X 轴取镜像（1 - nx）修正场景内方向与实际 cursor 相反的问题。
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      // 全局归一化坐标 [0, 1]
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;

      // 映射到 canvas 坐标，X 取镜像修正方向
      const cx = rect.left + (1 - nx) * rect.width;
      const cy = rect.top  +       ny  * rect.height;

      canvas.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX:  cx,
          clientY:  cy,
          bubbles:  true,
          cancelable: true,
        })
      );
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
