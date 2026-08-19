import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/fm/SiteHeader";
import { Avatar, Flag } from "@/components/fm/PlayerCard";
import { fetchDirectory, type Player } from "@/lib/fm";

const directoryQuery = queryOptions({
  queryKey: ["directory"],
  queryFn: fetchDirectory,
  staleTime: 60_000,
});

export const Route = createFileRoute("/leaderboards")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — Goals, Apps, Trophies & Awards Leaderboards" },
      {
        name: "description",
        content:
          "Live rankings of the greatest careers: top goalscorers, most appearances, most decorated and most individual awards.",
      },
      { property: "og:title", content: "Hall of Fame — Career Leaderboards" },
      {
        property: "og:description",
        content: "Ranked leaderboards for goals, appearances, trophies and individual awards.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(directoryQuery);
  },
  component: Leaderboards,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <p className="px-4 py-24 text-center text-sm text-muted-foreground" role="alert">
        {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <p className="px-4 py-24 text-center text-sm text-muted-foreground">No records found.</p>
    </div>
  ),
});

function Leaderboards() {
  const { data } = useSuspenseQuery(directoryQuery);
  const { players, counts } = data;
  const c = (id: string) => counts.get(id) ?? { trophies: 0, awards: 0 };

  const boards: { title: string; unit: string; rows: { p: Player; v: number }[] }[] = [
    {
      title: "Top Goalscorers",
      unit: "Goals",
      rows: players.map((p) => ({ p, v: p.goals })),
    },
    {
      title: "Most Appearances",
      unit: "Apps",
      rows: players.map((p) => ({ p, v: p.apps })),
    },
    {
      title: "Most Decorated",
      unit: "Trophies",
      rows: players.map((p) => ({ p, v: c(p.id).trophies })),
    },
    {
      title: "Most Individual Awards",
      unit: "Awards",
      rows: players.map((p) => ({ p, v: c(p.id).awards })),
    },
  ].map((b) => ({
    ...b,
    rows: b.rows.filter((r) => r.v > 0).sort((a, z) => z.v - a.v).slice(0, 15),
  }));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="fm-label">Records</p>
        <h1 className="mt-1 text-3xl font-bold uppercase sm:text-4xl">Hall of Fame</h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {boards.map((b) => (
            <section key={b.title} className="fm-panel overflow-hidden">
              <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
                <h2 className="text-lg font-semibold uppercase">{b.title}</h2>
                <span className="fm-label">{b.unit}</span>
              </header>
              {b.rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No data recorded.
                </p>
              ) : (
                <ol>
                  {b.rows.map((r, i) => (
                    <li key={r.p.id}>
                      <Link
                        to="/player/$id"
                        params={{ id: r.p.id }}
                        className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-0 hover:bg-panel"
                      >
                        <span
                          className={`fm-stat w-7 text-right text-lg ${
                            i === 0
                              ? "text-gold"
                              : i === 1
                                ? "text-silver"
                                : i === 2
                                  ? "text-bronze"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <Avatar
                          src={r.p.imageUrl}
                          name={r.p.name}
                          className="h-9 w-9 shrink-0 rounded-full text-xs"
                        />
                        <Flag src={r.p.flagUrl} nationality={r.p.nationality} />
                        <span className="truncate text-sm font-medium">{r.p.name}</span>
                        <span className="fm-stat ml-auto text-lg text-primary">{r.v}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
