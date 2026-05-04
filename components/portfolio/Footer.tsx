import { PROFILE } from "@/lib/portfolio-data";

export function Footer() {
  return (
    <footer className="footer container">
      <div className="l">
        <span className="dot" />
        {PROFILE.status} · 2026
      </div>
      <div className="r">© BLAZE FAN · MADE WITH CARE</div>
    </footer>
  );
}
