import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/fm/SiteHeader";
import { Avatar, Flag } from "@/components/fm/PlayerCard";
import {
  fetchDirectory,
  fetchPlayerDetail,
  type CareerEntry,
  type Honour,
  type Player,
  type PlayerDetail,
} from "@/lib/fm";

type CompareSearch = { player1?: string; player2?: string };

const directoryQuery = queryOptions({
  queryKey: ["directory"],
  queryFn: fetchDirectory,
  staleTime: 60_000,
});

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: ["player", id],
    queryFn: () => fetchPlayerDetail(id),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/compare")({
  validateSearch: (raw: Record<string, unknown>): CompareSearch => {
    const s: CompareSearch = {};
    if (typeof raw["player1"] === "string" && raw["player1"]) s.player1 = raw["player1"];
    if (typeof raw["player2"] === "string" && raw["player2"]) s.player2 = raw["player2"];
    return s;
  },
  head: () => ({
    meta: [
      { title: "Head-to-Head Scouting Comparison — FM Squad Archive" },
      {
        name: "description",
        content:
          "Compare two profiles side by side: appearances, goals, trophies, awards, podium finishes, international record and full career stints.",
      },
      { property: "og:title", content: "Head-to-Head Scouting Comparison" },
      {
        property: "og:description",
        content: "Side-by-side scouting comparison of two profiles from the squad archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(directoryQuery);
  },
  component: ComparePage,
});

function isGoalkeeper(player: Player | null) {
  const r = player?.role?.toLowerCase() ?? "";
  return r.includes("goalkeeper") || r === "gk";
}

function ComparePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(directoryQuery);
  const players = data.players;

  const setSlot = (slot: "player1" | "player2", id: string) => {
    void navigate({
      search: (prev) => ({ ...prev, [slot]: id || undefined }),
      replace: true,
    });
  };

  const left = useQuery({ ...detailQuery(search.player1 ?? ""), enabled: !!search.player1 });
  const right = useQuery({ ...detailQuery(search.player2 ?? ""), enabled: !!search.player2 });

  const a = left.data ?? null;
  const b = right.data ?? null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="fm-label">Scouting</p>
        <h1 className="text-4xl font-bold uppercase">Head-to-Head</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick two profiles to compare their records side by side.
        </p>

        {data.error ? (
          <p className="fm-panel mt-4 p-4 text-sm text-destructive" role="alert">
            Database read blocked: {data.error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PlayerSelect
            label="Select Player 1"
            players={players}
            value={search.player1 ?? ""}
            onChange={(id) => setSlot("player1", id)}
          />
          <PlayerSelect
            label="Select Player 2"
            players={players}
            value={search.player2 ?? ""}
            onChange={(id) => setSlot("player2", id)}
          />
        </div>

        {a?.player && b?.player ? (
          <Comparison a={a} b={b} />
        ) : (
          <p className="fm-panel mt-6 p-8 text-center text-sm text-muted-foreground">
            {left.isFetching || right.isFetching
              ? "Loading profiles…"
              : "Select two profiles above to start the comparison."}
          </p>
        )}
      </main>
    </div>
  );
}

function PlayerSelect({
  label,
  players,
  value,
  onChange,
}: {
  label: string;
  players: Player[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = players.find((p) => p.id === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? players.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.club.toLowerCase().includes(q) ||
            p.nationality.toLowerCase().includes(q),
        )
      : players;
    return base.slice(0, 60);
  }, [players, query]);

  return (
    <div className="fm-panel p-4">
      <p className="fm-label">{label}</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={selected ? selected.name : "Search by name, club or nation…"}
        className="mt-2 h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none focus:border-primary"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-border bg-input px-3 text-sm outline-none focus:border-primary"
      >
        <option value="">— None selected —</option>
        {selected && !matches.some((m) => m.id === selected.id) ? (
          <option value={selected.id}>{selected.name}</option>
        ) : null}
        {matches.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.club ? ` · ${p.club}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({ player }: { player: Player }) {
  if (player.status !== "Legend" && player.status !== "Icon") return null;
  const club = player.legendClubs[0];
  return (
    <span
      className={`rounded-sm border px-2 py-0.5 text-xs ${
        player.status === "Legend" ? "border-gold/40 text-gold" : "border-silver/40 text-silver"
      }`}
    >
      {player.status}
      {club ? ` · ${club}` : ""}
    </span>
  );
}

function Header({ detail }: { detail: PlayerDetail }) {
  const player = detail.player!;
  return (
    <div className="fm-panel flex flex-col items-center gap-3 p-5 text-center">
      <Avatar src={player.imageUrl} name={player.name} className="h-28 w-28 rounded-lg text-3xl" />
      <div className="flex items-center gap-2">
        <Flag src={player.flagUrl} nationality={player.nationality} />
        <span className="fm-label">{player.nationality || "—"}</span>
      </div>
      <h2 className="text-2xl font-bold uppercase leading-tight">{player.name}</h2>
      <p className="text-sm text-muted-foreground">
        {[player.role, player.club].filter(Boolean).join(" · ") || "—"}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        <StatusBadge player={player} />
        {player.gender ? (
          <span className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {player.gender}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface MetricRow {
  label: string;
  a: number;
  b: number;
}

function Comparison({ a, b }: { a: PlayerDetail; b: PlayerDetail }) {
  const pa = a.player!;
  const pb = b.player!;
  const gkA = isGoalkeeper(pa);
  const gkB = isGoalkeeper(pb);
  const bothGK = gkA && gkB;

  const trophyCount = (d: PlayerDetail) =>
    d.honours.filter((h) => h.kind === "player_trophy").reduce((n, h) => n + h.amount, 0);
  const awardCount = (d: PlayerDetail) =>
    d.honours.filter((h) => h.kind === "player_award").reduce((n, h) => n + h.amount, 0);

  const rows: MetricRow[] = [
    { label: "Total Appearances", a: a.totals.apps, b: b.totals.apps },
    bothGK
      ? { label: "Goals Conceded", a: a.totals.conceded, b: b.totals.conceded }
      : {
          label: "Total Goals",
          a: gkA ? a.totals.conceded : a.totals.goals,
          b: gkB ? b.totals.conceded : b.totals.goals,
        },
    { label: "Total Trophies", a: pa.trophies || trophyCount(a), b: pb.trophies || trophyCount(b) },
    { label: "Individual Awards", a: pa.awards || awardCount(a), b: pb.awards || awardCount(b) },
    { label: "Personal 1st", a: pa.milestones.first, b: pb.milestones.first },
    { label: "Personal 2nd", a: pa.milestones.second, b: pb.milestones.second },
    { label: "Personal 3rd", a: pa.milestones.third, b: pb.milestones.third },
    { label: "Team 1st", a: pa.teamMilestones.first, b: pb.teamMilestones.first },
    { label: "Team 2nd", a: pa.teamMilestones.second, b: pb.teamMilestones.second },
    { label: "Team 3rd", a: pa.teamMilestones.third, b: pb.teamMilestones.third },
    { label: "International Caps", a: pa.internationalApps, b: pb.internationalApps },
    { label: "International Goals", a: pa.internationalGoals, b: pb.internationalGoals },
  ];

  // For goalkeepers a lower conceded figure is the better result.
  const lowerIsBetter = (label: string) => label === "Goals Conceded";

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Header detail={a} />
        <Header detail={b} />
      </div>

      <section className="mt-4">
        <h3 className="fm-label">Core Metrics</h3>
        <div className="fm-panel mt-2 divide-y divide-border/60">
          {rows.map((row) => {
            const better = lowerIsBetter(row.label)
              ? row.a === row.b
                ? 0
                : row.a < row.b
                  ? -1
                  : 1
              : row.a === row.b
                ? 0
                : row.a > row.b
                  ? -1
                  : 1;
            return (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:grid-cols-3"
              >
                <StatBox value={row.a} win={better === -1} align="left" />
                <span className="fm-label text-center text-[0.65rem]">{row.label}</span>
                <StatBox value={row.b} win={better === 1} align="right" />
              </div>
            );
          })}
        </div>
      </section>

      <Accordion title="Career History Stints">
        <div className="grid gap-3 sm:grid-cols-2">
          <CareerColumn name={pa.name} rows={a.playerCareer} useConceded={gkA} />
          <CareerColumn name={pb.name} rows={b.playerCareer} useConceded={gkB} />
        </div>
      </Accordion>

      <Accordion title="Awards & Trophies Breakdown">
        <div className="grid gap-3 sm:grid-cols-2">
          <HonourColumn name={pa.name} honours={a.honours} />
          <HonourColumn name={pb.name} honours={b.honours} />
        </div>
      </Accordion>
    </>
  );
}

function StatBox({
  value,
  win,
  align,
}: {
  value: number;
  win: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={`rounded-md px-3 py-1.5 ${align === "right" ? "text-right" : "text-left"} ${
        win ? "bg-gold/10 text-gold" : "bg-panel text-foreground"
      }`}
    >
      <span className="fm-stat text-xl">{value}</span>
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="fm-panel flex w-full items-center justify-between px-4 py-3 text-left font-display text-sm uppercase tracking-widest transition-colors hover:text-primary"
      >
        {title}
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function CareerColumn({
  name,
  rows,
  useConceded,
}: {
  name: string;
  rows: CareerEntry[];
  useConceded: boolean;
}) {
  return (
    <div className="fm-panel p-4">
      <p className="fm-label">{name}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No records available.</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="fm-label px-1 py-1.5 text-left">Club</th>
              <th className="fm-label px-1 py-1.5 text-left">Years</th>
              <th className="fm-label px-1 py-1.5 text-right">Apps</th>
              <th className="fm-label px-1 py-1.5 text-right">
                {useConceded ? "Conc" : "Gls"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className="px-1 py-1.5">{r.team || "—"}</td>
                <td className="px-1 py-1.5 text-muted-foreground">{r.years || "—"}</td>
                <td className="fm-stat px-1 py-1.5 text-right">{r.apps}</td>
                <td className="fm-stat px-1 py-1.5 text-right text-primary">
                  {useConceded ? r.conceded ?? 0 : r.goals}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HonourColumn({ name, honours }: { name: string; honours: Honour[] }) {
  const groups = (kind: Honour["kind"]) => {
    const map = new Map<string, number>();
    for (const h of honours.filter((x) => x.kind === kind)) {
      const key = h.title || "Untitled";
      map.set(key, (map.get(key) ?? 0) + h.amount);
    }
    return Array.from(map.entries()).sort((x, y) => y[1] - x[1]);
  };
  const trophies = groups("player_trophy");
  const awards = groups("player_award");

  return (
    <div className="fm-panel p-4">
      <p className="fm-label">{name}</p>
      {[
        ["Team Trophies", trophies] as const,
        ["Individual Awards", awards] as const,
      ].map(([heading, items]) => (
        <div key={heading} className="mt-3">
          <p className="fm-label text-[0.6rem]">{heading}</p>
          {items.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Nothing recorded.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {items.map(([title, count]) => (
                <li key={title} className="flex items-center justify-between gap-3">
                  <span className="truncate">{title}</span>
                  <span className="fm-stat text-gold">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
