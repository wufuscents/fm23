import { supabase } from "./supabase";

/**
 * All data comes from the live database. Column names differ slightly between
 * datasets, so every value is read through tolerant accessors instead of being
 * hardcoded.
 */
export type Row = Record<string, unknown>;

export const str = (row: Row | undefined, keys: string[]): string => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
};

export const num = (row: Row | undefined, keys: string[]): number => {
  if (!row) return 0;
  for (const k of keys) {
    const v = row[k];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
};

export const bool = (row: Row | undefined, keys: string[]): boolean => {
  if (!row) return false;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return ["true", "t", "yes", "1"].includes(v.toLowerCase());
    if (typeof v === "number") return v === 1;
  }
  return false;
};

export const list = (row: Row | undefined, keys: string[]): string[] => {
  if (!row) return [];
  for (const k of keys) {
    const v = row[k];
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    if (typeof v === "string" && v.trim()) {
      return v
        .replace(/^\{|\}$/g, "")
        .split(/[,;|]/)
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }
  }
  return [];
};

/**
 * Image columns hold either a bare storage path or a URL still pointing at the
 * placeholder project ref, so every image is normalised to the public bucket.
 */
const BUCKET = "https://fenmghxzmawubuxavrol.supabase.co/storage/v1/object/public/fm-images/";

export const storageUrl = (value: string): string => {
  if (!value) return "";
  const placeholder = /^https?:\/\/[^/]*(YOUR-PROJECT-REF|your-project-ref)[^/]*\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\//;
  if (placeholder.test(value)) return value.replace(placeholder, BUCKET);
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return BUCKET + value.replace(/^\/+/, "").replace(/^fm-images\//, "");
};

export interface Player {
  id: string;
  name: string;
  imageUrl: string;
  flagUrl: string;
  nationality: string;
  club: string;
  role: string;
  status: string;
  apps: number;
  goals: number;
  caps: number;
  trophies: number;
  awards: number;
  legendClubs: string[];
  iconClubs: string[];
  isHeadCoach: boolean;
  isRetired: boolean;
  biography: string;
  milestones: { first: number; second: number; third: number };
  teamMilestones: { first: number; second: number; third: number };
  raw: Row;
}


export const toPlayer = (row: Row): Player => ({
  id: str(row, ["id", "player_id", "uuid", "slug"]),
  name: str(row, ["name", "player_name", "full_name", "display_name"]),
  imageUrl: storageUrl(str(row, ["image_url", "photo_url", "picture_url", "avatar_url"])),
  flagUrl: storageUrl(str(row, ["nationality_flag_url", "flag_url", "country_flag_url"])),
  nationality: str(row, ["nationality", "country", "nation"]),
  club: str(row, ["club", "current_club", "team", "current_team", "club_name"]),
  role: str(row, ["primary_role", "role", "position", "primary_position"]),
  status: str(row, ["status", "player_status", "category", "type"]),
  apps: num(row, ["apps", "appearances", "career_apps", "total_apps", "matches"]),
  goals: num(row, ["goals", "career_goals", "total_goals"]),
  caps: num(row, ["caps", "international_caps", "national_caps", "international_apps"]),
  trophies: num(row, ["trophies", "team_trophies", "total_trophies"]),
  awards: num(row, ["awards", "individual_awards", "total_awards"]),
  legendClubs: list(row, ["legend_at_clubs", "legend_clubs"]),
  iconClubs: list(row, ["icon_at_clubs", "icon_clubs"]),
  isHeadCoach: bool(row, ["is_head_coach", "head_coach", "is_coach"]),
  isRetired: bool(row, ["is_retired", "retired", "is_retired_player"]),
  biography: str(row, ["biography", "bio", "description", "about"]),
  milestones: {
    first: num(row, ["personal_1st"]),
    second: num(row, ["personal_2nd"]),
    third: num(row, ["personal_3rd"]),
  },
  teamMilestones: {
    first: num(row, ["team_1st"]),
    second: num(row, ["team_2nd"]),
    third: num(row, ["team_3rd"]),
  },
  raw: row,
});


export type HonourKind = "player_trophy" | "player_award";

export interface Honour {
  id: string;
  playerId: string;
  kind: HonourKind;
  title: string;
  club: string;
  season: string;
  placement: string;
  amount: number;
  raw: Row;
}

const classify = (row: Row): HonourKind => {
  const t = str(row, [
    "type",
    "award_type",
    "category",
    "honour_type",
    "kind",
    "record_type",
  ]).toLowerCase();
  if (t.includes("award") || t.includes("individual") || t.includes("personal")) {
    return "player_award";
  }
  return "player_trophy";
};

export const toHonour = (row: Row): Honour => ({
  id: str(row, ["id", "uuid"]),
  playerId: str(row, ["player_id", "playerid", "player"]),
  kind: classify(row),
  title: str(row, ["title", "name", "award_name", "trophy_name", "competition"]),
  club: str(row, ["club", "team", "club_name", "team_name", "organisation"]),
  season: str(row, ["season", "year", "years", "date", "years_or_details"]),
  placement: str(row, ["placement", "position", "rank", "result", "medal"]),
  amount: Math.max(1, num(row, ["amount", "count", "wins", "quantity"]) || 1),
  raw: row,
});

export interface CareerEntry {
  id: string;
  playerId: string;
  team: string;
  country: string;
  logoUrl: string;
  years: string;
  apps: number;
  goals: number;
}

export const toCareer = (row: Row): CareerEntry => ({
  id: str(row, ["id", "uuid"]) || Math.random().toString(36).slice(2),
  playerId: str(row, ["player_id", "coach_id", "playerid", "player"]),
  team: str(row, ["team", "team_name", "club", "club_name"]),
  country: str(row, ["country", "nation", "league_country"]),
  logoUrl: storageUrl(str(row, ["club_logo_url", "team_logo_url", "logo_url"])),
  years: str(row, ["years", "season", "period", "seasons", "year"]),
  apps: num(row, ["apps", "appearances", "matches", "games"]),
  goals: num(row, ["goals", "wins", "goals_scored"]),
});


/**
 * Reads never throw: a blocked table (missing grant / RLS policy) must degrade
 * to an empty dataset plus a visible notice, not a blank SSR crash.
 */
const soft = (label: string, error: { message: string } | null): string | null =>
  error ? `${label}: ${error.message}` : null;

export async function fetchPlayers(): Promise<{ players: Player[]; error: string | null }> {
  const { data, error } = await supabase.from("players").select("*");
  return { players: (data ?? []).map((r) => toPlayer(r as Row)), error: soft("players", error) };
}

export async function fetchHonours(): Promise<{ honours: Honour[]; error: string | null }> {
  const { data, error } = await supabase.from("awards_and_trophies").select("*");
  return {
    honours: (data ?? []).map((r) => toHonour(r as Row)),
    error: soft("awards_and_trophies", error),
  };
}

export interface HonourCounts {
  trophies: number;
  awards: number;
}

export function countHonours(honours: Honour[]): Map<string, HonourCounts> {
  const map = new Map<string, HonourCounts>();
  for (const h of honours) {
    if (!h.playerId) continue;
    const entry = map.get(h.playerId) ?? { trophies: 0, awards: 0 };
    if (h.kind === "player_award") entry.awards += h.amount;
    else entry.trophies += h.amount;
    map.set(h.playerId, entry);
  }
  return map;
}

export interface CareerTotals {
  apps: number;
  goals: number;
}

export const sumCareer = (rows: CareerEntry[]): CareerTotals =>
  rows.reduce(
    (acc, r) => ({ apps: acc.apps + r.apps, goals: acc.goals + r.goals }),
    { apps: 0, goals: 0 },
  );

/** Career totals per player, summed from every player_career_history stint. */
export async function fetchCareerTotals(): Promise<{
  totals: Map<string, CareerTotals>;
  error: string | null;
}> {
  const { data, error } = await supabase.from("player_career_history").select("*");
  const totals = new Map<string, CareerTotals>();
  for (const row of data ?? []) {
    const entry = toCareer(row as Row);
    if (!entry.playerId) continue;
    const current = totals.get(entry.playerId) ?? { apps: 0, goals: 0 };
    totals.set(entry.playerId, {
      apps: current.apps + entry.apps,
      goals: current.goals + entry.goals,
    });
  }
  return { totals, error: soft("player_career_history", error) };
}

export interface Directory {
  players: Player[];
  counts: Map<string, HonourCounts>;
  error: string | null;
}

export async function fetchDirectory(): Promise<Directory> {
  const [p, h, t] = await Promise.all([fetchPlayers(), fetchHonours(), fetchCareerTotals()]);
  // Club apps/goals are not stored on players — they are the sum of career stints.
  const players = p.players.map((player) => {
    const totals = t.totals.get(player.id);
    return totals ? { ...player, apps: totals.apps, goals: totals.goals } : player;
  });
  return {
    players,
    counts: countHonours(h.honours),
    error: p.error ?? h.error ?? t.error,
  };
}

export interface PlayerDetail {
  player: Player | null;
  playerCareer: CareerEntry[];
  coachCareer: CareerEntry[];
  honours: Honour[];
  totals: CareerTotals;
  error: string | null;
}

export async function fetchPlayerDetail(id: string): Promise<PlayerDetail> {
  const [p, pc, cc, at] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).maybeSingle(),
    supabase.from("player_career_history").select("*").eq("player_id", id),
    supabase.from("coach_career_history").select("*").eq("player_id", id),
    supabase.from("awards_and_trophies").select("*").eq("player_id", id),
  ]);

  const playerCareer = (pc.data ?? []).map((r) => toCareer(r as Row));
  const coachCareer = (cc.data ?? []).map((r) => toCareer(r as Row));
  const totals = sumCareer(playerCareer);
  const player = p.data ? toPlayer(p.data as Row) : null;

  return {
    error:
      soft("players", p.error) ??
      soft("player_career_history", pc.error) ??
      soft("coach_career_history", cc.error) ??
      soft("awards_and_trophies", at.error),
    player: player ? { ...player, apps: totals.apps, goals: totals.goals } : null,
    playerCareer,
    coachCareer,
    honours: (at.data ?? []).map((r) => toHonour(r as Row)),
    totals,
  };
}

/** Personal 1st/2nd/3rd medals derived from placement text on individual awards. */
export function medalCounts(honours: Honour[]) {
  const rank = (h: Honour) => {
    const t = `${h.placement} ${h.title}`.toLowerCase();
    if (/(^|\D)(1st|first|winner|won|gold)(\D|$)/.test(t)) return 1;
    if (/(^|\D)(2nd|second|runner|silver)(\D|$)/.test(t)) return 2;
    if (/(^|\D)(3rd|third|bronze)(\D|$)/.test(t)) return 3;
    return 0;
  };
  const personal = { first: 0, second: 0, third: 0 };
  for (const h of honours.filter((x) => x.kind === "player_award")) {
    const r = rank(h);
    if (r === 1) personal.first += 1;
    else if (r === 2) personal.second += 1;
    else if (r === 3) personal.third += 1;
    else personal.first += 1;
  }
  const team = honours.filter((h) => h.kind === "player_trophy").length;
  return { personal, team };
}
