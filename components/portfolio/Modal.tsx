"use client";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title?: string;
  children?: ReactNode;
}

export function Modal({ open, onClose, eyebrow, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-bd" onClick={onClose}>
      <div className="modal-pn" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            {eyebrow ? <div className="ey">{eyebrow}</div> : null}
            <div className="ttl">{title}</div>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <div className="modal-bd-inner">{children}</div>
      </div>
    </div>
  );
}
