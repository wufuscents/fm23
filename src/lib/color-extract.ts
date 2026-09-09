import { FastAverageColor } from 'fast-average-color';

const fac = new FastAverageColor();
const colorCache = new Map<string, string>();

export async function getDominantColor(imageUrl?: string | null, fallback = '#1f2937'): Promise<string> {
  if (!imageUrl) return fallback;
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl)!;

  try {
    const color = await fac.getColorAsync(imageUrl, {
      crossOrigin: 'anonymous',
      ignoredColor: [0, 0, 0, 255, 255, 255, 255, 255], // Ignore pure black and white
    });
    colorCache.set(imageUrl, color.hex);
    return color.hex;
  } catch {
    return fallback;
  }
}

export function getStatusBorderClass(status?: string): string {
  const normalized = status?.toLowerCase();
  if (normalized === 'legend') return 'border-t-2 border-t-amber-400 shadow-[0_-4px_12px_rgba(251,191,36,0.35)]';
  if (normalized === 'icon') return 'border-t-2 border-t-cyan-400 shadow-[0_-4px_12px_rgba(34,211,238,0.35)]';
  return 'border-t-2 border-t-slate-700';
}

export function getGenderBorderClass(gender?: string): string {
  const normalized = gender?.toLowerCase();
  if (normalized === 'female') return 'border-b-2 border-b-fuchsia-500 shadow-[0_4px_12px_rgba(217,70,239,0.35)]';
  return 'border-b-2 border-b-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.35)]';
}
