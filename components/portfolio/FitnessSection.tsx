"use client";
import { useMemo, useState } from "react";
import { FITNESS } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { CardStack } from "@/components/ui/card-stack";
import { cn } from "@/lib/utils";

// ── Highlight 工具组件 ────────────────────────────────────────
export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "font-semibold bg-blue-500/10 text-blue-300 px-1 py-0.5 rounded",
      className
    )}
  >
    {children}
  </span>
);

// ── 运动理念卡片数据 ──────────────────────────────────────────
const FIT_CARDS = [
  {
    id: 0,
    name: "关于力量训练",
    designation: "STRENGTH · 4×/WEEK",
    content: (
      <p>
        练力量不只是为了肌肉，更是为了<Highlight>对身体的掌控感</Highlight>。
        每一次卧推的增重，都在训练你相信自己可以突破极限的能力。
      </p>
    ),
  },
  {
    id: 1,
    name: "关于规律与自律",
    designation: "CONSISTENCY · WEEKLY TRACKING",
    content: (
      <p>
        最难的不是第一次去健身房，而是<Highlight>第 200 次</Highlight>。
        不靠情绪驱动，靠系统——把运动做成和刷牙一样自然的事。
      </p>
    ),
  },
  {
    id: 2,
    name: "关于数据与感受",
    designation: "DATA · HEART RATE & BODY FAT",
    content: (
      <p>
        我追踪心率、体脂、PR，但数字是工具，不是目的。
        真正的反馈来自<Highlight>早晨起床时的身体感受</Highlight>——轻盈还是沉重，
        比任何指标都诚实。
      </p>
    ),
  },
  {
    id: 3,
    name: "关于 AI 与健身",
    designation: "AI × FITNESS",
    content: (
      <p>
        AI 产品经理也需要精力管理。
        <Highlight>运动是我的 context window 清空键</Highlight>——
        每次训练后，思维会变得异常清晰，那是深度工作最好的前置条件。
      </p>
    ),
  },
];

// ── 心率折线图 ────────────────────────────────────────────────
function HRSparkline() {
  const pts = useMemo(() => {
    const n = 60;
    const arr: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const base = 0.4 + Math.sin(t * 8.6) * 0.2 + Math.sin(t * 3.1 + 0.5) * 0.15;
      const y = Math.max(0.05, Math.min(0.95, base + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.18 - 0.09));
      arr.push([t * 100, (1 - y) * 100]);
    }
    return arr;
  }, []);
  const d    = "M " + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" L ");
  const fill = `M 0,100 L ${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" L ")} L 100,100 Z`;
  return (
    <svg className="hr-line" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hrg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#hrg)"/>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="0.9"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────
export function FitnessSection() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="section" id="fit">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="FITNESS / 运动"
            title="用身体校准生活"
            sub="体育总局注册健身教练 · 力量训练 4 次/周 · 每周追踪。"
            action={
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起" : "完整数据"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            }
          />
        </Reveal>

        {/* ── 新布局：左 CardStack + 右数据 ── */}
        <Reveal delay={60}>
          <div className="fit-layout">

            {/* 左列：理念卡片堆叠 */}
            <div className="fit-stack-col">
              <p className="fit-stack-label">训练哲学</p>
              <CardStack items={FIT_CARDS} offset={12} scaleFactor={0.05} />
            </div>

            {/* 右列：数据 Grid */}
            <div className="fit-data-col">
              <div className="fit-grid">

                <div className="fit-card fit-c-4">
                  <div className="label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                    本周训练
                  </div>
                  <div className="big">{FITNESS.weekHours}<span className="unit">小时</span></div>
                  <div className="delta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 15l7-7 7 7"/></svg>
                    {FITNESS.weekDelta} vs 上周
                  </div>
                </div>

                <div className="fit-card fit-c-4">
                  <div className="label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
                    今年累计
                  </div>
                  <div className="big">{FITNESS.totalKm}<span className="unit">km</span></div>
                  <div className="delta" style={{ color: "var(--fg-3)" }}>跑步 + 骑行</div>
                </div>

                <div className="fit-card fit-c-4">
                  <div className="label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    当前体脂
                  </div>
                  <div className="big">{FITNESS.bodyFat}<span className="unit">%</span></div>
                  <div className="delta" style={{ color: "var(--fg-3)" }}>体脂率</div>
                </div>

                <div className="fit-card fit-c-6">
                  <div className="label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 12h3l2-7 4 14 2-7h7"/></svg>
                    心率 · 今日训练
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
                    <div>
                      <div className="big" style={{ fontSize: "clamp(28px,3.5vw,40px)" }}>{FITNESS.avgHr}<span className="unit">bpm</span></div>
                      <div className="delta" style={{ color: "var(--fg-3)" }}>平均心率</div>
                    </div>
                    <div>
                      <div className="big" style={{ fontSize: "clamp(28px,3.5vw,40px)" }}>{FITNESS.kcal}<span className="unit">kcal</span></div>
                      <div className="delta" style={{ color: "var(--fg-3)" }}>消耗</div>
                    </div>
                  </div>
                  <HRSparkline />
                </div>

                <div className="fit-card fit-c-6">
                  <div className="label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6v12M18 6v12M3 9v6M21 9v6M9 12h6"/></svg>
                    力量 PR · 1RM
                  </div>
                  {[FITNESS.bench, FITNESS.squat, FITNESS.dead, FITNESS.ohp].map((pr) => (
                    <div className="pr-row" key={pr.name}>
                      <span className="name">{pr.name}</span>
                      <span><span className="val">{pr.val}</span><span className="delta">+{pr.delta}</span></span>
                    </div>
                  ))}
                </div>

                {showAll && (
                  <>
                    <div className="fit-card fit-c-12">
                      <div className="label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                        训练强度 · 近 26 周
                      </div>
                      <div className="heatmap">
                        {FITNESS.heat.map((v, i) => <div key={i} className="cell" data-l={v} />)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                        <span>26 weeks ago</span>
                        <span>本周</span>
                      </div>
                    </div>

                    <div className="fit-card fit-c-12">
                      <div className="label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        本周计划
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginTop: 8 }}>
                        {["一","二","三","四","五","六","日"].map((d, i) => {
                          const k = ["推","休","拉","休","腿","有氧","休"][i];
                          const active = k !== "休";
                          return (
                            <div key={i} style={{
                              padding: "12px 6px", textAlign: "center", borderRadius: 10,
                              border: "1px solid var(--line)",
                              background: active ? "var(--accent-soft)" : "transparent",
                              color: active ? "#9CC8FF" : "var(--fg-3)",
                            }}>
                              <div style={{ fontSize: 11, opacity: .7 }}>{d}</div>
                              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 500 }}>{k}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
