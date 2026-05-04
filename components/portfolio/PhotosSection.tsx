"use client";
import { useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

// ── orientation → grid size cycle ─────────────────────────────
const LANDSCAPE_CYCLE = ["s-2", "s-3", "s-4", "s-7", "s-3", "s-2", "s-4"];
const PORTRAIT_CYCLE  = ["s-v2", "s-v1", "s-v3", "s-v1", "s-v2", "s-v3", "s-v1"];
const DEFAULT_CYCLE   = ["s-1", "s-2", "s-3", "s-4", "s-5", "s-6", "s-7"];

function getSizeClass(orientation: Photo["orientation"], index: number): string {
  if (orientation === "横屏") return LANDSCAPE_CYCLE[index % LANDSCAPE_CYCLE.length];
  if (orientation === "竖屏") return PORTRAIT_CYCLE[index % PORTRAIT_CYCLE.length];
  return DEFAULT_CYCLE[index % DEFAULT_CYCLE.length];
}

export function PhotosSection() {
  const [photos, setPhotos]         = useState<Photo[]>([]);
  const [showAll, setShowAll]       = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPhotos((data as Photo[]) ?? []));
  }, []);

  const visible = showAll ? photos : photos.slice(0, 5);

  // Lightbox slides — only photos with image_url
  const slides = photos
    .filter((p) => !!p.image_url)
    .map((p) => ({
      src: p.image_url as string,
      title: p.location ?? undefined,
      description: [p.category, p.orientation].filter(Boolean).join(" · ") || undefined,
    }));

  // Map visible photo index → slide index (skip photos without image_url)
  const toSlideIndex = (visibleIdx: number): number => {
    const photo = visible[visibleIdx];
    return slides.findIndex((s) => s.src === photo.image_url);
  };

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
                  onClick={() => setLightboxIndex(toSlideIndex(i))}
                  style={{ cursor: "pointer" }}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.location ?? p.category ?? "photo"}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--card)" }} />
                  )}
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

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        plugins={[Captions, Zoom]}
        captions={{ showToggle: true, descriptionTextAlign: "center" }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        styles={{
          container: { backgroundColor: "rgba(0,0,0,0.92)" },
          captionsTitle: { fontSize: 15, fontWeight: 500 },
          captionsDescription: { fontSize: 13, opacity: 0.6 },
        }}
      />
    </section>
  );
}
