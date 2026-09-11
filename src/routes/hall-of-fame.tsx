import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'

export const Route = createFileRoute('/hall-of-fame')({
  loader: async () => {
    let { data, error } = await supabase.from('player_directory_view').select('*')
    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('players').select('*')
      data = fallback.data || []
    }
    return { players: (data || []) as Player[] }
  },
  component: HallOfFamePage,
})

type Category = 'legends' | 'icons'

type StatusKind = 'legend' | 'icon' | 'other'

function statusKind(player: Player): StatusKind {
  const value = String((player as any).status || '').trim().toLowerCase()
  if (value.includes('legend')) return 'legend'
  if (value.includes('icon')) return 'icon'
  return 'other'
}

function numeric(player: Player, key: string): number {
  return Number((player as any)[key] ?? 0)
}

function PlayerPortrait({ player, className }: { player: Player; className: string }) {
  const image = String((player as any).image_url || (player as any).photo_url || '')
  return (
    <div className={`overflow-hidden bg-slate-950 ${className}`}>
      {image ? (
        <img src={storageUrl(image)} alt={player.name} className="h-full w-full object-contain" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[8px] uppercase tracking-widest text-slate-700">
          No Portrait
        </div>
      )}
    </div>
  )
}

function FeaturedMember({ player, rank, featuredLabel }: { player: Player; rank: number; featuredLabel: string }) {
  const kind = statusKind(player)
  const isLegend = kind === 'legend'
  const accent = isLegend ? '#fbbf24' : '#cbd5e1'
  const nation = String((player as any).nationality || (player as any).nation || 'Unknown')
  const flag = String((player as any).nationality_flag_url || (player as any).nation_flag || '')
  const trophies = numeric(player, 'trophies')
  const goals = numeric(player, 'goals')
  const assists = numeric(player, 'assists')

  return (
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className="group relative flex min-h-[318px] flex-col overflow-hidden rounded-xl border bg-[#0a1220] p-5 transition-all duration-300 hover:-translate-y-1"
      style={{ borderColor: `${accent}35`, boxShadow: `inset 0 1px 0 ${accent}15` }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.055),transparent_42%)]"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.25em] text-slate-600">Rank</div>
          <div className="mt-0.5 font-display text-3xl font-black" style={{ color: accent }}>
            {rank}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: accent }}>
            Featured Legacy
          </div>
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">
            File / {featuredLabel}
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center py-5 text-center">
        <div
          className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-slate-950 p-1.5"
          style={{ borderColor: `${accent}38` }}
        >
          <PlayerPortrait player={player} className="h-full w-full rounded-md" />
        </div>

        <h3 className="mt-4 min-h-[3.75rem] max-w-full font-display text-2xl font-black uppercase leading-tight tracking-wide text-white transition-colors group-hover:text-amber-200">
          {player.name}
        </h3>

        <div className="mt-2 flex min-h-[24px] items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
          <span style={{ color: accent }}>{isLegend ? 'LEGEND' : 'ICON'}</span>
          <span className="text-slate-700">•</span>
          {flag ? <Flag url={flag} name={nation} /> : null}
          <span>{nation}</span>
        </div>
      </div>

      <div className="relative grid grid-cols-3 border-t border-white/5 pt-3 text-center font-mono">
        <MuseumStat label="TROPHIES" value={trophies} />
        <MuseumStat label="GOALS" value={goals} />
        <MuseumStat label="G+A" value={goals + assists} />
      </div>
    </Link>
  )
}

function MuseumStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-lg font-black text-white">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[7px] uppercase tracking-[0.2em] text-slate-600">{label}</div>
    </div>
  )
}

function CollectionCard({ player, rank, category }: { player: Player; rank: number; category: Category }) {
  const kind = statusKind(player)
  const isLegend = kind === 'legend'
  const accent = isLegend ? '#fbbf24' : '#cbd5e1'
  const nation = String((player as any).nationality || (player as any).nation || 'Unknown')
  const flag = String((player as any).nationality_flag_url || (player as any).nation_flag || '')

  return (
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className="group relative flex overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition-all duration-300 hover:border-slate-600 hover:bg-slate-900/80"
    >
      <div className="mr-3 flex w-8 shrink-0 flex-col items-center justify-between py-1">
        <span className="font-mono text-[8px] uppercase tracking-widest text-slate-600">#{rank}</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
      </div>

      <PlayerPortrait
        player={player}
        className="h-16 w-16 shrink-0 rounded-md border border-white/5 p-1"
      />

      <div className="ml-3 min-w-0 flex-1 self-center">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-bold uppercase tracking-wide text-white group-hover:text-amber-200">
            {player.name}
          </h3>
          {flag ? <Flag url={flag} name={nation} /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">
          <span style={{ color: accent }}>{isLegend ? 'LEGEND' : category === 'icons' ? 'ICON' : 'ARCHIVE'}</span>
          <span>•</span>
          <span>{nation}</span>
        </div>
      </div>

      <div className="self-center pl-3 text-right">
        <div className="font-display text-xl font-black text-white">{numeric(player, 'trophies').toLocaleString()}</div>
        <div className="font-mono text-[7px] uppercase tracking-[0.18em] text-slate-600">TROPHIES</div>
      </div>
    </Link>
  )
}

function HallOfFamePage() {
  const { players } = Route.useLoaderData()
  const [category, setCategory] = useState<Category>('legends')

  const legends = useMemo(
    () =>
      players
        .filter((player) => statusKind(player) === 'legend')
        .sort(
          (a, b) =>
            numeric(b, 'trophies') - numeric(a, 'trophies') ||
            numeric(b, 'goals') - numeric(a, 'goals') ||
            numeric(b, 'assists') - numeric(a, 'assists'),
        ),
    [players],
  )

  const icons = useMemo(
    () =>
      players
        .filter((player) => statusKind(player) === 'icon')
        .sort(
          (a, b) =>
            numeric(b, 'trophies') - numeric(a, 'trophies') ||
            numeric(b, 'goals') - numeric(a, 'goals') ||
            numeric(b, 'assists') - numeric(a, 'assists'),
        ),
    [players],
  )

  const featured = legends.slice(0, 3)
  const activeCollection = category === 'legends' ? legends : icons

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-slate-800 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="font-heading text-xl font-extrabold tracking-wider text-white">FM SQUAD ARCHIVE</span>
              </div>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
                Football museum • legacy collection
              </p>
            </div>

            <nav className="flex items-center gap-5 overflow-x-auto whitespace-nowrap font-mono text-xs uppercase tracking-widest text-slate-400">
              <Link to="/" className="transition-colors hover:text-white">DIRECTORY</Link>
              <Link
                to="/hall-of-fame"
                activeProps={{ className: 'text-amber-300 font-bold border-b-2 border-amber-300 pb-1' }}
                className="transition-colors hover:text-white"
              >
                HALL OF FAME
              </Link>
              <Link to="/leaderboards" className="transition-colors hover:text-white">RECORDS</Link>
              <Link to="/compare" className="transition-colors hover:text-white">COMPARE</Link>
            </nav>
          </div>
        </header>
        <section className="relative overflow-hidden border border-amber-400/20 bg-[linear-gradient(135deg,rgba(22,18,10,0.98),rgba(10,16,28,0.98))] p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(251,191,36,0.10),transparent_36%),radial-gradient(circle_at_85%_100%,rgba(148,163,184,0.05),transparent_35%)]" />
          <div className="relative max-w-4xl">
            <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-amber-400">Permanent Collection / 06</div>
            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[0.02em] text-white sm:text-6xl">
              Hall of Fame
            </h1>
            <p className="mt-3 max-w-3xl font-mono text-xs leading-relaxed text-slate-500 sm:text-sm">
              The museum floor of FM Squad Archive. Legends and Icons are preserved here as permanent members of football history — separate from the live statistical records room.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-amber-400/20 bg-slate-900/60 p-5">
            <div className="font-display text-3xl font-black text-amber-300">{legends.length.toLocaleString()}</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-slate-600">LEGENDS</div>
          </div>
          <div className="border border-slate-300/15 bg-slate-900/60 p-5">
            <div className="font-display text-3xl font-black text-slate-100">{icons.length.toLocaleString()}</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-slate-600">ICONS</div>
          </div>
          <div className="border border-slate-800 bg-slate-900/60 p-5">
            <div className="font-display text-3xl font-black text-white">{players.length.toLocaleString()}</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-slate-600">DATABASE MEMBERS</div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="border border-slate-800 bg-slate-900/55 p-4 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400">Curator Selection</div>
                <h2 className="mt-1 font-display text-3xl font-black uppercase tracking-wide text-white">Featured Members</h2>
              </div>
              <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-slate-600">Three highlighted legacy files</div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {featured.map((player, index) => (
                <FeaturedMember
                  key={player.id}
                  player={player}
                  rank={index + 1}
                  featuredLabel={index === 0 ? 'Featured legacy / I' : `Featured legacy / ${index + 1}`}
                />
              ))}
            </div>
          </section>
        )}

        <section className="border border-slate-800 bg-slate-900/55 p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-slate-600">Permanent Collections</div>
              <h2 className="mt-1 font-display text-3xl font-black uppercase tracking-wide text-white">Legacy Wing</h2>
              <p className="mt-1 font-mono text-[10px] text-slate-600">Browse the museum by official legacy classification.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('legends')}
                className={`border px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${
                  category === 'legends'
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                    : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-white'
                }`}
              >
                Legends
              </button>
              <button
                type="button"
                onClick={() => setCategory('icons')}
                className={`border px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${
                  category === 'icons'
                    ? 'border-slate-300/30 bg-slate-200/10 text-slate-100'
                    : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-white'
                }`}
              >
                Icons
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 xl:grid-cols-2">
            {activeCollection.length === 0 ? (
              <div className="xl:col-span-2 border border-dashed border-slate-800 py-14 text-center font-mono text-xs uppercase tracking-widest text-slate-600">
                No members in this collection.
              </div>
            ) : (
              activeCollection.slice(0, 50).map((player, index) => (
                <CollectionCard key={player.id} player={player} rank={index + 1} category={category} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
