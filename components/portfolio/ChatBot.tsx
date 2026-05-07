"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// ── Spline loaded client-side only ────────────────────────────
// ssr:false → canvas 在客户端容器内创建，不产生全页面 canvas
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

const SCENE = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE  = 100; // sphere diameter (px)

export function ChatBot() {
  const [shown, setShown] = useState(true);

  // ── Scroll: 滚动时隐藏，停止 400ms 后重新显示 ──────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setShown(false);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(true), 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <motion.div
      // 淡入淡出 + 轻微位移
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 14 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        translateX: "-50%",
        zIndex: 200,
        width: SIZE,
        height: SIZE,
        // 圆形裁剪，overflow:hidden 限制 Spline canvas 在容器内
        borderRadius: "50%",
        overflow: "hidden",
        // 不加任何 pointer-events 限制，让 Spline runtime
        // 原生收到 mousemove 事件，确保表情追踪 cursor 正常工作
        cursor: "pointer",
      }}
    >
      <Spline scene={SCENE} />
    </motion.div>
  );
}
