"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FitnessPhoto } from "@/lib/types";

export function FitnessPhotoStack({ photos }: { photos: FitnessPhoto[] }) {
  const [index, setIndex] = useState(0);

  // 每 3.5 秒自动切换
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIndex(i => (i + 1) % photos.length), 3500);
    return () => clearInterval(t);
  }, [photos.length]);

  if (photos.length === 0) return null;

  // 显示当前 + 前后各 2 张，营造堆叠感
  const visible = [-2, -1, 0, 1, 2].map(offset => {
    const i = ((index + offset) % photos.length + photos.length) % photos.length;
    return { photo: photos[i], offset };
  });

  const rotations = [-8, -4, 0, 4, 8];
  const scales    = [0.82, 0.91, 1, 0.91, 0.82];
  const translateX = [-120, -60, 0, 60, 120];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: 280, overflow: "visible" }}
      onClick={() => setIndex(i => (i + 1) % photos.length)}
    >
      {visible.map(({ photo, offset }, i) => (
        <motion.div
          key={photo.id + offset}
          className="absolute rounded-2xl overflow-hidden cursor-pointer"
          style={{ width: 200, height: 250, transformOrigin: "bottom center" }}
          animate={{
            rotate:     rotations[i],
            scale:      scales[i],
            x:          translateX[i],
            zIndex:     5 - Math.abs(offset),
            opacity:    Math.abs(offset) > 1 ? 0.55 : 1,
          }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          onClick={e => { e.stopPropagation(); setIndex(((index + offset) % photos.length + photos.length) % photos.length); }}
          whileHover={offset === 0 ? { scale: 1.04 } : {}}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.photo_url}
            alt={photo.caption ?? "fitness"}
            className="w-full h-full object-cover"
          />
          {/* caption overlay on active card */}
          {offset === 0 && photo.caption && (
            <AnimatePresence>
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-0 inset-x-0 px-3 py-2.5"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}
              >
                <p className="text-white/90 text-[12px] font-light truncate">{photo.caption}</p>
                {photo.taken_at && (
                  <p className="text-white/45 text-[10px] font-mono mt-0.5">{photo.taken_at}</p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      ))}

      {/* 点击提示 */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 10 }}>
        {photos.slice(0, Math.min(photos.length, 8)).map((_, i) => (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); setIndex(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width:   i === index % Math.min(photos.length, 8) ? 16 : 5,
              height:  5,
              background: i === index % Math.min(photos.length, 8) ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
