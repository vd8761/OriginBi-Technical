import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  label: string;
  value: ReactNode;
  delta?: { direction: "up" | "down"; value: string };
  sub?: ReactNode;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({ label, value, delta, sub, icon, iconBg, iconColor }: Props) {
  return (
    <div className="admin-kpi-card">
      <div className="admin-kpi-top">
        <span
          className="admin-kpi-icon"
          style={{
            background: iconBg ?? "var(--admin-green-soft)",
            color: iconColor ?? "var(--admin-green)",
          }}
        >
          {icon}
        </span>
        {delta && (
          <span className={`admin-kpi-delta ${delta.direction === "up" ? "is-up" : "is-down"}`}>
            {delta.direction === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta.value}
          </span>
        )}
      </div>
      <div>
        <p className="admin-stat-label">{label}</p>
        <p className="admin-kpi-value">{value}</p>
        {sub && <p className="admin-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}
