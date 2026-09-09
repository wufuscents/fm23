import { useEffect, useState } from "react";
import { FastAverageColor } from "fast-average-color";

/** Neutral fallbacks so the UI stays on the dark FM palette when extraction fails. */
export const NEUTRAL_ACCENT = "rgba(148, 163, 184, 0.35)";

export type GenderMode = "All" | "Male" | "Female";

/** Extracts the dominant colour of an image, returning null until (or unless) it resolves. */
export function useImageColor(url?: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setColor(null);
      return;
    }
    let cancelled = false;
    const fac = new FastAverageColor();
    fac
      .getColorAsync(url, { silent: true, mode: "speed" })
      .then((c) => {
        if (!cancelled) setColor(`rgba(${c.value[0]}, ${c.value[1]}, ${c.value[2]}, 0.32)`);
      })
      .catch(() => {
        if (!cancelled) setColor(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
}

/** Top trim colour driven by the Legend / Icon status axis. */
export function statusAccent(status?: string | null): string {
  if (status === "Legend" || status === "Legends") return "#EAB308";
  if (status === "Icon" || status === "Icons") return "#38BDF8";
  return NEUTRAL_ACCENT;
}

export function statusGlow(status?: string | null): string {
  if (status === "Legend" || status === "Legends") return "rgba(234, 179, 8, 0.4)";
  if (status === "Icon" || status === "Icons") return "rgba(56, 189, 248, 0.4)";
  return NEUTRAL_ACCENT;
}

/** Bottom trim colour driven by the gender axis. */
export function genderAccent(gender?: string | null): string {
  if (gender === "Male") return "#3B82F6";
  if (gender === "Female") return "#EC4899";
  return "transparent";
}

/** Split ambient backdrop: club colour on the left, country colour on the right. */
export function ambientBackground(clubColor: string | null, countryColor: string | null): string {
  return [
    `radial-gradient(circle at 20% 10%, ${clubColor || "transparent"} 0%, transparent 50%)`,
    `radial-gradient(circle at 80% 10%, ${countryColor || "transparent"} 0%, transparent 50%)`,
  ].join(", ");
}
