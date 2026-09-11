export type ArchiveProfile = "Death" | "Yggdrasil";

export const AUTH_STORAGE_KEY = "fm_auth_expires_at";
export const AUTH_PROFILE_STORAGE_KEY = "fm_auth_profile";
export const AUTH_DURATION_MS = 2 * 60 * 60 * 1000;

export const PROFILE_CREDENTIALS: Record<ArchiveProfile, string> = {
  Death: "liveisdead",
  Yggdrasil: "treeoflife",
};

export function getArchiveProfile(): ArchiveProfile {
  if (typeof window === "undefined") return "Death";

  const value = localStorage.getItem(AUTH_PROFILE_STORAGE_KEY);
  return value === "Yggdrasil" ? "Yggdrasil" : "Death";
}

export function isMaleOnlyProfile(profile: ArchiveProfile = getArchiveProfile()): boolean {
  return profile === "Yggdrasil";
}

export function isPlayerVisibleToProfile(
  player: { gender?: unknown },
  profile: ArchiveProfile = getArchiveProfile(),
): boolean {
  if (!isMaleOnlyProfile(profile)) return true;

  const gender = String(player.gender ?? player.sex ?? "").trim().toLowerCase();
  return gender === "male" || gender === "m";
}

export function filterPlayersForProfile<T extends { gender?: unknown }>(
  players: T[],
  profile: ArchiveProfile = getArchiveProfile(),
): T[] {
  return players.filter((player) => isPlayerVisibleToProfile(player, profile));
}

export function startArchiveSession(profile: ArchiveProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, profile);
  localStorage.setItem(AUTH_STORAGE_KEY, String(Date.now() + AUTH_DURATION_MS));
}

export function clearArchiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
}

export function hasValidAuthSession(): boolean {
  if (typeof window === "undefined") return false;

  const expiresAt = Number(localStorage.getItem(AUTH_STORAGE_KEY) || 0);
  if (expiresAt > Date.now()) return true;

  clearArchiveSession();
  return false;
}
