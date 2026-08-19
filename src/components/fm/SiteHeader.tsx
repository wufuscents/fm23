import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary font-display text-lg font-bold text-primary-foreground">
            FM
          </span>
          <span className="font-display text-xl font-semibold uppercase tracking-[0.18em]">
            Squad Archive
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-panel text-foreground" }}
            className="rounded-md px-3 py-1.5 font-display uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Directory
          </Link>
          <Link
            to="/leaderboards"
            activeProps={{ className: "bg-panel text-foreground" }}
            className="rounded-md px-3 py-1.5 font-display uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Hall of Fame
          </Link>
        </nav>
      </div>
    </header>
  );
}
