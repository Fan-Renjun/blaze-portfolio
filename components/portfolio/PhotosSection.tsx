"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { Modal } from "./Modal";

// 按方向分配尺寸类，保持画廊节奏感
const LANDSCAPE_CYCLE = ["s-2", "s-3", "s-4", "s-7", "s-3", "s-2", "s-4"];
const PORTRAIT_CYCLE  = ["s-v2", "s-v1", "s-v3", "s-v1", "s-v2", "s-v3", "s-v1"];
const DEFAULT_CYCLE   = ["s-1", "s-2", "s-3", "s-4", "s-5", "s-6", "s-7"];

function getSizeClass(orientation: Photo["orientation"], index: number): string {
  if (orientation === "横屏") return LANDSCAPE_CYCLE[index % LANDSCAPE_CYCLE.length];
  if (orientation === "竖屏") return PORTRAIT_CYCLE[index % PORTRAIT_CYCLE.length];
  return DEFAULT_CYCLE[index % DEFAULT_CYCLE.length];
}

export function PhotosSection() {
  const [photos, setPhotos]   = useState<Photo[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPhotos((data as Photo[]) ?? []));
  }, []);

  const visible = showAll ? photos : photos.slice(0, 5);

  return (
    <section className="section" id="photo">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="PHOTOGRAPHY / 摄影"
            title="按下快门那一刻"
            sub="视觉中国签约摄影师 · 镜头是另一种产品笔记——用光影记录城市与自然的边界，在旅途中捕捉那些稍纵即逝的真实瞬间。"
            action={
              photos.length > 5 ? (
                <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                  <span>{showAll ? "收起画廊" : "完整画廊"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                  </svg>
                </button>
              ) : null
            }
          />
        </Reveal>

        <Reveal delay={60}>
          <div className="gallery">
            {visible.map((p, i) => {
              const sizeClass = getSizeClass(p.orientation, i);
              return (
                <div
                  key={p.id}
                  className={`photo ${sizeClass}`}
                  onClick={() => setOpenPhoto(p)}
                  style={p.image_url ? {
                    backgroundImage: `url(${p.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } : undefined}
                >
                  {p.category && <span className="photo-tag">{p.category}</span>}
                  <div className="photo-meta">
                    <span>{p.category ?? ""}</span>
                    {p.location && <span className="loc">{p.location}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>

      <Modal
        open={!!openPhoto}
        onClose={() => setOpenPhoto(null)}
        eyebrow={openPhoto ? `${openPhoto.category ?? "PHOTO"} · ${openPhoto.created_at?.slice(0, 10) ?? ""}` : ""}
        title={openPhoto?.location ?? openPhoto?.category ?? "照片"}
      >
        {openPhoto && (
          <div className="photo-modal">
            <div className="img" style={openPhoto.image_url ? {
              backgroundImage: `url(${openPhoto.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } : undefined}>
              {!openPhoto.image_url && <div className="ph">[ 无图片 ]</div>}
            </div>
            <div className="meta">
              {openPhoto.location && (
                <div>
                  <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>位置</div>
                  <div style={{ fontSize: 16 }}>{openPhoto.location}</div>
                </div>
              )}
              <div>
                <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>拍摄时间</div>
                <div style={{ fontSize: 16, fontFamily: "var(--font-mono)" }}>
                  {openPhoto.created_at?.slice(0, 10) ?? "—"}
                </div>
              </div>
              <div style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {openPhoto.category && <span className="tag accent">{openPhoto.category}</span>}
                {openPhoto.orientation && (
                  <span className="tag">{openPhoto.orientation}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
