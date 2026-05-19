"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, footer, children }: Props) {
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
      className="admin-panel-root admin-drawer-overlay"
      style={{ gridTemplateColumns: "1fr min(480px, 92vw)", minHeight: "auto" }}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="admin-drawer-backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="admin-drawer">
        <header className="admin-drawer-header">
          <div>
            {title && <h3 className="admin-card-title">{title}</h3>}
            {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="admin-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>
        <div className="admin-drawer-body">{children}</div>
        {footer && <footer className="admin-drawer-footer">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
