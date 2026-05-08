"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { TRAVEL, type TravelCity } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { MagicCard, BentoSpotlight } from "./MagicCard";
import { createClient } from "@/lib/supabase/client";
import type { TravelCityRow } from "@/lib/types";

function TravelMiniMap({ cities }: { cities: TravelCity[] }) {
  const W = 640, H = 320;
  const project = (lat: number, lng: number): [number, number] => [
    ((lng + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ];

  const dots = useMemo(() => {
    const out: [number, number][] = [];
    for (let lat = -55; lat <= 75; lat += 4) {
      for (let lng = -175; lng <= 175; lng += 4) {
        out.push([lat, lng]);
      }
    }
    return out;
  }, []);

  return (
    <svg className="travel-map" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {dots.map(([la, ln], i) => {
        const [x, y] = project(la, ln);
        return <circle key={i} cx={x} cy={y} r="1.1" fill="var(--fg)" opacity="0.18" />;
      })}
      {cities.map((c) => {
        const [x, y] = project(c.lat, c.lng);
        const animBegin = `${(c.id.charCodeAt(c.id.length - 1) % 7) * 0.3}s`;
        return (
          <g key={c.id}>
            <circle cx={x} cy={y} r="9"   fill="var(--accent)" opacity="0.18" />
            <circle cx={x} cy={y} r="4"   fill="var(--accent)" opacity="0.45">
              <animate attributeName="r"       values="3;7;3"   dur="2.4s" repeatCount="indefinite" begin={animBegin} />
              <animate attributeName="opacity" values=".45;0;.45" dur="2.4s" repeatCount="indefinite" begin={animBegin} />
            </circle>
            <circle cx={x} cy={y} r="2.4" fill="var(--accent)" />
          </g>
        );
      })}
    </svg>
  );
}

// 把 TravelCityRow 转成组件内部用的 TravelCity 格式
function rowToCity(r: TravelCityRow): TravelCity {
  return { id: r.id, city: r.city, country: r.country, lat: r.lat, lng: r.lng, year: r.year, notes: r.notes ?? "" };
}

export function TravelSection() {
  const [showAll, setShowAll] = useState(false);
  const [cities, setCities]   = useState<TravelCity[]>(TRAVEL.recent); // 默认用静态数据
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient()
      .from("travel_cities")
      .select("*")
      .order("year", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setCities((data as TravelCityRow[]).map(rowToCity));
      });
  }, []);

  const visible = showAll ? cities : cities.slice(0, 6);

  return (
    <section className="section" id="travel">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="TRAVEL / 旅行足迹"
            title="去过的地方在心里发光"
            sub="路过的不是城市，是一个又一个的自己。"
          />
        </Reveal>

        <Reveal delay={60}>
          <div className="travel-grid">
            <div className="travel-stats">
              <div className="ts-row">
                <div className="ts-big">{new Set(cities.map(c => c.country)).size}</div>
                <div className="ts-lbl">国家 / 地区</div>
              </div>
              <div className="ts-row">
                <div className="ts-big">{cities.length}</div>
                <div className="ts-lbl">城市</div>
              </div>
              <div className="ts-row">
                <div className="ts-big">{TRAVEL.km.toLocaleString()}<span className="ts-unit">km</span></div>
                <div className="ts-lbl">累计飞行</div>
              </div>
            </div>
            <div className="travel-map-wrap">
              <TravelMiniMap cities={cities} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="travel-list" ref={listRef}>
            <BentoSpotlight
              containerRef={listRef}
              cardSelector=".magic-glow-card"
              spotlightRadius={280}
              glowColor="0, 122, 255"
            />
            {visible.map((c) => (
              <MagicCard
                key={c.id}
                className="travel-card magic-glow-card"
                glowColor="0, 122, 255"
                particleCount={6}
                enableTilt={true}
                enableMagnetism={true}
                clickEffect={true}
              >
                <div className="tc-meta">
                  <span className="tc-year">{c.year}</span>
                  <span className="tc-coord">
                    {c.lat.toFixed(2)}°{c.lat >= 0 ? "N" : "S"} · {Math.abs(c.lng).toFixed(2)}°{c.lng >= 0 ? "E" : "W"}
                  </span>
                </div>
                <div className="tc-city">{c.city}</div>
                <div className="tc-country">{c.country}</div>
                <div className="tc-notes">{c.notes}</div>
              </MagicCard>
            ))}
          </div>

          {/* 展开按钮放在列表下方 */}
          {cities.length > 6 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起" : `全部去过的城市 (${cities.length})`}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
