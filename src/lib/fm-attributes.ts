/** Football Manager 1–20 heatmap colours for numeric attributes. */
export function getAttributeColorClass(value: number): string {
  if (value >= 16) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold";
  if (value >= 13) return "bg-lime-500/20 text-lime-400 border-lime-500/40 font-semibold";
  if (value >= 9) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-slate-800/40 text-slate-400 border-slate-700/50";
}
