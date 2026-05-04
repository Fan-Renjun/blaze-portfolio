"use client";
import { useEffect, useState } from "react";
import { Navbar, ThemeFab, TechCursor, ParticleField, HeroSection, WorkSection, ProjectsSection, ArticlesSection, PhotosSection, FitnessSection, TravelSection, Footer } from "@/components/portfolio";

export default function Home() {
  const [theme, setTheme] = useState("dark");
  const [bgVariant] = useState<"grid" | "particles">("grid");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div className="portfolio">
      <TechCursor />
      {bgVariant === "particles" ? <ParticleField /> : <div className="bg-grid" />}
      <div className="bg-canvas" style={{ zIndex: -1 }} />

      <Navbar />
      <ThemeFab theme={theme} onToggle={toggleTheme} />

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
