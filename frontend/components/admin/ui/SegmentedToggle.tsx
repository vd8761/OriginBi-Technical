interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: Option<T>[];
  className?: string;
}

export function SegmentedToggle<T extends string>({ value, onChange, options, className }: Props<T>) {
  return (
    <div className={`admin-segment${className ? ` ${className}` : ""}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? "is-active" : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
