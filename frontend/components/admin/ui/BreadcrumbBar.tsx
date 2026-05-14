import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
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
        const node = seg.href && !isLast ? <Link href={seg.href}>{seg.label}</Link> : <span>{seg.label}</span>;
        return (
          <span key={`${seg.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {node}
            {!isLast && (
              <span className="admin-breadcrumb-sep" aria-hidden>
                <ChevronRight size={12} />
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
