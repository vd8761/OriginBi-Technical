"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, title, eyebrow, footer, wide = false, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="admin-panel-root admin-modal-overlay"
      style={{ gridTemplateColumns: "1fr", minHeight: "auto" }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`admin-modal${wide ? " admin-modal-wide" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-modal-header">
          <div>
            {eyebrow && <p className="admin-page-eyebrow">{eyebrow}</p>}
            {title && <h3 className="admin-card-title" style={{ fontSize: 17 }}>{title}</h3>}
          </div>
          <button type="button" className="admin-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer && <footer className="admin-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
