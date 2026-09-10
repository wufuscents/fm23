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

type Category = 'legends' | 'icons' | 'decorated'

function statusKind(player: Player) {
  const value = String((player as any).status || '').trim().toLowerCase()
  if (value.includes('legend')) return 'legend'
  if (value.includes('icon')) return 'icon'
  return 'other'
}

function numeric(player: Player, key: string) {
  return Number((player as any)[key] ?? 0)
}

function HallPlayerCard({ player, rank, category }: { player: Player; rank: number; category: Category }) {
  const kind = statusKind(player)
  const accent = kind === 'legend' ? '#fbbf24' : '#cbd5e1'
  const nation = String((player as any).nationality || (player as any).nation || 'Unknown')
  const flag = String((player as any).nationality_flag_url || (player as any).nation_flag || '')
  const image = String((player as any).image_url || (player as any).photo_url || '')
  const label = category === 'decorated' ? 'TROPHIES' : kind === 'legend' ? 'LEGEND' : 'ICON'

  return (
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className="group relative block overflow-hidden rounded-2xl border bg-slate-900/75 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900"
      style={{ borderColor: `${accent}38`, boxShadow: `inset 3px 0 0 ${accent}cc` }}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20" style={{ backgroundColor: accent }} />
      <div className="relative flex items-center gap-4">
        <div className="w-10 shrink-0 text-center font-heading text-2xl font-black" style={{ color: rank <= 3 ? accent : '#64748b' }}>
          {rank}
        </div>
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-1">
          {image ? <img src={storageUrl(image)} alt="" className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center font-mono text-[8px] text-slate-600">NO IMG</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-heading text-xl font-extrabold uppercase tracking-wide text-white group-hover:text-amber-300">{player.name}</h3>
            {flag && <Flag url={flag} alt={nation} />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
            <span style={{ color: accent }}>{kind === 'legend' ? 'LEGEND' : kind === 'icon' ? 'ICON' : 'ARCHIVE MEMBER'}</span>
            <span>•</span>
            <span>{nation}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-heading text-2xl font-black text-white">{numeric(player, 'trophies').toLocaleString()}</div>
          <div className="font-mono text-[8px] uppercase tracking-widest" style={{ color: accent }}>{label}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/5 pt-3 text-center font-mono">
        <MiniStat label="APPS" value={numeric(player, 'apps')} />
        <MiniStat label="GOALS" value={numeric(player, 'goals')} />
        <MiniStat label="ASSISTS" value={numeric(player, 'assists')} />
        <MiniStat label="G+A" value={numeric(player, 'goals') + numeric(player, 'assists')} />
      </div>
    </Link>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div><div className="text-sm font-bold text-slate-200">{value.toLocaleString()}</div><div className="mt-0.5 text-[7px] uppercase tracking-widest text-slate-600">{label}</div></div>
}

function HallOfFamePage() {
  const { players } = Route.useLoaderData()
  const [category, setCategory] = useState<Category>('legends')

  const legends = useMemo(() => players.filter((p) => statusKind(p) === 'legend').sort((a, b) => numeric(b, 'trophies') - numeric(a, 'trophies') || numeric(b, 'goals') - numeric(a, 'goals')), [players])
  const icons = useMemo(() => players.filter((p) => statusKind(p) === 'icon').sort((a, b) => numeric(b, 'trophies') - numeric(a, 'trophies') || numeric(b, 'goals') - numeric(a, 'goals')), [players])
  const decorated = useMemo(() => players.filter((p) => statusKind(p) === 'legend' || statusKind(p) === 'icon').sort((a, b) => numeric(b, 'trophies') - numeric(a, 'trophies') || numeric(b, 'goals') - numeric(a, 'goals')), [players])

  const ranked = category === 'legends' ? legends : category === 'icons' ? icons : decorated
  const featured = legends[0]
  const legendCount = legends.length
  const iconCount = icons.length

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400">FM SQUAD ARCHIVE</div>
            <h1 className="mt-2 font-heading text-5xl font-black uppercase tracking-widest text-white sm:text-6xl">Hall of Fame</h1>
            <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-slate-500">The museum floor of the archive — a dedicated home for Legends, Icons, and the players whose legacy earned a permanent place in history.</p>
          </div>
          <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Link to="/" className="rounded-lg border border-slate-800 px-3 py-2 text-slate-400 hover:border-slate-700 hover:text-white">Directory</Link>
            <Link to="/leaderboards" className="rounded-lg border border-slate-800 px-3 py-2 text-slate-400 hover:border-slate-700 hover:text-white">Records</Link>
            <Link to="/compare" className="rounded-lg border border-slate-800 px-3 py-2 text-slate-400 hover:border-slate-700 hover:text-white">Compare</Link>
          </nav>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="ARCHIVED PLAYERS" value={players.length} accent="#34d399" />
          <StatTile label="LEGENDS" value={legendCount} accent="#fbbf24" />
          <StatTile label="ICONS" value={iconCount} accent="#cbd5e1" />
        </section>

        {featured && (
          <Link to="/player/$id" params={{ id: String(featured.id) }} className="group relative block overflow-hidden rounded-2xl border border-amber-400/25 bg-slate-900/75 p-5 transition-all hover:border-amber-400/45 sm:p-7">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative grid grid-cols-1 items-center gap-5 lg:grid-cols-[110px_100px_1fr_auto]">
              <div className="text-center font-heading text-5xl font-black text-amber-300">#1</div>
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-amber-400/35 bg-slate-950 p-1 lg:mx-0">
                {(featured as any).image_url ? <img src={storageUrl(String((featured as any).image_url))} alt="" className="h-full w-full object-contain" /> : null}
              </div>
              <div className="min-w-0 text-center lg:text-left">
                <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber-400">THE HALL'S CURRENT CROWN</div>
                <h2 className="mt-1 font-heading text-3xl font-black uppercase tracking-wide text-white group-hover:text-amber-300 sm:text-4xl">{featured.name}</h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500 lg:justify-start">
                  <span className="text-amber-300">LEGEND</span><span>•</span><span>{String((featured as any).nationality || 'Unknown')}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <FeatureStat label="TROPHIES" value={numeric(featured, 'trophies')} />
                <FeatureStat label="GOALS" value={numeric(featured, 'goals')} />
                <FeatureStat label="G+A" value={numeric(featured, 'goals') + numeric(featured, 'assists')} />
              </div>
            </div>
          </Link>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-slate-500">Museum Collections</div>
              <h2 className="mt-1 font-heading text-2xl font-black uppercase tracking-wide text-white">Legacy Archive</h2>
              <p className="mt-1 font-mono text-[10px] text-slate-600">Records belong in Records. This floor is reserved for legacy status.</p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase">
              {([['legends', 'Legends'], ['icons', 'Icons'], ['decorated', 'Most Decorated Hall Members']] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setCategory(key)} className={`rounded-lg border px-3 py-2 font-bold transition-all ${category === key ? 'border-amber-400/60 bg-amber-400 text-slate-950' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {ranked.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center font-mono text-xs uppercase tracking-widest text-slate-600">No members in this collection.</div>
            ) : ranked.slice(0, 50).map((player, index) => <HallPlayerCard key={player.id} player={player} rank={index + 1} category={category} />)}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5"><div className="font-heading text-3xl font-black" style={{ color: accent }}>{value.toLocaleString()}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-600">{label}</div></div>
}

function FeatureStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3"><div className="font-heading text-xl font-black text-white">{value.toLocaleString()}</div><div className="mt-1 text-[7px] uppercase tracking-widest text-slate-600">{label}</div></div>
}
