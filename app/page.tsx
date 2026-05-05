"use client";
import { useEffect, useState } from "react";
import { Navbar, ThemeFab, CursorFab, TechCursor, ParticleField, HeroSection, WorkSection, ProjectsSection, ArticlesSection, PhotosSection, FitnessSection, TravelSection, Footer } from "@/components/portfolio";
import { SplashCursor } from "@/components/portfolio/SplashCursor";

export default function Home() {
  const [theme, setTheme]       = useState("dark");
  const [cursorFx, setCursorFx] = useState(true);   // fluid cursor on by default

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div className="portfolio">
      {cursorFx && <SplashCursor />}
      <TechCursor />
      {/* background layers (bottom → top): canvas → grid → particles */}
      <div className="bg-canvas" style={{ zIndex: -1 }} />
      <div className="bg-grid" />
      <ParticleField />

      <Navbar />
      <ThemeFab theme={theme} onToggle={toggleTheme} />
      <CursorFab active={cursorFx} onToggle={() => setCursorFx(v => !v)} />

      <main className="shell">
        <HeroSection />
        <WorkSection />
        <ProjectsSection />
        <ArticlesSection />
        <PhotosSection />
        <TravelSection />
        <FitnessSection />
        <Footer />
      </main>
    </div>
  );
}
