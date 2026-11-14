import { useState } from "react";
import { getFaviconUrl } from "../services/browserApi";

interface FaviconBadgeProps {
  url: string;
  label: string;
  fallbackText?: string;
  accent?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 rounded-lg text-[10px]",
  md: "h-9 w-9 rounded-xl text-xs",
  lg: "h-11 w-11 rounded-2xl text-sm",
};

const IMG_SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function FaviconBadge({
  url,
  label,
  fallbackText,
  accent = "#6366f1",
  size = "md",
  className = "",
}: FaviconBadgeProps) {
  const [failed, setFailed] = useState(false);
  const src = getFaviconUrl(url, 64);
  const badge = (fallbackText?.trim() || label.trim().slice(0, 2) || "?").toUpperCase();

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden font-semibold tracking-tight select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{
        backgroundColor: failed ? accent : `${accent}1a`,
        color: failed ? "#ffffff" : accent,
      }}
      aria-hidden="true"
    >
      {!failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`${IMG_SIZES[size]} rounded-sm object-contain`}
        />
      ) : (
        <span>{badge}</span>
      )}
    </span>
  );
}
