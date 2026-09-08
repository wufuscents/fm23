import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteHeader } from "@/components/fm/SiteHeader";
import { PlayerCard } from "@/components/fm/PlayerCard";
import { fetchDirectory, type Player } from "@/lib/fm";

const directoryQuery = queryOptions({
  queryKey: ["directory"],
  queryFn: fetchDirectory,
  staleTime: 60_000,
});

type SortKey = "trophies" | "awards" | "caps" | "goals" | "name";
type GenderMode = "All" | "Male" | "Female";

type DirectorySearch = {
  search?: string | undefined;
  status?: string | undefined;
  club?: string | undefined;
  nation?: string | undefined;
  sort?: SortKey | undefined;
  gender?: GenderMode | undefined;
  page?: number | undefined;
};

const SORT_KEYS: SortKey[] = ["trophies", "awards", "caps", "goals", "name"];
const GENDER_MODES: GenderMode[] = ["All", "Male", "Female"];

function validateSearch(raw: Record<string, unknown>): DirectorySearch {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const rawSort = raw["sort"] as SortKey;
  const rawGender = raw["gender"] as GenderMode;
  const rawPage = raw["page"];
  const sort = SORT_KEYS.includes(rawSort) ? rawSort : "trophies";
  const gender = GENDER_MODES.includes(rawGender) ? rawGender : "All";
  const page =
    typeof rawPage === "number" && Number.isFinite(rawPage) && rawPage >= 1
      ? Math.floor(rawPage)
      : 1;
  return {
    search: str(raw["search"]) || undefined,
    status: str(raw["status"]) || undefined,
    club: str(raw["club"]) || undefined,
    nation: str(raw["nation"]) || undefined,
    sort,
    gender,
    page: page > 1 ? page : undefined,
  };
}

export const Route = createFileRoute("/")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "FM Squad Archive — Legends, Icons & Head Coaches" },
      {
        name: "description",
        content:
          "Browse every legend, icon, retired great and head coach. Filter by club, nation and status, then sort by trophies, awards, caps or goals.",
      },
      { property: "og:title", content: "FM Squad Archive — Squad Directory" },
      {
        property: "og:description",
        content:
          "A searchable directory of football legends with live trophy, award, cap and goal records.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(directoryQuery);
  },
  component: Directory,
  errorComponent: ({ error }) => <Failure message={error.message} />,
  notFoundComponent: () => <Failure message="No players found." />,
});

function Failure({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" role="alert">
        <h1 className="text-2xl font-semibold">Squad data unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "trophies", label: "Most Trophies Won" },
  { key: "awards", label: "Most Individual Awards" },
  { key: "caps", label: "Most Caps" },
  { key: "goals", label: "Most Career Goals" },
  { key: "name", label: "Name (A–Z)" },
];

const PLAYERS_PER_PAGE = 20;

const uniq = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

function statusOf(p: Player): string {
  if (p.status) return p.status;
  if (p.isHeadCoach) return "Head Coaches";
  if (p.iconClubs.length) return "Icons";
  if (p.legendClubs.length) return "Legends";
  return "Retired";
}

function Directory() {
  const { data } = useSuspenseQuery(directoryQuery);
  const { players, error } = data;

  const {
    search = "",
    status = "",
    club = "",
    nation = "",
    sort = "trophies",
    gender: genderMode = "All",
    page: currentPage = 1,
  } = Route.useSearch();
  const navigate = Route.useNavigate();

  const setParam = (patch: Partial<DirectorySearch>, resetPage = true) =>
    navigate({
      search: (prev: DirectorySearch) => ({
        ...prev,
        ...patch,
        ...(resetPage ? { page: 1 } : {}),
      }),
      replace: true,
    });

  const handleGenderToggle = () => {
    if (genderMode === "All") setParam({ gender: "Male" });
    else if (genderMode === "Male") setParam({ gender: "Female" });
    else setParam({ gender: "All" });
  };

  const statuses = useMemo(() => uniq(players.map(statusOf)), [players]);
  const clubs = useMemo(
    () => uniq(players.flatMap((p) => [p.club, ...p.legendClubs, ...p.iconClubs])),
    [players],
  );
  const nations = useMemo(() => uniq(players.map((p) => p.nationality)), [players]);

  const sortedPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = players.filter((p) => {
      if (q) {
        const haystack = [p.name, p.club, ...p.legendClubs, ...p.iconClubs]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status && statusOf(p) !== status) return false;
      if (club && ![p.club, ...p.legendClubs, ...p.iconClubs].includes(club)) return false;
      if (nation && p.nationality !== nation) return false;
      if (genderMode !== "All" && p.gender !== genderMode) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "trophies") return Number(b.trophies || 0) - Number(a.trophies || 0);
      if (sort === "awards") return Number(b.awards || 0) - Number(a.awards || 0);
      if (sort === "caps") return Number(b.apps || 0) - Number(a.apps || 0);
      if (sort === "goals") return Number(b.goals || 0) - Number(a.goals || 0);
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });
  }, [players, search, status, club, nation, sort, genderMode]);

  const clubStats = useMemo<LegacyStats | null>(() => {
    if (!club) return null;
    const matching = players.filter(
      (p) => p.legendClubs?.includes(club) || p.iconClubs?.includes(club)
    );
    return {
      name: club,
      type: "Club Legacy",
      count: matching.length,
      totalApps: matching.reduce((sum, p) => sum + Number(p.apps || 0), 0),
      totalGoals: matching.reduce((sum, p) => sum + Number(p.goals || 0), 0),
      totalTrophies: matching.reduce((sum, p) => sum + Number(p.trophies || 0), 0),
      totalAwards: matching.reduce((sum, p) => sum + Number(p.awards || 0), 0),
    };
  }, [players, club]);

  const countryStats = useMemo<LegacyStats | null>(() => {
    if (!nation) return null;
    const matching = players.filter((p) => p.nationality === nation);
    return {
      name: nation,
      type: "National Team Legacy",
      count: matching.length,
      totalApps: matching.reduce((sum, p) => sum + Number(p.apps || 0), 0),
      totalGoals: matching.reduce((sum, p) => sum + Number(p.goals || 0), 0),
      totalTrophies: matching.reduce((sum, p) => sum + Number(p.trophies || 0), 0),
      totalAwards: matching.reduce((sum, p) => sum + Number(p.awards || 0), 0),
    };
  }, [players, nation]);

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / PLAYERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const shownPlayers = sortedPlayers.slice(
    (safePage - 1) * PLAYERS_PER_PAGE,
    safePage * PLAYERS_PER_PAGE,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          >
            Database read blocked: {error}. Grant SELECT on the tables to the anon role in your
            Supabase project to load live data.
          </div>
        )}
        <div className="fm-panel p-5">
          <p className="fm-label cursor-pointer select-none" onClick={handleGenderToggle}>
            {genderMode === "All" ? "Database" : genderMode === "Male" ? "Database · M" : "Database · F"}
          </p>
          <h1 className="mt-1 text-3xl font-bold uppercase sm:text-4xl">Squad Directory</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {players.length} profiles across legends, icons, retired greats and head coaches.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
            <input
              value={search}
              onChange={(e) => setParam({ search: e.target.value })}
              placeholder="Search player or club…"
              aria-label="Search players"
              className="h-10 rounded-md border border-border bg-input px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <Select
              value={status}
              onChange={(v) => setParam({ status: v })}
              label="All Statuses"
              options={statuses}
            />
            <Select
              value={club}
              onChange={(v) => setParam({ club: v })}
              label="All Clubs"
              options={clubs}
            />
            <Select
              value={nation}
              onChange={(v) => setParam({ nation: v })}
              label="All Nations"
              options={nations}
            />
            <select
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value as SortKey })}
              aria-label="Sort players"
              className="h-10 rounded-md border border-border bg-input px-2 text-sm outline-none focus:border-primary"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(clubStats || countryStats) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {clubStats && <SummaryPanel stats={clubStats} />}
            {countryStats && <SummaryPanel stats={countryStats} />}
          </div>
        )}

        <p className="fm-label mt-6">{sortedPlayers.length} results</p>

        {sortedPlayers.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No players match these filters.
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shownPlayers.map((p) => (
                <PlayerCard key={p.id} player={p} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setParam({ page: safePage - 1 }, false)}
                  className="h-10 rounded-md border border-border bg-input px-5 text-sm font-semibold uppercase tracking-wide transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setParam({ page: safePage + 1 }, false)}
                  className="h-10 rounded-md border border-border bg-input px-5 text-sm font-semibold uppercase tracking-wide transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type LegacyStats = {
  name: string;
  type: "Club Legacy" | "National Team Legacy";
  count: number;
  totalApps: number;
  totalGoals: number;
  totalTrophies: number;
  totalAwards: number;
};

function SummaryPanel({ stats }: { stats: LegacyStats }) {
  return (
    <div className="fm-panel p-5">
      <p className="fm-label">{stats.type}</p>
      <h2 className="mt-1 text-2xl font-bold uppercase">{stats.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {stats.count} profile{stats.count === 1 ? "" : "s"} in this archive
      </p>
      <div className="mt-4 grid grid-cols-4 gap-3">
        <SummaryStat value={stats.totalApps} label="Apps" />
        <SummaryStat value={stats.totalGoals} label="Gls" />
        <SummaryStat value={stats.totalTrophies} label="Trph" />
        <SummaryStat value={stats.totalAwards} label="Awd" />
      </div>
    </div>
  );
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-border bg-input px-3 py-3 text-center">
      <p className="fm-stat text-2xl">{value.toLocaleString()}</p>
      <p className="fm-label mt-1 text-[0.65rem]">{label}</p>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-10 rounded-md border border-border bg-input px-2 text-sm outline-none focus:border-primary"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
