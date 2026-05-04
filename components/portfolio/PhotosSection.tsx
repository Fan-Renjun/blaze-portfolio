"use client";
import { useState } from "react";
import { PHOTOS, type Photo } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { Modal } from "./Modal";

export function PhotosSection() {
  const [showAll, setShowAll] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null);
  const visible = showAll ? PHOTOS : PHOTOS.slice(0, 5);

  return (
    <section className="section" id="photo">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="PHOTOGRAPHY / 摄影"
            title="按下快门那一刻"
            sub="镜头是另一种产品笔记。"
            action={
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起画廊" : "完整画廊"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            }
          />
        </Reveal>
        <Reveal delay={60}>
          <div className="gallery">
            {visible.map((p) => (
              <div key={p.id} className={`photo s-${p.size}`} onClick={() => setOpenPhoto(p)}>
                <span className="photo-tag">{p.tag}</span>
                <div className="photo-meta">
                  <span>{p.title}</span>
                  <span className="loc">{p.loc}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <Modal
        open={!!openPhoto}
        onClose={() => setOpenPhoto(null)}
        eyebrow={openPhoto ? `${openPhoto.tag} · ${openPhoto.time}` : ""}
        title={openPhoto?.title}
      >
        {openPhoto && (
          <div className="photo-modal">
            <div className="img"><div className="ph">[ {openPhoto.ph} ]</div></div>
            <div className="meta">
              <div>
                <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>位置</div>
                <div style={{ fontSize: 16 }}>{openPhoto.loc}</div>
              </div>
              <div>
                <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>时间</div>
                <div style={{ fontSize: 16, fontFamily: "var(--font-mono)" }}>{openPhoto.time}</div>
              </div>
              <div>
                <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>参数</div>
                <div style={{ fontSize: 14, color: "var(--fg-2)" }}>{openPhoto.ph}</div>
              </div>
              <div style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="tag accent">{openPhoto.tag}</span>
                <span className="tag">{openPhoto.time}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
