"use client";
import { useMemo, useState } from "react";
import { TRAVEL, type TravelCity } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

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

export function TravelSection() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? TRAVEL.recent : TRAVEL.recent.slice(0, 6);

  return (
    <section className="section" id="travel">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="TRAVEL / 旅行足迹"
            title="去过的地方在心里发光"
            sub="路过的不是城市，是一个又一个的自己。"
            action={
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起" : "全部去过的城市"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            }
          />
        </Reveal>

        <Reveal delay={60}>
          <div className="travel-grid">
            <div className="travel-stats">
              <div className="ts-row">
                <div className="ts-big">{TRAVEL.countries}</div>
                <div className="ts-lbl">国家 / 地区</div>
              </div>
              <div className="ts-row">
                <div className="ts-big">{TRAVEL.cities}</div>
                <div className="ts-lbl">城市</div>
              </div>
              <div className="ts-row">
                <div className="ts-big">{TRAVEL.km.toLocaleString()}<span className="ts-unit">km</span></div>
                <div className="ts-lbl">累计飞行</div>
              </div>
            </div>
            <div className="travel-map-wrap">
              <TravelMiniMap cities={TRAVEL.recent} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="travel-list">
            {visible.map((c) => (
              <div className="travel-card" key={c.id}>
                <div className="tc-meta">
                  <span className="tc-year">{c.year}</span>
                  <span className="tc-coord">
                    {c.lat.toFixed(2)}°{c.lat >= 0 ? "N" : "S"} · {Math.abs(c.lng).toFixed(2)}°{c.lng >= 0 ? "E" : "W"}
                  </span>
                </div>
                <div className="tc-city">{c.city}</div>
                <div className="tc-country">{c.country}</div>
                <div className="tc-notes">{c.notes}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
