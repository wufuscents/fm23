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

/** Ambient split gradient: Left side = Club, Right side = Nation. Handles fallback if only one is present. */
export function ambientSplitGradient(clubColor?: string, nationColor?: string): string {
  const left = clubColor && clubColor !== COLOR_FALLBACK ? clubColor : "#0f172a";
  const right = nationColor && nationColor !== COLOR_FALLBACK ? nationColor : "#0f172a";
  
  return `linear-gradient(90deg, ${left}22 0%, ${left}11 40%, ${right}11 60%, ${right}22 100%)`;
}

/** Legend = Gold/Amber glow, Icon = Silver glow. */
export function getStatusBorderClass(status?: string | null): string {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.startsWith("legend")) {
    return "border-t-2 border-t-amber-400 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-12 before:bg-gradient-to-b before:from-amber-400/40 before:to-transparent";
  }
  if (normalized.startsWith("icon")) {
    return "border-t-2 border-t-slate-300 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-12 before:bg-gradient-to-b before:from-slate-300/40 before:to-transparent";
  }
  return "border-t-2 border-t-slate-800";
}

/** Profile view background themes by status */
export function getStatusProfileTheme(status?: string | null): string {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.startsWith("legend")) {
    return "radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.15) 0%, rgba(2, 6, 23, 0.98) 75%)";
  }
  if (normalized.startsWith("icon")) {
    return "radial-gradient(circle at 50% 0%, rgba(203, 213, 225, 0.15) 0%, rgba(2, 6, 23, 0.98) 75%)";
  }
  return "radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.15) 0%, rgba(2, 6, 23, 0.98) 75%)";
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
  return "border-b-2 border-b-slate-800";
}
