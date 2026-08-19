import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/fm/SiteHeader";
import { PlayerCard } from "@/components/fm/PlayerCard";
import { fetchDirectory, type Player } from "@/lib/fm";

const directoryQuery = queryOptions({
  queryKey: ["directory"],
  queryFn: fetchDirectory,
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
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

type SortKey = "trophies" | "awards" | "caps" | "goals" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "trophies", label: "Most Trophies Won" },
  { key: "awards", label: "Most Individual Awards" },
  { key: "caps", label: "Most Caps" },
  { key: "goals", label: "Most Career Goals" },
  { key: "name", label: "Name (A–Z)" },
];

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
  const { players, counts, error } = data;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [club, setClub] = useState("");
  const [nation, setNation] = useState("");
  const [sort, setSort] = useState<SortKey>("trophies");

  const statuses = useMemo(() => uniq(players.map(statusOf)), [players]);
  const clubs = useMemo(
    () => uniq(players.flatMap((p) => [p.club, ...p.legendClubs, ...p.iconClubs])),
    [players],
  );
  const nations = useMemo(() => uniq(players.map((p) => p.nationality)), [players]);

  const visible = useMemo(() => {
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
      return true;
    });

    const c = (id: string) => counts.get(id) ?? { trophies: 0, awards: 0 };
    return rows.sort((a, b) => {
      switch (sort) {
        case "trophies":
          return c(b.id).trophies - c(a.id).trophies;
        case "awards":
          return c(b.id).awards - c(a.id).awards;
        case "caps":
          return b.caps - a.caps;
        case "goals":
          return b.goals - a.goals;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [players, counts, search, status, club, nation, sort]);

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
          <p className="fm-label">Database</p>
          <h1 className="mt-1 text-3xl font-bold uppercase sm:text-4xl">Squad Directory</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {players.length} profiles across legends, icons, retired greats and head coaches.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player or club…"
              aria-label="Search players"
              className="h-10 rounded-md border border-border bg-input px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <Select value={status} onChange={setStatus} label="All Statuses" options={statuses} />
            <Select value={club} onChange={setClub} label="All Clubs" options={clubs} />
            <Select value={nation} onChange={setNation} label="All Nations" options={nations} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
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

        <p className="fm-label mt-6">{visible.length} results</p>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No players match these filters.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                counts={counts.get(p.id) ?? { trophies: 0, awards: 0 }}
              />
            ))}
          </div>
        )}
      </main>
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
