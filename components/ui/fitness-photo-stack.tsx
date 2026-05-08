"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FitnessPhoto } from "@/lib/types";

export function FitnessPhotoStack({ photos }: { photos: FitnessPhoto[] }) {
  const [cards, setCards] = useState<FitnessPhoto[]>([]);

  useEffect(() => { setCards(photos); }, [photos]);

  useEffect(() => {
    if (cards.length < 2) return;
    const t = setInterval(() => {
      setCards(prev => {
        const next = [...prev];
        next.unshift(next.pop()!);
        return next;
      });
    }, 3800);
    return () => clearInterval(t);
  }, [cards.length]);

  if (cards.length === 0) return null;

  const offset      = 12;
  const scaleFactor = 0.05;

  return (
    <div className="relative w-full" style={{ height: 260 }}>
      <AnimatePresence>
        {cards.map((photo, i) => (
          <motion.div
            key={photo.id}
            className="absolute w-full rounded-2xl overflow-hidden cursor-pointer"
            style={{ height: 240, transformOrigin: "top center" }}
            animate={{
              top:   i * -offset,
              scale: 1 - i * scaleFactor,
              zIndex: cards.length - i,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() =>
              setCards(prev => {
                const next = [...prev];
                next.unshift(next.pop()!);
                return next;
              })
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photo_url}
              alt={photo.caption ?? "fitness"}
              className="w-full h-full object-cover"
            />
            {/* caption on top card */}
            {i === 0 && (photo.caption || photo.taken_at) && (
              <AnimatePresence>
                <motion.div
                  key={photo.id + "-cap"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 inset-x-0 px-4 py-3"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent)" }}
                >
                  {photo.caption  && <p className="text-white/90 text-[13px] font-light">{photo.caption}</p>}
                  {photo.taken_at && <p className="text-white/45 text-[11px] font-mono mt-0.5">{photo.taken_at}</p>}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
