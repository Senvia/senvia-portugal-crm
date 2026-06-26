// Brand-color helpers for public lead forms.
//
// The org configures a single `primary_color` (hex). Two needs:
//  1) Pick a readable text color (black/white) for that background, so a light
//     brand color (yellow, lime) doesn't render white-on-white button text.
//  2) Feed shadcn's HSL CSS variables (--primary / --primary-foreground) so the
//     conversational form (which uses `bg-primary`/`text-primary` utility
//     classes) honors the brand color instead of the hard-coded theme blue.

import type { CSSProperties } from 'react';

const HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function parseHex(hex?: string | null): { r: number; g: number; b: number } | null {
  if (!hex || !HEX.test(hex.trim())) return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// YIQ perceived brightness (0-255). > ~150 reads as a "light" background.
function isLight({ r, g, b }: { r: number; g: number; b: number }): boolean {
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/** Hex -> "h s% l%" channels for a shadcn HSL CSS variable. null if invalid. */
export function hexToHslChannels(hex?: string | null): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Readable text color (hex) for a solid `bg` of the given brand color. */
export function readableTextColor(hex?: string | null): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#ffffff';
  return isLight(rgb) ? '#0f172a' : '#ffffff';
}

/** Readable foreground as HSL channels, for the --primary-foreground variable. */
export function readableForegroundChannels(hex?: string | null): string {
  const rgb = parseHex(hex);
  if (!rgb) return '0 0% 100%';
  return isLight(rgb) ? '222 47% 11%' : '0 0% 100%';
}

/**
 * Inline style that re-points shadcn's primary tokens at the brand color, so
 * every `bg-primary`/`text-primary`/`border-primary` inside the form inherits
 * it. Returns {} for an invalid/missing color (falls back to the theme).
 */
export function getBrandStyle(hex?: string | null): CSSProperties {
  const channels = hexToHslChannels(hex);
  if (!channels) return {};
  return {
    ['--primary' as string]: channels,
    ['--primary-foreground' as string]: readableForegroundChannels(hex),
  };
}
