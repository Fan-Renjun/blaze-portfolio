"use client";

interface ThemeFabProps {
  theme: string;
  onToggle: () => void;
}

export function ThemeFab({ theme, onToggle }: ThemeFabProps) {
  return (
    <button className="theme-fab" onClick={onToggle} aria-label="切换主题" title="切换深色 / 浅色">
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
      )}
    </button>
  );
}
