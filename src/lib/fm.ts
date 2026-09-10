export interface PlayerStats {
  apps?: number | null;
  goals?: number | null;
  assists?: number | null;
  [key: string]: any;
}

/**
 * Calculates Goal Contributions (G+A)
 * Returns null if assists is missing/legacy (null or undefined)
 */
export function getGoalContributions(player: PlayerStats): number | null {
  if (player.assists === null || player.assists === undefined) {
    return null;
  }
  return (player.goals ?? 0) + player.assists;
}

/**
 * Formats per-game stats (GPG, APG, G+A/Game) to 2 decimal places.
 * Returns 'N/A' if value or apps are missing/invalid.
 */
export function getPerGameMetric(val: number | null | undefined, apps: number | null | undefined): string {
  if (val === null || val === undefined || !apps || apps <= 0) {
    return 'N/A';
  }
  return (val / apps).toFixed(2);
}

/**
 * Formats integer metrics (Assists, G+A).
 * Returns 'N/A' if null or undefined.
 */
export function formatIntegerMetric(val: number | null | undefined): string {
  if (val === null || val === undefined) {
    return 'N/A';
  }
  return val.toString();
}
