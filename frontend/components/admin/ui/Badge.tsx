import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue" | "purple" | "pink";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

const toneClass: Record<BadgeTone, string> = {
  neutral: "",
  green: "admin-badge-green",
  amber: "admin-badge-amber",
  red: "admin-badge-red",
  blue: "admin-badge-blue",
  purple: "admin-badge-purple",
  pink: "admin-badge-pink",
};

export function Badge({ tone = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
  const cls = `admin-badge ${toneClass[tone]}${className ? ` ${className}` : ""}`.trim();
  return (
    <span className={cls} {...rest}>
      {dot && <span className="admin-dot" />}
      {children}
    </span>
  );
}

interface DotProps {
  tone?: "green" | "amber" | "red" | "blue" | "grey";
  pulse?: boolean;
}

export function StatusDot({ tone = "grey", pulse = false }: DotProps) {
  const cls = `admin-dot admin-dot-${tone}${pulse ? " admin-dot-pulse" : ""}`;
  return <span className={cls} />;
}
