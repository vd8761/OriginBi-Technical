import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean;
  variant?: "default" | "raised";
  children: ReactNode;
}

export function Card({ pad = true, variant = "default", className, children, ...rest }: CardProps) {
  const base = variant === "raised" ? "admin-card-2" : "admin-card";
  return (
    <div className={`${base}${pad ? " admin-card-pad" : ""}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}

export function CardHeader({ eyebrow, title, subtitle, actions, style }: CardHeaderProps) {
  return (
    <div className="admin-control-row" style={{ alignItems: "flex-start", ...style }}>
      <div>
        {eyebrow && <p className="admin-page-eyebrow">{eyebrow}</p>}
        <h3 className="admin-card-title">{title}</h3>
        {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="admin-row">{actions}</div>}
    </div>
  );
}
