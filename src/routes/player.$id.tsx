import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/fm/SiteHeader";
import { Avatar, Flag } from "@/components/fm/PlayerCard";
import { fetchPlayerDetail, type CareerEntry, type Honour } from "@/lib/fm";

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: ["player", id],
    queryFn: () => fetchPlayerDetail(id),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/player/$id")({
  head: () => ({
    meta: [
      { title: "Player Profile — FM Squad Archive" },
      {
        name: "description",
        content:
          "Full career profile: club and coaching history, trophies, individual awards, milestones and biography.",
      },
      { property: "og:title", content: "Player Profile — FM Squad Archive" },
      {
        property: "og:description",
        content: "Career history, honours and milestones for this profile.",
      },
    ],
  }),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(detailQuery(params.id));
  },
  component: PlayerDetail,
  errorComponent: ({ error }) => <Shell>{error.message}</Shell>,
  notFoundComponent: () => <Shell>Player not found.</Shell>,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <p className="px-4 py-24 text-center text-sm text-muted-foreground" role="alert">
        {children}
      </p>
    </div>
  );
}

function isGoalkeeper(player: { role?: string } | null) {
  if (!player?.role) return false;
  const r = player.role.toLowerCase();
  return r.includes("goalkeeper") || r === "gk";
}

function PlayerDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(detailQuery(id));
  const { player, playerCareer, coachCareer, honours, totals, error } = data;
  const [tab, setTab] = useState<"trophies" | "awards">("trophies");
  const isGK = isGoalkeeper(player);

  if (error) return <Shell>Database read blocked: {error}</Shell>;
  if (!player) return <Shell>Player not found.</Shell>;

  const trophies = honours.filter((h) => h.kind === "player_trophy");
  const awards = honours.filter((h) => h.kind === "player_award");
  const sum = (rows: Honour[]) => rows.reduce((n, h) => n + h.amount, 0);
  const trophyCount = sum(trophies);
  const awardCount = sum(awards);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/" className="fm-label transition-colors hover:text-primary">
          ← Back to directory
        </Link>

        <section className="fm-panel mt-3 flex flex-col gap-5 p-5 sm:flex-row">
          <Avatar
            src={player.imageUrl}
            name={player.name}
            className="h-40 w-40 shrink-0 rounded-lg text-4xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Flag src={player.flagUrl} nationality={player.nationality} />
              <span className="fm-label">{player.nationality || "—"}</span>
            </div>
            <h1 className="mt-1 text-4xl font-bold uppercase">{player.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[player.role, player.club].filter(Boolean).join(" · ") || "—"}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {player.status === "Legend" || player.status === "Icon"
                ? player.legendClubs.map((c) => (
                    <span
                      key={`${player.status}-${c}`}
                      className={`rounded-sm border px-2 py-0.5 text-xs ${
                        player.status === "Legend"
                          ? "border-gold/40 text-gold"
                          : "border-silver/40 text-silver"
                      }`}
                    >
                      {player.status} · {c}
                    </span>
                  ))
                : null}
              {player.isHeadCoach ? (
                <span className="rounded-sm border border-accent/40 px-2 py-0.5 text-xs text-accent">
                  Head Coach
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid max-w-md grid-cols-4 gap-2 text-center">
              <Metric label="Caps" value={player.caps} />
              <Metric label="Apps" value={totals.apps} />
              <Metric label={isGK ? "Conc" : "Gls"} value={isGK ? totals.conceded : totals.goals} />
              <Metric label="Trophies" value={trophyCount} tone="gold" />
            </div>
          </div>
        </section>

        <section className="mt-4">
          <h2 className="fm-label">Milestones</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Medal label="Personal 1st" value={player.milestones.first} tone="text-gold" />
            <Medal label="Personal 2nd" value={player.milestones.second} tone="text-silver" />
            <Medal label="Personal 3rd" value={player.milestones.third} tone="text-bronze" />
            <Medal label="Team 1st" value={player.teamMilestones.first} tone="text-accent" />
            <Medal label="Team 2nd" value={player.teamMilestones.second} tone="text-silver" />
            <Medal label="Team 3rd" value={player.teamMilestones.third} tone="text-bronze" />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-2xl font-bold uppercase">Player Career</h2>
          <CareerTable rows={playerCareer} goalsLabel="Goals" showTotals />
        </section>

        {player.isHeadCoach || coachCareer.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-2xl font-bold uppercase">Coaching Career</h2>
            <CareerTable rows={coachCareer} goalsLabel="Wins" />
          </section>
        ) : null}

        <section className="mt-6">
          <div className="flex gap-2">
            {(
              [
                ["trophies", `Team Trophies (${trophyCount})`],
                ["awards", `Individual Awards (${awardCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1.5 font-display text-sm uppercase tracking-widest transition-colors ${
                  tab === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-panel text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <HonourList rows={tab === "trophies" ? trophies : awards} />
        </section>

        {player.biography ? (
          <section className="mt-6">
            <h2 className="text-2xl font-bold uppercase">Biography</h2>
            <div className="fm-panel mt-2 whitespace-pre-line p-5 text-sm leading-relaxed text-muted-foreground">
              {player.biography}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "gold" }) {
  return (
    <div className="rounded-md bg-panel p-2">
      <div className={`fm-stat text-2xl ${tone === "gold" ? "text-gold" : "text-foreground"}`}>
        {value}
      </div>
      <div className="fm-label text-[0.6rem]">{label}</div>
    </div>
  );
}

function Medal({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="fm-panel p-4">
      <div className={`fm-stat text-3xl ${tone}`}>{value}</div>
      <div className="fm-label mt-1">{label}</div>
    </div>
  );
}

function CareerTable({
  rows,
  goalsLabel,
  showTotals = false,
}: {
  rows: CareerEntry[];
  goalsLabel: string;
  showTotals?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="fm-panel mt-2 p-5 text-sm text-muted-foreground">No records available.</p>
    );
  }
  return (
    <div className="fm-panel mt-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="fm-label px-4 py-2 text-left">Club</th>
            <th className="fm-label px-4 py-2 text-left">Country</th>
            <th className="fm-label px-4 py-2 text-left">Years</th>
            <th className="fm-label px-4 py-2 text-right">Apps</th>
            <th className="fm-label px-4 py-2 text-right">{goalsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2">
                <span className="flex items-center gap-2">
                  {r.logoUrl ? (
                    <img
                      src={r.logoUrl}
                      alt=""
                      loading="lazy"
                      className="h-6 w-6 object-contain"
                    />
                  ) : null}
                  <span className="font-medium">{r.team || "—"}</span>
                </span>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{r.country || "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{r.years || "—"}</td>
              <td className="fm-stat px-4 py-2 text-right">{r.apps}</td>
              <td className="fm-stat px-4 py-2 text-right text-primary">{r.goals}</td>
            </tr>
          ))}
        </tbody>
        {showTotals ? (
          <tfoot>
            <tr className="border-t border-border">
              <td className="fm-label px-4 py-2" colSpan={3}>
                Total
              </td>
              <td className="fm-stat px-4 py-2 text-right">
                {rows.reduce((n, r) => n + r.apps, 0)}
              </td>
              <td className="fm-stat px-4 py-2 text-right text-primary">
                {rows.reduce((n, r) => n + r.goals, 0)}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function HonourList({ rows }: { rows: Honour[] }) {
  if (rows.length === 0) {
    return <p className="fm-panel mt-3 p-5 text-sm text-muted-foreground">Nothing recorded.</p>;
  }
  const grouped = new Map<string, Honour[]>();
  for (const h of rows) {
    const key = h.title || "Untitled";
    grouped.set(key, [...(grouped.get(key) ?? []), h]);
  }
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {Array.from(grouped.entries()).map(([title, items]) => (
        <div key={title} className="fm-panel flex items-center gap-3 p-3">
          <span className="fm-stat grid h-10 w-10 shrink-0 place-items-center rounded-full bg-panel text-lg text-gold">
            {items.reduce((n, i) => n + i.amount, 0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {Array.from(
                new Set(items.map((i) => [i.club, i.season].filter(Boolean).join(" "))),
              )
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
