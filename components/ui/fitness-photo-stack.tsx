"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FitnessPhoto } from "@/lib/types";

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center:               { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

export function FitnessPhotoStack({ photos }: { photos: FitnessPhoto[] }) {
  const [index, setIndex]     = useState(0);
  const [direction, setDir]   = useState(1);

  const go = useCallback((delta: number) => {
    setDir(delta);
    setIndex(i => (i + delta + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => go(1), 3800);
    return () => clearInterval(t);
  }, [go, photos.length]);

  if (photos.length === 0) return null;

  const photo = photos[index];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 260 }}>
      {/* 图片轮播 */}
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={index}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.photo_url}
            alt={photo.caption ?? "fitness"}
            className="w-full h-full object-cover"
          />
          {/* 底部渐变 + 文字 */}
          {(photo.caption || photo.taken_at) && (
            <div className="absolute bottom-0 inset-x-0 px-4 py-3"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent)" }}>
              {photo.caption && <p className="text-white/90 text-[13px] font-light">{photo.caption}</p>}
              {photo.taken_at && <p className="text-white/45 text-[11px] font-mono mt-0.5">{photo.taken_at}</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 左右箭头 */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full
              flex items-center justify-center transition-opacity"
            style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)" }}
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 3L5 8l5 5"/>
            </svg>
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full
              flex items-center justify-center transition-opacity"
            style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)" }}
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 3l5 5-5 5"/>
            </svg>
          </button>
        </>
      )}

      {/* 进度点 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
        {photos.slice(0, Math.min(photos.length, 10)).map((_, i) => (
          <button
            key={i}
            onClick={() => { setDir(i > index ? 1 : -1); setIndex(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width:   i === index ? 16 : 5,
              height:  5,
              background: i === index ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
