import type { ReactNode } from "react";

interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

export function PillTabs<T extends string>({ tabs, value, onChange, className }: Props<T>) {
  return (
    <div className={`admin-pill-tabs${className ? ` ${className}` : ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={value === tab.value ? "is-active" : ""}
          onClick={() => onChange(tab.value)}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {typeof tab.count === "number" && (
            <span className="admin-pill-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
