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

    const awardRows: Array<{ player_id: string | null; name: string | null; amount: number | null }> = []
    const pageSize = 1000
    let from = 0

    while (true) {
      const { data: page, error: awardsError } = await supabase
        .from('awards_and_trophies')
        .select('player_id, name, amount')
        .range(from, from + pageSize - 1)

      if (awardsError || !page || page.length === 0) break
      awardRows.push(...page)
      if (page.length < pageSize) break
      from += pageSize
    }

    const ballonDorCounts: Record<string, number> = {}
    for (const award of awardRows) {
      const awardName = String(award.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’'`]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

      if (awardName.includes('ballon dor')) {
        const playerId = String(award.player_id || '')
        if (playerId) {
          ballonDorCounts[playerId] = (ballonDorCounts[playerId] || 0) + Number(award.amount || 1)
        }
      }
    }

    return { players: (data || []) as Player[], ballonDorCounts }
  },
  component: HallOfFamePage,
})

type Category =
  | 'legends'
  | 'icons'
  | 'trophies'
  | 'goals'
  | 'assists'
  | 'ga'
  | 'gpg'
  | 'goals_per_100'
  | 'assists_per_100'
  | 'ga_per_100'
  | 'ballon_dor'
  | 'awards'
  | 'goat'

type CategoryMeta = { key: Category; label: string; shortLabel: string; accent: string }

const categories: CategoryMeta[] = [
  { key: 'legends', label: 'Legends', shortLabel: 'Legends', accent: '#fbbf24' },
  { key: 'icons', label: 'Icons', shortLabel: 'Icons', accent: '#cbd5e1' },
  { key: 'trophies', label: 'Most Decorated', shortLabel: 'Trophies', accent: '#fbbf24' },
  { key: 'goals', label: 'Most Goals', shortLabel: 'Goals', accent: '#34d399' },
  { key: 'assists', label: 'Most Assists', shortLabel: 'Assists', accent: '#60a5fa' },
  { key: 'ga', label: 'Most G+A', shortLabel: 'G+A', accent: '#a78bfa' },
  { key: 'gpg', label: 'Best G/GM', shortLabel: 'G/GM', accent: '#fb7185' },
  { key: 'goals_per_100', label: 'Goals / 100 Apps', shortLabel: 'G / 100', accent: '#34d399' },
  { key: 'assists_per_100', label: 'Assists / 100 Apps', shortLabel: 'A / 100', accent: '#60a5fa' },
  { key: 'ga_per_100', label: 'G+A / 100 Apps', shortLabel: 'G+A / 100', accent: '#a78bfa' },
  { key: 'ballon_dor', label: "Most Ballon d'Ors", shortLabel: "Ballon d'Or", accent: '#fbbf24' },
  { key: 'awards', label: 'Most Awards', shortLabel: 'Awards', accent: '#c084fc' },
  { key: 'goat', label: 'GOAT Score', shortLabel: 'GOAT', accent: '#f59e0b' },
]

function statusKind(player: Player): 'legend' | 'icon' | 'other' {
  const value = String((player as any).status || '').trim().toLowerCase()
  if (value.includes('legend')) return 'legend'
  if (value.includes('icon')) return 'icon'
  return 'other'
}

function numeric(player: Player, field: string) {
  return Number((player as any)[field] ?? 0)
}

function metricValue(player: Player, category: Category, ballonDorCounts: Record<string, number>) {
  const apps = numeric(player, 'apps')
  const goals = numeric(player, 'goals')
  const assists = numeric(player, 'assists')

  if (category === 'trophies') return numeric(player, 'trophies')
  if (category === 'goals') return goals
  if (category === 'assists') return assists
  if (category === 'ga') return goals + assists
  if (category === 'gpg') return apps > 0 ? goals / apps : 0
  if (category === 'goals_per_100') return apps > 0 ? (goals / apps) * 100 : 0
  if (category === 'assists_per_100') return apps > 0 ? (assists / apps) * 100 : 0
  if (category === 'ga_per_100') return apps > 0 ? ((goals + assists) / apps) * 100 : 0
  if (category === 'ballon_dor') return ballonDorCounts[String(player.id)] || 0
  if (category === 'awards') return numeric(player, 'awards')
  return 0
}

function normalize(value: number, max: number) {
  return max > 0 ? value / max : 0
}

function goatScore(player: Player, players: Player[], ballonDorCounts: Record<string, number>) {
  const weighted: Array<[Category, number]> = [
    ['trophies', 25],
    ['goals', 20],
    ['assists', 20],
    ['awards', 15],
    ['ballon_dor', 5],
    ['goat', 0],
  ]

  let score = 0
  const appsMax = Math.max(...players.map((p) => numeric(p, 'apps')), 0)
  score += normalize(numeric(player, 'apps'), appsMax) * 10

  for (const [category, weight] of weighted) {
    if (weight === 0) continue
    const max = Math.max(...players.map((p) => metricValue(p, category, ballonDorCounts)), 0)
    score += normalize(metricValue(player, category, ballonDorCounts), max) * weight
  }

  const status = String((player as any).status ?? '').toLowerCase()
  const legacy = status.includes('legend') ? 1 : status.includes('icon') ? 0.75 : 0
  return score + legacy * 5
}

function valueFor(player: Player, category: Category, players: Player[], ballonDorCounts: Record<string, number>) {
  return category === 'goat' ? goatScore(player, players, ballonDorCounts) : metricValue(player, category, ballonDorCounts)
}

function formatValue(value: number, category: Category) {
  if (['gpg', 'goals_per_100', 'assists_per_100', 'ga_per_100', 'goat'].includes(category)) return value.toFixed(2)
  return value.toLocaleString()
}

function categoryMeta(category: Category) {
  return categories.find((item) => item.key === category) || categories[0]
}

function HallPlayerCard({
  player,
  rank,
  category,
  value,
  ballonDorCounts,
  players,
}: {
  player: Player
  rank: number
  category: Category
  value: number
  ballonDorCounts: Record<string, number>
  players: Player[]
}) {
  const kind = statusKind(player)
  const meta = categoryMeta(category)
  const nation = String((player as any).nationality || (player as any).nation || 'Unknown')
  const flag = String((player as any).nationality_flag_url || (player as any).nation_flag || '')
  const goals = numeric(player, 'goals')
  const assists = numeric(player, 'assists')
  const ga = goals + assists
  const trophies = numeric(player, 'trophies')
  const ballonDors = ballonDorCounts[String(player.id)] || 0
  const image = String((player as any).image_url || (player as any).photo_url || '')
  const statusColor = kind === 'legend' ? '#fbbf24' : kind === 'icon' ? '#cbd5e1' : '#64748b'

  return (
    <Link to="/player/$id" params={{ id: String(player.id) }} className="group block">
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-900"
        style={{ boxShadow: `0 0 35px ${meta.accent}08` }}
      >
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: meta.accent }} />
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-7 shrink-0 text-center font-heading text-xl font-black sm:w-9 sm:text-2xl" style={{ color: rank <= 3 ? meta.accent : '#64748b' }}>
            {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
          </div>
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-1 sm:h-16 sm:w-16">
            {image ? <img src={storageUrl(image)} alt={player.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" /> : <span className="flex h-full items-center justify-center text-[8px] font-mono text-slate-600">NO IMG</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate font-heading text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">{player.name}</h3>
              <Flag url={flag} name={nation} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-widest sm:text-[9px]">
              <span className="rounded border px-1.5 py-0.5 font-bold" style={{ borderColor: `${statusColor}66`, color: statusColor, backgroundColor: `${statusColor}10` }}>
                {kind === 'other' ? String((player as any).status || 'PLAYER') : kind}
              </span>
              <span className="text-slate-500">{nation}</span>
            </div>
          </div>
          <div className="hidden min-w-20 text-right font-mono sm:block">
            <div className="text-2xl font-black" style={{ color: meta.accent }}>{formatValue(value, category)}</div>
            <div className="text-[8px] uppercase tracking-widest text-slate-600">{meta.shortLabel}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5 border-t border-slate-800 pt-3 text-center font-mono">
          <Stat label="Goals" value={goals} />
          <Stat label="Assists" value={assists} />
          <Stat label="G+A" value={ga} />
          <Stat label="Trophies" value={trophies} />
        </div>

        <div className="mt-2 flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-slate-600">
          <span>{ballonDors} Ballon d'Or</span>
          <span>{numeric(player, 'awards')} Awards</span>
        </div>
      </div>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-sm font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-[7px] uppercase tracking-widest text-slate-600">{label}</div>
    </div>
  )
}

function HallOfFamePage() {
  const { players, ballonDorCounts } = Route.useLoaderData()
  const [category, setCategory] = useState<Category>('legends')

  const ranked = useMemo(() => {
    if (category === 'legends' || category === 'icons') {
      const target = category === 'legends' ? 'legend' : 'icon'
      return players
        .filter((p) => statusKind(p) === target)
        .sort((a, b) => numeric(b, 'trophies') - numeric(a, 'trophies') || numeric(b, 'goals') - numeric(a, 'goals'))
        .slice(0, 50)
    }

    return [...players]
      .sort((a, b) => valueFor(b, category, players, ballonDorCounts) - valueFor(a, category, players, ballonDorCounts))
      .slice(0, 50)
  }, [players, category, ballonDorCounts])

  const podium = ranked.slice(0, 3)
  const meta = categoryMeta(category)
  const leader = podium[0]
  const leaderValue = leader ? valueFor(leader, category, players, ballonDorCounts) : 0
  const legendCount = players.filter((p) => statusKind(p) === 'legend').length
  const iconCount = players.filter((p) => statusKind(p) === 'icon').length

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400">FM SQUAD ARCHIVE</div>
            <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-widest text-white sm:text-6xl">Hall of Fame</h1>
            <p className="mt-2 max-w-3xl font-mono text-xs leading-relaxed text-slate-500">The museum floor of the archive — legends, icons, statistical records, honours, and the players who define the database.</p>
          </div>
          <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Link to="/" className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-white">Directory</Link>
            <Link to="/hall-of-fame" className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-bold text-amber-300">Hall of Fame</Link>
            <Link to="/leaderboards" className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-white">Records</Link>
            <Link to="/compare" className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-white">Compare</Link>
          </nav>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ArchiveStat label="Archived Players" value={players.length} />
          <ArchiveStat label="Legends" value={legendCount} accent="amber" />
          <ArchiveStat label="Icons" value={iconCount} accent="silver" />
          <Link to="/leaderboards" className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-400/40">
            <div className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">Advanced Records</div>
            <div className="mt-1 font-heading text-lg font-black uppercase text-white">Open Records →</div>
          </Link>
        </section>

        {leader && (
          <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-slate-900/80 p-5 shadow-[0_0_50px_rgba(251,191,36,0.05)] sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-emerald-400/5" />
            <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="font-heading text-4xl font-black text-amber-300">🥇</div>
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-amber-400/30 bg-slate-950 p-1 sm:h-24 sm:w-24">
                  {(leader as any).image_url ? <img src={storageUrl((leader as any).image_url)} alt={leader.name} className="h-full w-full object-contain" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber-400">Current No. 1 • {meta.label}</div>
                  <Link to="/player/$id" params={{ id: String(leader.id) }} className="mt-1 block truncate font-heading text-2xl font-black uppercase tracking-wide text-white hover:text-emerald-400 sm:text-3xl">{leader.name}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                    <Flag url={(leader as any).nationality_flag_url || (leader as any).nation_flag || null} name={(leader as any).nationality || (leader as any).nation || 'Global'} />
                    <span>{(leader as any).nationality || (leader as any).nation || 'Global'}</span>
                    <span>•</span>
                    <span>{String((leader as any).status || 'PLAYER')}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center font-mono md:min-w-[440px]">
                <MiniStat label="Trophies" value={numeric(leader, 'trophies')} />
                <MiniStat label="G+A" value={numeric(leader, 'goals') + numeric(leader, 'assists')} />
                <MiniStat label="Ballon d'Or" value={ballonDorCounts[String(leader.id)] || 0} />
                <MiniStat label={meta.shortLabel} value={leaderValue} accent />
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber-400">Museum Collections</div>
              <h2 className="mt-1 font-heading text-2xl font-black uppercase tracking-wide text-white">Archive Rankings</h2>
            </div>
            <div className="hidden font-mono text-[9px] uppercase tracking-widest text-slate-600 sm:block">Top 50 • Live database</div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                className={`rounded-lg border px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-widest transition-all ${
                  category === item.key
                    ? 'border-amber-400/60 bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/10'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {category === 'goat' && (
            <div className="mt-4 rounded-xl border border-amber-400/15 bg-slate-950/50 p-4 font-mono text-[9px] leading-relaxed text-slate-500">
              <span className="font-bold text-amber-300">GOAT SCORE:</span> Apps 10% • Goals 20% • Assists 20% • Trophies 25% • Awards 15% • Ballon d'Or 5% • Status/Legacy 5%. Legend = 100% of the legacy component, Icon = 75%, other status = 0%. Statistical categories are normalized against the strongest player in the current archive.
            </div>
          )}

          <div className="mt-5 space-y-3">
            {ranked.map((player, index) => (
              <HallPlayerCard
                key={player.id}
                player={player}
                rank={index + 1}
                category={category}
                value={valueFor(player, category, players, ballonDorCounts)}
                ballonDorCounts={ballonDorCounts}
                players={players}
              />
            ))}
            {ranked.length === 0 && <div className="rounded-xl border border-dashed border-slate-800 py-16 text-center font-mono text-xs text-slate-600">No archive records found for this collection.</div>}
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-900 pt-2 font-mono text-[9px] uppercase tracking-widest text-slate-700 sm:flex-row sm:justify-between">
          <span>FM SQUAD ARCHIVE • HALL OF FAME</span>
          <Link to="/leaderboards" className="text-slate-500 hover:text-white">Need the full statistical board? Open Records →</Link>
        </div>
      </div>
    </div>
  )
}

function ArchiveStat({ label, value, accent = 'green' }: { label: string; value: number; accent?: 'green' | 'amber' | 'silver' }) {
  const text = accent === 'amber' ? 'text-amber-300' : accent === 'silver' ? 'text-slate-200' : 'text-emerald-300'
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className={`font-heading text-2xl font-black ${text}`}>{value.toLocaleString()}</div>
      <div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-600">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/50 p-2">
      <div className={`text-sm font-black sm:text-base ${accent ? 'text-amber-300' : 'text-white'}`}>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value.toLocaleString()}</div>
      <div className="mt-0.5 text-[7px] uppercase tracking-widest text-slate-600">{label}</div>
    </div>
  )
}
