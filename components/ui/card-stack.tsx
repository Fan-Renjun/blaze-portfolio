"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CardItem = {
  id: number;
  name: string;
  designation: string;
  content: React.ReactNode;
};

export function CardStack({
  items,
  offset = 10,
  scaleFactor = 0.06,
}: {
  items: CardItem[];
  offset?: number;
  scaleFactor?: number;
}) {
  const [cards, setCards] = useState<CardItem[]>(items);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prev => {
        const newArr = [...prev];
        newArr.unshift(newArr.pop()!);
        return newArr;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-60 w-full" style={{ minWidth: 280 }}>
      <AnimatePresence>
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            className="absolute w-full rounded-2xl p-5 flex flex-col justify-between"
            style={{
              transformOrigin: "top center",
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            animate={{
              top:   i * -offset,
              scale: 1 - i * scaleFactor,
              zIndex: cards.length - i,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-[13.5px] leading-relaxed font-normal text-white/75">
              {card.content}
            </div>
            <div className="mt-4">
              <p className="text-white/90 text-[13px] font-medium">{card.name}</p>
              <p className="text-white/38 text-[11px] font-mono tracking-wide mt-0.5">{card.designation}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
