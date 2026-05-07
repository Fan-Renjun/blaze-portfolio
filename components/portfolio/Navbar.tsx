"use client";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "home",     label: "Home" },
  { href: "work",     label: "履历" },
  { href: "projects", label: "项目" },
  { href: "articles", label: "文章" },
  { href: "photo",    label: "摄影" },
  { href: "travel",   label: "旅行" },
  { href: "fit",      label: "运动" },
];

export function Navbar() {
  const [active, setActive] = useState("home");

  useEffect(() => {
    const els = LINKS.map(l => document.getElementById(l.href)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      entries => {
        // Pick the entry with the largest intersection ratio that is actually intersecting
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) setActive(visible[0].target.id);
      },
      { threshold: [0.2, 0.5] }
    );

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="nav" aria-label="主导航">
      <div className="nav-brand">
        <span className="nav-logo" aria-hidden="true">
          <span className="nav-logo-inner" />
        </span>
      </div>
      <div className="nav-divider" aria-hidden="true" />
      <div className="nav-links">
        {LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={`#${href}`}
            className={`nav-link${active === href ? " is-active" : ""}`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
