"use client";

import { useMemo, useState, type ReactNode } from "react";
import { updatePluginConfig } from "@/lib/api";
import { Card, ToggleSwitch } from "@/components/admin/ui";
import type { PluginCtx } from "./types";

export function ProctorCard({
  icon,
  title,
  subtitle,
  toggle,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  toggle?: { checked: boolean; onChange: (v: boolean) => void };
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="admin-proctor-card">
      <header className="admin-proctor-card-header">
        <span className="admin-module-icon admin-proctor-card-icon">{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="admin-card-title" style={{ fontSize: 15 }}>{title}</h3>
          {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
        </div>
        {badge}
        {toggle && <ToggleSwitch checked={toggle.checked} onChange={toggle.onChange} />}
      </header>
      <div className="admin-proctor-card-body">{children}</div>
    </Card>
  );
}

export function ProctorRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="admin-proctor-row">
      <div style={{ minWidth: 0 }}>
        <p className="admin-proctor-row-label">{label}</p>
        {hint && <p className="admin-proctor-row-hint">{hint}</p>}
      </div>
      <div className="admin-proctor-row-control">{control}</div>
    </div>
  );
}

export function Pills<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div className="admin-proctor-pills" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={value === opt.value ? "is-active" : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function IntervalSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "s",
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="admin-proctor-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="admin-proctor-slider-readout admin-mono">{value}{unit}</span>
    </div>
  );
}

export function usePersistedPluginConfig<T extends object>(
  ctx: PluginCtx,
  defaults: T,
) {
  const initial = useMemo(() => ({ ...defaults, ...ctx.config }) as T, [ctx.config, defaults]);
  const sourceKey = useMemo(() => JSON.stringify(initial), [initial]);
  const [local, setLocal] = useState(() => ({ sourceKey, config: initial }));
  const config = local.sourceKey === sourceKey ? local.config : initial;

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    const next = { ...config, [key]: value } as T;
    setLocal({ sourceKey, config: next });
    void updatePluginConfig(ctx.pluginId, { config: next as Record<string, unknown>, state: "enabled" }).catch((err) => {
      console.warn(`[plugins] failed to persist config for ${ctx.pluginId}`, err);
    });
  };

  return [config, update] as const;
}
