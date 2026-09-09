import { Link } from "@tanstack/react-router";
import {
  ambientRadialGradient,
  getGenderBorderClass,
  getStatusBorderClass,
  useClubAndNationColors,
} from "@/lib/color-extract";
import { getAttributeColorClass } from "@/lib/fm-attributes";
import { num, storageUrl, str, type Player } from "@/lib/fm";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  className,
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "grid place-items-center overflow-hidden bg-panel font-display font-bold text-muted-foreground",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

export function Flag({ src, nationality }: { src?: string; nationality?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={nationality || "National flag"}
      className="h-4 w-6 rounded-[2px] object-cover shadow-sm"
    />
  );
}

export function PlayerCard({ player }: { player: Player }) {
  const clubLogoUrl = storageUrl(
    str(player.raw, ["club_logo_url", "team_logo_url", "current_club_logo", "logo_url"]),
  );
  const rating = num(player.raw, ["ca", "current_ability", "rating"]);
  const { clubColor, nationColor } = useClubAndNationColors(clubLogoUrl, player.flagUrl);

  return (
    <Link
      to="/player/$id"
      params={{ id: player.id }}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-slate-900/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
        getStatusBorderClass(player.status),
        getGenderBorderClass(player.gender),
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: ambientRadialGradient(clubColor, nationColor) }}
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag src={player.flagUrl} nationality={player.nationality} />
          {clubLogoUrl ? (
            <img
              src={clubLogoUrl}
              alt={player.club || "Club"}
              className="h-6 w-6 object-contain drop-shadow"
            />
          ) : null}
        </div>
        {player.role ? (
          <span className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-xs font-bold text-amber-400">
            {player.role}
          </span>
        ) : null}
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-3">
        <Avatar
          src={player.imageUrl}
          name={player.name}
          className="h-20 w-20 shrink-0 rounded-lg border border-slate-700/60 text-xl"
        />
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold uppercase text-slate-100">{player.name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-400">{player.club || player.nationality || "—"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {player.status ? (
              <span
                className={cn(
                  "inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  player.status.toLowerCase().startsWith("legend")
                    ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                    : player.status.toLowerCase().startsWith("icon")
                      ? "border-cyan-500/30 bg-cyan-500/20 text-cyan-300"
                      : "border-slate-600/50 bg-slate-800/60 text-slate-300",
                )}
              >
                {player.status}
              </span>
            ) : null}
            {rating > 0 ? (
              <span
                className={cn(
                  "inline-block rounded border px-1.5 py-0.5 font-mono text-[10px]",
                  getAttributeColorClass(rating),
                )}
              >
                {rating}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-4 gap-1 text-center">
        <MiniStat label="Apps" value={player.apps} />
        <MiniStat label="Goals" value={player.goals} />
        <MiniStat label="Trophies" value={player.trophies} />
        <MiniStat label="Awards" value={player.awards} />
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-700/50 bg-slate-950/40 px-1 py-1.5">
      <p className="fm-stat text-sm text-slate-100">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
