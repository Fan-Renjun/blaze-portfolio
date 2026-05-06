"use client";
import { useEffect, useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

// Varied size cycles — staggered editorial layout
const L_CYCLE = ["g-xl",  "g-m",  "g-l",  "g-wide", "g-m",  "g-xl",  "g-l" ];
const P_CYCLE = ["g-pt",  "g-pm", "g-pt", "g-pm",   "g-pt", "g-pm",  "g-pt"];
const D_CYCLE = ["g-s",   "g-m",  "g-sq", "g-s",    "g-m",  "g-s",   "g-sq"];

function buildSizeMap(photos: { orientation: Photo["orientation"] }[]): string[] {
  let li = 0, pi = 0, di = 0;
  return photos.map(p => {
    if (p.orientation === "横屏") return L_CYCLE[li++ % L_CYCLE.length];
    if (p.orientation === "竖屏") return P_CYCLE[pi++ % P_CYCLE.length];
    return D_CYCLE[di++ % D_CYCLE.length];
  });
}

function getObjectPosition(orientation: Photo["orientation"]): string {
  return orientation === "竖屏" ? "center top" : "center center";
}

const FILTERS = [
  { label: "全部",     value: null },
  { label: "自然风光", value: "自然风光" },
  { label: "人物纪实", value: "人物纪实" },
  { label: "城市街景", value: "城市街景" },
] as const;

type FilterValue = "自然风光" | "人物纪实" | "城市街景" | null;

// sub text with highlighted credential
const PhotoSub = () => (
  <>
    <span style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: ".04em" }}>
      视觉中国 签约摄影师
    </span>
    {" · 镜头是另一种产品笔记——用光影记录城市与自然的边界，在旅途中捕捉那些稍纵即逝的真实瞬间。"}
  </>
);

export function PhotosSection() {
  const [photos, setPhotos]               = useState<Photo[]>([]);
  const [activeFilter, setActiveFilter]   = useState<FilterValue>(null);
  const [showAll, setShowAll]             = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPhotos((data as Photo[]) ?? []));
  }, []);

  const handleFilter = (v: FilterValue) => {
    setActiveFilter(v);
    setShowAll(false);   // reset expand when switching filter
  };

  const filtered = activeFilter
    ? photos.filter(p => p.category === activeFilter)
    : photos;

  const visible  = showAll ? filtered : filtered.slice(0, 5);
  // Compute size classes once per visible set (resets counters per render)
  const sizeMap  = useMemo(() => buildSizeMap(visible), [visible]);

  // Lightbox slides from filtered set
  const slides = filtered
    .filter(p => !!p.image_url)
    .map(p => ({
      src: p.image_url as string,
      title: p.location ?? undefined,
      description: [p.category, p.orientation].filter(Boolean).join(" · ") || undefined,
    }));

  const toSlideIndex = (visibleIdx: number) => {
    const photo = visible[visibleIdx];
    return slides.findIndex(s => s.src === photo.image_url);
  };

  return (
    <section className="section" id="photo">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="PHOTOGRAPHY / 摄影"
            title="按下快门那一刻"
            sub={<PhotoSub />}
          />
        </Reveal>

        {/* ── 筛选栏（仅 pill） ── */}
        <Reveal delay={30}>
          <div className="photo-filters" style={{ marginBottom: 20 }}>
            {FILTERS.map(f => (
              <button
                key={String(f.value)}
                className={`photo-filter-btn${activeFilter === f.value ? " active" : ""}`}
                onClick={() => handleFilter(f.value as FilterValue)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="gallery">
            {visible.map((p, i) => (
                <div
                  key={p.id}
                  className={`photo ${sizeMap[i] ?? "g-s"}`}
                  onClick={() => setLightboxIndex(toSlideIndex(i))}
                  style={{ cursor: "pointer" }}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.location ?? p.category ?? "photo"}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: getObjectPosition(p.orientation) }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--card)" }} />
                  )}
                  {p.location && <span className="photo-tag">{p.location}</span>}
                  <div className="photo-meta">
                    {p.category && <span>{p.category}</span>}
                    {p.location && <span className="loc">{p.location}</span>}
                  </div>
                </div>
            ))}
            {visible.length === 0 && (
              <p style={{ color: "var(--fg-3)", fontSize: 14, gridColumn: "1/-1", padding: "40px 0" }}>
                该分类暂无照片。
              </p>
            )}
          </div>
        </Reveal>

        {/* ── 完整画廊 button 在画廊下方 ── */}
        {filtered.length > 5 && (
          <Reveal delay={80}>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起画廊" : "完整画廊"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            </div>
          </Reveal>
        )}
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
