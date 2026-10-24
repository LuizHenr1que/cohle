import { useId } from "react";

// Cohle mark: an open "C" ring with a glowing orb in the gap (a voice, an open channel).
// Source of truth for the artwork: /brand/cohle-mark.svg
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="216 216 592 592" width={size} height={size} fill="none" className={className} role="img" aria-label="Cohle">
      <defs>
        <linearGradient id={`${id}r`} x1="250" y1="260" x2="780" y2="780" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff3b5c" /><stop offset="1" stopColor="#ff9a62" />
        </linearGradient>
        <radialGradient id={`${id}o`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#fff1f3" /><stop offset="0.35" stopColor="#ff7a8f" /><stop offset="1" stopColor="#ff3b5c" />
        </radialGradient>
        <filter id={`${id}g`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="22" /></filter>
      </defs>
      <path d="M672.9 377A210 210 0 1 0 672.9 647" stroke={`url(#${id}r)`} strokeWidth="92" strokeLinecap="round" filter={`url(#${id}g)`} opacity=".55" />
      <path d="M672.9 377A210 210 0 1 0 672.9 647" stroke={`url(#${id}r)`} strokeWidth="92" strokeLinecap="round" />
      <circle cx="684" cy="512" r="62" fill="#ff3b5c" filter={`url(#${id}g)`} opacity=".7" />
      <circle cx="684" cy="512" r="56" fill={`url(#${id}o)`} />
    </svg>
  );
}
