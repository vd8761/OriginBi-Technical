import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api";

interface Props {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  hint?: ReactNode;
}

function describe(error: unknown): { message: string; status?: number; raw?: string } {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status, raw: error.raw };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "Something went wrong loading this view." };
}

export function ErrorState({ title = "We couldn't load this view", error, onRetry, hint }: Props) {
  const { message, status, raw } = describe(error);
  return (
    <div className="admin-state-card is-error">
      <span className="admin-state-icon">
        <AlertTriangle size={24} />
      </span>
      <h3>
        {title}
        {status ? ` · ${status}` : ""}
      </h3>
      <p>{message}</p>
      {hint && <p style={{ color: "var(--admin-fg-3)", fontSize: 12 }}>{hint}</p>}
      {onRetry && (
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onRetry}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
      {raw && (
        <details>
          <summary>Show raw response</summary>
          <pre>{raw.slice(0, 4000)}</pre>
        </details>
      )}
    </div>
  );
}
