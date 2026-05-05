"use client";
import { useEffect } from "react";

// Mechanical arm cursor — double-stroke (black outline + white fill)
// so it stays visible on both dark and light backgrounds.
const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 22 28">
  <path d="M3 2L3 21L7.5 16.5L10.5 23L13 22L10 15.5L16 15.5Z"
    fill="none" stroke="black" stroke-width="3"
    stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M3 2L3 21L7.5 16.5L10.5 23L13 22L10 15.5L16 15.5Z"
    fill="rgba(0,0,0,0.55)" stroke="white" stroke-width="1.3"
    stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="3" y1="8"  x2="5.8" y2="8"  stroke="black" stroke-width="1.5"/>
  <line x1="3" y1="8"  x2="5.8" y2="8"  stroke="white" stroke-width="0.8" opacity="0.7"/>
  <line x1="3" y1="13" x2="5.8" y2="13" stroke="black" stroke-width="1.5"/>
  <line x1="3" y1="13" x2="5.8" y2="13" stroke="white" stroke-width="0.8" opacity="0.7"/>
  <circle cx="3" cy="2" r="1.6" fill="black" opacity="0.8"/>
  <circle cx="3" cy="2" r="1.1" fill="white"/>
</svg>`;

export function TechCursor() {
  useEffect(() => {
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    // CSS custom cursor is rendered by the OS — zero input lag, same speed as system cursor.
    // Using encodeURIComponent so the SVG is correctly encoded for the data URI.
    const url = `url("data:image/svg+xml,${encodeURIComponent(CURSOR_SVG)}") 3 2`;

    const style = document.createElement("style");
    style.id = "portfolio-cursor";
    // Apply to all elements with !important to override UA cursor:pointer/text/etc.
    style.textContent = `@media (hover:hover) and (pointer:fine) { html, html * { cursor: ${url}, none !important } }`;
    document.head.appendChild(style);

    return () => document.getElementById("portfolio-cursor")?.remove();
  }, []);

  return null; // no DOM element — cursor is pure CSS
}
