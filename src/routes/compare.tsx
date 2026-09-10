@@ -1,437 +1,161 @@
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
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'

export const Route = createFileRoute('/compare')({
  loader: async () => {
    let { data, error } = await supabase
      .from('player_directory_view')
      .select('*')

    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('players').select('*')
      data = fallback.data || []
    }

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
    return { players: (data || []) as Player[] }
  },
  component: ComparePage,
});

function isGoalkeeper(player: Player | null) {
  const r = player?.role?.toLowerCase() ?? "";
  return r.includes("goalkeeper") || r === "gk";
}
})

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
  const { players } = Route.useLoaderData()
  const [player1Id, setPlayer1Id] = useState<string>(players[0]?.id ? String(players[0].id) : '')
  const [player2Id, setPlayer2Id] = useState<string>(players[1]?.id ? String(players[1].id) : '')

function Comparison({ a, b }: { a: PlayerDetail; b: PlayerDetail }) {
  const pa = a.player!;
  const pb = b.player!;
  const gkA = isGoalkeeper(pa);
  const gkB = isGoalkeeper(pb);
  const bothGK = gkA && gkB;
  const p1 = useMemo(() => players.find((p) => String(p.id) === player1Id), [players, player1Id])
  const p2 = useMemo(() => players.find((p) => String(p.id) === player2Id), [players, player2Id])

  const trophyCount = (d: PlayerDetail) =>
    d.honours.filter((h) => h.kind === "player_trophy").reduce((n, h) => n + h.amount, 0);
  const awardCount = (d: PlayerDetail) =>
    d.honours.filter((h) => h.kind === "player_award").reduce((n, h) => n + h.amount, 0);
  const p1Img = p1?.image_url || p1?.photo_url || ''
  const p2Img = p2?.image_url || p2?.photo_url || ''

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
  const p1Flag = p1?.nationality_flag_url || p1?.nation_flag || null
  const p2Flag = p2?.nationality_flag_url || p2?.nation_flag || null

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-heading font-extrabold tracking-wider text-xl text-white">FM SQUAD ARCHIVE</span>
          </div>
          <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">
              DIRECTORY
            </Link>
            <Link to="/leaderboards" className="hover:text-white transition-colors">
              HALL OF FAME
            </Link>
            <Link to="/compare" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">
              COMPARE
            </Link>
          </nav>
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
        {/* Player Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Select Player 1</label>
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {players.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.name} ({p.nationality || p.nation || 'Global'})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Select Player 2</label>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {players.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.name} ({p.nationality || p.nation || 'Global'})
                </option>
              ))}
            </select>
          </div>
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
        {/* Comparison Layout */}
        {p1 && p2 && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-6 font-mono">
              {/* Player 1 Card */}
              <div className="text-center space-y-3">
                <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-2">
                  {p1Img ? (
                    <img src={storageUrl(p1Img)} alt={p1.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-slate-500 text-xs">NO IMAGE</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Flag url={p1Flag} name={p1.nationality || p1.nation} />
                  <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white uppercase">{p1.name}</h3>
                </div>
                <p className="text-xs text-slate-400">{p1.role || p1.positions_short || '-'}</p>
              </div>

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
              {/* Player 2 Card */}
              <div className="text-center space-y-3">
                <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-2">
                  {p2Img ? (
                    <img src={storageUrl(p2Img)} alt={p2.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-slate-500 text-xs">NO IMAGE</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Flag url={p2Flag} name={p2.nationality || p2.nation} />
                  <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white uppercase">{p2.name}</h3>
                </div>
                <p className="text-xs text-slate-400">{p2.role || p2.positions_short || '-'}</p>
              </div>
            </div>

            {/* Stat Rows */}
            <div className="mt-8 divide-y divide-slate-800/80 font-mono text-sm">
              {[
                { label: 'Appearances', key: 'apps' },
                { label: 'Goals', key: 'goals' },
                { label: 'Trophies', key: 'trophies' },
                { label: 'Awards', key: 'awards' },
                { label: 'Personal 1st', key: 'personal_1st' },
                { label: 'Team 1st', key: 'team_1st' },
              ].map(({ label, key }) => {
                const val1 = Number(p1[key as keyof Player] || 0)
                const val2 = Number(p2[key as keyof Player] || 0)

                return (
                  <div key={key} className="py-3 grid grid-cols-3 items-center text-center">
                    <span className={`font-extrabold ${val1 > val2 ? 'text-emerald-400 text-base' : 'text-slate-300'}`}>
                      {val1}
                    </span>
                    <span className="text-xs uppercase text-slate-500 font-bold">{label}</span>
                    <span className={`font-extrabold ${val2 > val1 ? 'text-emerald-400 text-base' : 'text-slate-300'}`}>
                      {val2}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  )
}
