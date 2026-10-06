import React from "react";

interface LukaIconProps {
  /** Diameter in px (default 28) */
  size?: number;
  /** true = faster pulse (AI generating), false = gentle idle glow */
  animated?: boolean;
  /** When true, renders just the sparkle SVG with no wrapper div — for use inside already-styled containers */
  bare?: boolean;
  /** When true, keeps the gradient sparkle even inside already-styled containers */
  inverted?: boolean;
  className?: string;
}

let _gradientId = 0;

/**
 * Luka mark: a single plump four-point diamond sparkle with a soft violet
 * glow and a small white dot at its center (matches the brand image).
 */
export function LukaIcon({ size = 28, animated = false, bare = false, inverted = false, className = "" }: LukaIconProps) {
  const svgSize = bare ? size : size * 0.78;
  const dur = animated ? "1.3s" : "2.6s";
  const gradId = React.useRef(`luka-grad-${++_gradientId}`).current;
  const glowId = React.useRef(`luka-glow-${++_gradientId}`).current;

  // White mono sparkle only for bare usage on dark/navy surfaces; everywhere
  // else the sparkle carries the Luka violet gradient.
  const gradientSparkle = !bare || inverted;
  const sparkleFill = gradientSparkle ? `url(#${gradId})` : "#FFFFFF";
  const shadowColor = gradientSparkle ? "rgba(139,92,246," : "rgba(255,255,255,";

  const sparkle = (
    <svg
      viewBox="0 0 100 100"
      width={svgSize}
      height={svgSize}
      fill={sparkleFill}
      aria-hidden="true"
    >
      {gradientSparkle && (
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#BBA6F9" />
            <stop offset="55%" stopColor="#A585F6" />
            <stop offset="100%" stopColor="#7E57E8" />
          </radialGradient>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
      )}
      <g
        style={{
          transformOrigin: "50px 50px",
          animation: `luka-sparkle-${animated ? "active" : "idle"} ${dur} ease-in-out infinite`,
          filter: animated
            ? `drop-shadow(0 0 6px ${shadowColor}1)) drop-shadow(0 0 3px ${shadowColor}.9))`
            : `drop-shadow(0 0 3px ${shadowColor}.8))`,
        }}
      >
        {/* Soft glow halo behind the sparkle */}
        {gradientSparkle && (
          <path
            d="M50 2 Q61 39 98 50 Q61 61 50 98 Q39 61 2 50 Q39 39 50 2 Z"
            fill={sparkleFill}
            opacity={0.65}
            filter={`url(#${glowId})`}
          />
        )}
        {/* Diamond sparkle body */}
        <path d="M50 2 Q61 39 98 50 Q61 61 50 98 Q39 61 2 50 Q39 39 50 2 Z" />
        {/* Small white dot at the center */}
        {gradientSparkle && <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" opacity={0.95} />}
      </g>
    </svg>
  );

  if (bare) return sparkle;

  // No circle background — the sparkle itself is the logo in Luka colors.
  // `inverted` keeps a subtle white chip for use on tinted banners.
  const wrapperBg = inverted ? "white" : undefined;
  const wrapperBorder = inverted
    ? "1.5px solid rgba(134,73,241,0.25)"
    : undefined;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: wrapperBg,
        border: wrapperBorder,
      }}
    >
      {sparkle}
    </div>
  );
}
