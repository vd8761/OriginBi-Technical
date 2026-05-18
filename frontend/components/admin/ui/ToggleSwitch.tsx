interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

export function ToggleSwitch({ checked, onChange, disabled, label, hint }: Props) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className={`admin-toggle${checked ? " is-on" : ""}`}
      onClick={() => !disabled && onChange(!checked)}
    />
  );

  if (!label && !hint) return button;

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: "var(--admin-r-md)",
        border: "1px solid var(--admin-border)",
        background: "rgba(255,255,255,0.02)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--admin-fg)" }}>{label}</p>
        )}
        {hint && (
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--admin-fg)", opacity: 0.9, lineHeight: 1.45 }}>
            {hint}
          </p>
        )}
      </div>
      {button}
    </label>
  );
}
