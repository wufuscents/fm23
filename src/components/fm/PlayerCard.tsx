import { Link } from "@tanstack/react-router";
import type { HonourCounts, Player } from "@/lib/fm";

export function Avatar({
  src,
  name,
  className = "",
}: {
  src: string;
  name: string;
  className?: string;
}) {
  if (src) {
    return (
      <span className={`inline-block overflow-hidden bg-black/20 ${className}`}>
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="h-full w-full object-contain object-top"
        />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span
      className={`grid place-items-center bg-panel font-display font-bold text-muted-foreground ${className}`}
      aria-label={name}
    >
      {initials || "?"}
    </span>
  );
}

export function Flag({ src, nationality }: { src: string; nationality: string }) {
  if (!src) return null;
  return (
    <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full">
      <img
        src={src}
        alt={nationality ? `${nationality} flag` : "Flag"}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export function PlayerCard({
  player,
  counts,
}: {
  player: Player;
  counts?: HonourCounts;
}) {
  const trophies = player.trophies;
  const awards = player.awards;
  const isGK =
    player.role?.toLowerCase().includes("goalkeeper") || player.role === "GK";
  return (


    <Link
      to="/player/$id"
      params={{ id: player.id }}
      className="fm-panel group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-panel">
        <Avatar
          src={player.imageUrl}
          name={player.name}
          className="h-full w-full text-3xl transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div>
          <div className="flex items-center gap-2">
            <Flag src={player.flagUrl} nationality={player.nationality} />
            <h3 className="truncate text-base font-semibold">{player.name}</h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[player.role, player.club].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-md bg-panel/70 p-2 text-center">
          <Stat label="Apps" value={player.apps} />
          <Stat label={isGK ? "Conc" : "Gls"} value={isGK ? player.conceded ?? 0 : player.goals} />
          <Stat label="Trph" value={trophies} tone="gold" />
          <Stat label="Awd" value={awards} tone="primary" />
        </div>


        {player.status === "Legend" || player.status === "Icon" ? (
          <div className="flex flex-wrap gap-1">
            {player.legendClubs.slice(0, 3).map((c) => (
              <span
                key={c}
                className={`rounded-sm border px-1.5 py-0.5 text-[0.65rem] ${
                  player.status === "Legend"
                    ? "border-gold/40 text-gold"
                    : "border-silver/40 text-silver"
                }`}
              >
                {player.status} · {c}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "gold" | "primary";
}) {
  const color =
    tone === "gold" ? "text-gold" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div>
      <div className={`fm-stat text-lg ${color}`}>{value}</div>
      <div className="fm-label text-[0.6rem]">{label}</div>
    </div>
  );
}
