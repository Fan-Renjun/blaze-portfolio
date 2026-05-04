"use client";
import { PROFILE, SOCIAL } from "@/lib/portfolio-data";
import { Globe } from "./Globe";

export function HeroSection() {
  return (
    <section className="section hero" id="home">
      <div className="container hero-split">
        <div>
          <div className="hero-text-left">
            <span className="eyebrow">
              <span className="pulse" />
              AI Product Manager · 2026
            </span>
            <h1 className="hero-title-left">
              <span className="line-greet">你好，我是</span>
              <span className="line-zh">{PROFILE.nameZh}</span>
              <span className="line-en">
                <span className="muted">Blaze</span>{" "}
                <span className="solid">Fan<span className="dot-end">.</span></span>
              </span>
            </h1>
            <p className="slogan">{PROFILE.slogan}。{PROFILE.bio}</p>

            <div className="meta">
              {PROFILE.edu.map((e, i) => (
                <span key={i} className={i === 0 ? "tag accent" : "tag"}>
                  {e.school} · {e.degree}
                </span>
              ))}
            </div>

            <div className="social">
              {SOCIAL.map((s) => {
                const Ico = s.icon;
                return (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                    <Ico />
                    <span>{s.name}</span>
                    <span style={{ color: "var(--fg-4)", fontSize: 12, marginLeft: 4 }}>{s.handle}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hero-globe-right" aria-hidden="true">
          <Globe size={760} />
          <div className="globe-meta hero-meta-pill">
            <span className="dot-live" />
            <span>BLAZE FAN · 32.0584° N, 118.7965° E</span>
          </div>
        </div>
      </div>
    </section>
  );
}
