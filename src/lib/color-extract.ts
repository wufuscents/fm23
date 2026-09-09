import { useEffect, useState } from "react";
import { FastAverageColor } from "fast-average-color";

const fac = new FastAverageColor();
const colorCache = new Map<string, string>();

export const COLOR_FALLBACK = "#1e293b";

export async function getDominantColor(
  imageUrl?: string | null,
  fallback = COLOR_FALLBACK,
): Promise<string> {
  if (!imageUrl) return fallback;
  const cached = colorCache.get(imageUrl);
  if (cached) return cached;

  try {
    const color = await fac.getColorAsync(imageUrl, {
      crossOrigin: "anonymous",
      silent: true,
      ignoredColor: [
        [0, 0, 0, 255],
        [255, 255, 255, 255],
      ],
    });
    colorCache.set(imageUrl, color.hex);
    return color.hex;
  } catch {
    return fallback;
  }
}

/** Extracts a dominant hex from a club logo or national flag URL. */
export function useDominantColor(imageUrl?: string | null, fallback = COLOR_FALLBACK): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    let mounted = true;
    setColor(fallback);
    getDominantColor(imageUrl, fallback).then((hex) => {
      if (mounted) setColor(hex);
    });
    return () => {
      mounted = false;
    };
  }, [imageUrl, fallback]);

  return color;
}

export function useClubAndNationColors(clubLogoUrl?: string | null, nationFlagUrl?: string | null) {
  const clubColor = useDominantColor(clubLogoUrl, COLOR_FALLBACK);
  const nationColor = useDominantColor(nationFlagUrl, COLOR_FALLBACK);
  return { clubColor, nationColor };
}

/** Ambient split: club colour top-left, nation colour bottom-right. */
export function ambientRadialGradient(clubColor: string, nationColor: string): string {
  return [
    `radial-gradient(circle at 12% 18%, ${clubColor} 0%, transparent 58%)`,
    `radial-gradient(circle at 88% 82%, ${nationColor} 0%, transparent 58%)`,
  ].join(", ");
}

/** Legend = amber glow, Icon = cyan glow. */
export function getStatusBorderClass(status?: string | null): string {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.startsWith("legend")) {
    return "border-t-2 border-t-amber-400 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-10 before:bg-gradient-to-b before:from-amber-400/45 before:to-transparent";
  }
  if (normalized.startsWith("icon")) {
    return "border-t-2 border-t-cyan-400 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-10 before:bg-gradient-to-b before:from-cyan-400/45 before:to-transparent";
  }
  return "border-t-2 border-t-slate-700";
}

/** Female = magenta glow, Male = blue glow. */
export function getGenderBorderClass(gender?: string | null): string {
  const normalized = gender?.toLowerCase() ?? "";
  if (normalized === "female") {
    return "border-b-2 border-b-pink-500 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-pink-500/45 after:to-transparent";
  }
  if (normalized === "male") {
    return "border-b-2 border-b-blue-500 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-blue-500/45 after:to-transparent";
  }
  return "border-b-2 border-b-slate-700";
}
