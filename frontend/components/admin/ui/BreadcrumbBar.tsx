import Link from "next/link";
import { ArrowRightWithoutLineIcon } from "@/components/icons";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  segments: BreadcrumbSegment[];
  className?: string;
}

export function BreadcrumbBar({ segments, className }: Props) {
  if (segments.length === 0) return null;
  return (
    <nav className={`admin-breadcrumb${className ? ` ${className}` : ""}`} aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const node = seg.onClick ? (
          <button
            type="button"
            onClick={seg.onClick}
            className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer bg-transparent border-0 p-0 text-left"
            style={{ color: "inherit", font: "inherit" }}
          >
            {seg.label}
          </button>
        ) : seg.href && !isLast ? (
          <Link href={seg.href}>{seg.label}</Link>
        ) : (
          <span>{seg.label}</span>
        );
        return (
          <span key={`${seg.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {node}
            {!isLast && (
              <span className="admin-breadcrumb-sep" aria-hidden>
                <ArrowRightWithoutLineIcon className="w-3 h-3 text-slate-400 dark:text-slate-600" />
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
