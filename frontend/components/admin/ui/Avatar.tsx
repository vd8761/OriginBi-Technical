interface Props {
  name: string;
  email?: string;
  tone?: "green" | "purple" | "amber" | "blue" | "pink";
  size?: number;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function pickTone(seed: string): "green" | "purple" | "amber" | "blue" | "pink" {
  const tones = ["green", "purple", "amber", "blue", "pink"] as const;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return tones[Math.abs(h) % tones.length];
}

export function Avatar({ name, email, tone, size = 36 }: Props) {
  const t = tone ?? pickTone(email ?? name);
  const cls = `admin-avatar-round${t !== "green" ? ` is-${t}` : ""}`;
  return (
    <span
      className={cls}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-label={name}
      title={email ?? name}
    >
      {initials(name)}
    </span>
  );
}
