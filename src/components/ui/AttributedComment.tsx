import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CURRENT_USER } from "@/lib/useTimeEntries";

interface Attribution {
  by: string;
  at: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  storageKey: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  lukaGenerated?: boolean;
  minHeight?: string;
}

function formatAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const STORAGE_PREFIX = "attr:comment:";

// ── Hook for use with custom inputs (e.g. AITextarea) ──────────────────────

export function useAttribution(storageKey: string) {
  const key = STORAGE_PREFIX + storageKey;
  const [attr, setAttr] = useState<Attribution | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const stamp = (by: string = CURRENT_USER.initials) => {
    const a: Attribution = { by, at: new Date().toISOString() };
    setAttr(a);
    localStorage.setItem(key, JSON.stringify(a));
  };

  const clear = () => {
    setAttr(null);
    localStorage.removeItem(key);
  };

  return { attr, stamp, clear };
}

export function AttributionBadge({ attr }: { attr: Attribution | null }) {
  if (!attr) return null;
  const isLuka = attr.by === "LUKA";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 w-fit ${
        isLuka
          ? "bg-violet-100 text-violet-700 border border-violet-200"
          : "bg-[#e1eefa] text-[#074075] border border-[#1c63a6]"
      }`}
    >
      {attr.by} · {formatAt(attr.at)}
    </span>
  );
}

export function AttributedComment({
  value,
  onChange,
  storageKey,
  placeholder,
  disabled,
  className,
  lukaGenerated,
  minHeight = "56px",
}: Props) {
  const key = STORAGE_PREFIX + storageKey;
  const prevValue = useRef(value);

  const [attr, setAttr] = useState<Attribution | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // If lukaGenerated flips to true and no attribution yet, store LUKA
  useEffect(() => {
    if (lukaGenerated && !attr) {
      const a: Attribution = { by: "LUKA", at: new Date().toISOString() };
      setAttr(a);
      localStorage.setItem(key, JSON.stringify(a));
    }
  }, [lukaGenerated]);

  const stamp = (by: string) => {
    const a: Attribution = { by, at: new Date().toISOString() };
    setAttr(a);
    localStorage.setItem(key, JSON.stringify(a));
  };

  const handleBlur = () => {
    if (!value) return;
    const by = lukaGenerated ? "LUKA" : CURRENT_USER.initials;
    if (!attr || (attr.by !== "LUKA" && prevValue.current !== value)) {
      stamp(by);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    prevValue.current = value;
    onChange(e.target.value);
    // Clear attribution if user erases content
    if (!e.target.value && attr) {
      setAttr(null);
      localStorage.removeItem(key);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && value.trim()) {
      stamp(lukaGenerated ? "LUKA" : CURRENT_USER.initials);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        style={{ minHeight }}
      />
      <AttributionBadge attr={attr} />
    </div>
  );
}
