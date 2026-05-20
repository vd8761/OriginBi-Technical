"use client";

// TagChips — a free-form tag input. Tags are rendered as removable chips; a
// trailing text input accepts new tags on Enter / comma / semicolon. Values
// are trimmed, lowercased and de-duplicated. Backspace on an empty input
// removes the last chip. An optional suggestion list (drawn from existing
// questions) autocompletes as the admin types.

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

const MAX_TAGS = 32;
const MAX_TAG_LEN = 32;

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_TAG_LEN);
}

export default function TagChips({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (value.includes(tag)) {
      setDraft("");
      return;
    }
    if (value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const matches = useMemo(() => {
    const d = normalizeTag(draft);
    if (!d) return [];
    return suggestions
      .filter((s) => s.includes(d) && !value.includes(s))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-2 py-1.5">
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:text-red-500"
              aria-label={`Remove ${tag}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Delay so a suggestion click registers before the list closes.
              setTimeout(() => setFocused(false), 120);
              if (draft.trim()) addTag(draft);
            }}
            placeholder={value.length === 0 ? "Add tags…" : ""}
            className="w-full bg-transparent text-xs outline-none py-1"
          />
          {focused && matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-w-[240px] rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1411] shadow-lg">
              {matches.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(s);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-emerald-50 dark:hover:bg-white/[0.04]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <span className="text-[11px] text-slate-400">
        Press Enter, comma or semicolon to add. {value.length}/{MAX_TAGS} tags.
      </span>
    </div>
  );
}
