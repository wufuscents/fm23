import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'

const MIN_RATE_APPS = 50
const TOP_LIMIT = 50

type RateMetric = 'gpg' | 'goals_per_100' | 'assists_per_100' | 'ga_per_100'
type Metric =
  | 'apps'
  | 'goals'
  | 'assists'
  | 'ga'
  | 'trophies'
  | 'awards'
  | 'ballon_dor'
  | RateMetric
  | 'goat'

type AwardRow = {
  player_id: string | null
  name: string | null
  amount: number | null
}

export const Route = createFileRoute('/leaderboards')({
  loader: async () => {
    let { data, error } = await supabase.from('player_directory_view').select('*')

    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('players').select('*')
      data = fallback.data || []
    }

    const awardRows: AwardRow[] = []
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

      if (!awardName.includes('ballon dor')) continue

      const playerId = String(award.player_id || '')
      if (!playerId) continue

      ballonDorCounts[playerId] = (ballonDorCounts[playerId] || 0) + Number(award.amount || 1)
    }

    return {
      players: (data || []) as Player[],
      ballonDorCounts,
    }
  },
  component: LeaderboardsPage,
})

const METRIC_LABELS: Record<Metric, string> = {
  apps: 'Appearances',
  goals: 'Goals',
  assists: 'Assists',
  ga: 'G+A',
  trophies: 'Trophies',
  awards: 'Awards',
  ballon_dor: "Ballon d'Or",
  gpg: 'Goals / Game',
  goals_per_100: 'Goals / 100 Apps',
  assists_per_100: 'Assists / 100 Apps',
  ga_per_100: 'G+A / 100 Apps',
  goat: 'GOAT Score',
}

const METRICS: Metric[] = [
  'apps',
  'goals',
  'assists',
  'ga',
  'trophies',
  'awards',
  'ballon_dor',
  'gpg',
  'goals_per_100',
  'assists_per_100',
  'ga_per_100',
  'goat',
]

function numberValue(player: Player, key: string): number {
  return Number((player as any)[key] ?? 0) || 0
}

function getBaseStats(player: Player) {
  const apps = numberValue(player, 'apps')
  const goals = numberValue(player, 'goals')
  const assists = numberValue(player, 'assists')
  return {
    apps,
    goals,
    assists,
    ga: goals + assists,
    trophies: numberValue(player, 'trophies'),
    awards: numberValue(player, 'awards'),
  }
}

function getStatValue(player: Player, metric: Metric, ballonDorCounts: Record<string, number>): number {
  const { apps, goals, assists, ga, trophies, awards } = getBaseStats(player)

  if (metric === 'apps') return apps
  if (metric === 'goals') return goals
  if (metric === 'assists') return assists
  if (metric === 'ga') return ga
  if (metric === 'trophies') return trophies
  if (metric === 'awards') return awards
  if (metric === 'ballon_dor') return ballonDorCounts[String(player.id)] || 0
  if (metric === 'gpg') return apps > 0 ? goals / apps : 0
  if (metric === 'goals_per_100') return apps > 0 ? (goals / apps) * 100 : 0
  if (metric === 'assists_per_100') return apps > 0 ? (assists / apps) * 100 : 0
  if (metric === 'ga_per_100') return apps > 0 ? (ga / apps) * 100 : 0
  return 0
}

function normalized(value: number, max: number): number {
  return max > 0 ? value / max : 0
}

function getGoatScore(player: Player, players: Player[], ballonDorCounts: Record<string, number>): number {
  const components: Array<[Metric, number]> = [
    ['apps', 10],
    ['goals', 20],
    ['assists', 20],
    ['trophies', 25],
    ['awards', 15],
    ['ballon_dor', 5],
  ]

  let score = 0

  for (const [metric, weight] of components) {
    const maximum = Math.max(...players.map((p) => getStatValue(p, metric, ballonDorCounts)), 0)
    score += normalized(getStatValue(player, metric, ballonDorCounts), maximum) * weight
  }

  const status = String((player as any).status ?? '').toLowerCase()
  const legacyComponent = status.includes('legend') ? 1 : status.includes('icon') ? 0.75 : 0

  return score + legacyComponent * 5
}

function getMetricValue(player: Player, metric: Metric, players: Player[], ballonDorCounts: Record<string, number>) {
  return metric === 'goat'
    ? getGoatScore(player, players, ballonDorCounts)
    : getStatValue(player, metric, ballonDorCounts)
}

function isRateMetric(metric: Metric): metric is RateMetric {
  return metric === 'gpg' || metric === 'goals_per_100' || metric === 'assists_per_100' || metric === 'ga_per_100'
}

function eligibleForMetric(player: Player, metric: Metric, ballonDorCounts: Record<string, number>): boolean {
  if (metric === 'ballon_dor') return (ballonDorCounts[String(player.id)] || 0) > 0
  if (isRateMetric(metric)) return numberValue(player, 'apps') >= MIN_RATE_APPS
  return true
}

function formatValue(value: number, metric: Metric): string {
  if (metric === 'goat' || isRateMetric(metric)) return value.toFixed(2)
  return value.toLocaleString()
}

function statusKind(player: Player): 'legend' | 'icon' | 'other' {
  const status = String((player as any).status ?? '').toLowerCase()
  if (status.includes('legend')) return 'legend'
  if (status.includes('icon')) return 'icon'
  return 'other'
}

function statusClasses(player: Player): string {
  const kind = statusKind(player)
  if (kind === 'legend') return 'border-amber-400/35 bg-amber-400/10 text-amber-300'
  if (kind === 'icon') return 'border-slate-300/30 bg-slate-200/10 text-slate-200'
  return 'border-white/10 bg-white/[0.03] text-slate-500'
}

function LeaderboardsPage() {
  const { players, ballonDorCounts } = Route.useLoaderData()
  const [metric, setMetric] = useState<Metric>('goals')

  const rankedPlayers = useMemo(() => {
    return [...players]
      .filter((player) => eligibleForMetric(player, metric, ballonDorCounts))
      .sort((a, b) => {
        const valueA = getMetricValue(a, metric, players, ballonDorCounts)
        const valueB = getMetricValue(b, metric, players, ballonDorCounts)
        if (valueB !== valueA) return valueB - valueA

        const appsA = numberValue(a, 'apps')
        const appsB = numberValue(b, 'apps')
        if (appsB !== appsA) return appsB - appsA

        const goalsA = numberValue(a, 'goals')
        const goalsB = numberValue(b, 'goals')
        if (goalsB !== goalsA) return goalsB - goalsA

        return String(a.name || '').localeCompare(String(b.name || ''))
      })
      .slice(0, TOP_LIMIT)
  }, [ballonDorCounts, metric, players])

  const leader = rankedPlayers[0]
  const leaderValue = leader ? getMetricValue(leader, metric, players, ballonDorCounts) : 0
  const eligibleCount = useMemo(
    () => players.filter((player) => eligibleForMetric(player, metric, ballonDorCounts)).length,
    [ballonDorCounts, metric, players],
  )

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-white transition-colors hover:text-emerald-300">
            <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-heading text-xl font-extrabold tracking-wider">FM SQUAD ARCHIVE</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 font-mono text-xs uppercase tracking-widest text-slate-400">
            <Link to="/" className="transition-colors hover:text-white">DIRECTORY</Link>
            <Link to="/hall-of-fame" className="transition-colors hover:text-white">HALL OF FAME</Link>
            <Link to="/leaderboards" className="border-b-2 border-emerald-400 pb-1 font-bold text-emerald-400">RECORDS</Link>
            <Link to="/compare" className="transition-colors hover:text-white">COMPARE</Link>
          </nav>
        </header>

        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(52,211,153,0.08),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.015),transparent_48%)]" />
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-emerald-400">
                  Statistical Records Room / Database Index
                </div>
                <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[0.03em] text-white sm:text-6xl">
                  Records
                </h1>
                <p className="mt-3 max-w-3xl font-mono text-[10px] leading-relaxed tracking-wide text-slate-500 sm:text-xs">
                  Career-wide statistical records, efficiency benchmarks, honours, and the archive composite GOAT index.
                  All rankings resolve from the live player database.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricCard label="PLAYERS" value={players.length} />
                <MetricCard label="RANKED" value={eligibleCount} />
                <MetricCard label="TOP LIMIT" value={TOP_LIMIT} />
                <MetricCard label="RATE FLOOR" value={MIN_RATE_APPS} suffix="APPS" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-600">Record selector</div>
              <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-wide text-white">Choose a statistical axis</h2>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">
              Career totals / efficiency / prestige
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto p-4 sm:flex-wrap sm:p-5">
            {METRICS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMetric(item)}
                className={
                  metric === item
                    ? 'whitespace-nowrap rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300 transition-colors'
                    : 'whitespace-nowrap rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-200'
                }
              >
                {METRIC_LABELS[item]}
              </button>
            ))}
          </div>
        </section>

        {leader && (
          <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-slate-900/75 backdrop-blur-md">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(251,191,36,0.08),transparent_30%),linear-gradient(90deg,rgba(251,191,36,0.025),transparent_40%)]" />
            <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="font-display text-4xl font-black text-amber-300 sm:text-5xl">#01</div>
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden border border-slate-700 bg-[#050b14] p-1">
                  {(leader as any).image_url || (leader as any).photo_url ? (
                    <img
                      src={storageUrl((leader as any).image_url || (leader as any).photo_url)}
                      alt={leader.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="grid h-full place-items-center font-mono text-[8px] text-slate-700">NO IMG</div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    to="/player/$id"
                    params={{ id: String(leader.id) }}
                    className="block truncate font-display text-2xl font-black uppercase tracking-wide text-white transition-colors hover:text-emerald-300"
                  >
                    {leader.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                    <Flag
                      url={(leader as any).nationality_flag_url || (leader as any).nation_flag || null}
                      name={(leader as any).nationality || (leader as any).nation || 'Global'}
                    />
                    <span>{(leader as any).nationality || (leader as any).nation || 'Global'}</span>
                    <span className={`border px-1.5 py-0.5 ${statusClasses(leader)}`}>
                      {(leader as any).status || 'SQUAD'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-l border-slate-800 pl-5 lg:text-right">
                <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">Current record holder</div>
                <div className="mt-1 font-mono text-3xl font-black tabular-nums text-amber-300 sm:text-4xl">
                  {formatValue(leaderValue, metric)}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">
                  {METRIC_LABELS[metric]}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="flex flex-col gap-2 border-b border-slate-800 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-600">Record Ledger / Top {TOP_LIMIT}</div>
              <h2 className="mt-1 font-display text-2xl font-black uppercase text-white sm:text-3xl">{METRIC_LABELS[metric]}</h2>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
              {eligibleCount.toLocaleString()} eligible profiles
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-600">
                  <th className="px-5 py-3 text-left">Rank</th>
                  <th className="px-5 py-3">Player</th>
                  <th className="px-5 py-3">Nation</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Apps</th>
                  <th className="px-5 py-3 text-right">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {rankedPlayers.map((player, index) => {
                  const value = getMetricValue(player, metric, players, ballonDorCounts)
                  const nation = (player as any).nationality || (player as any).nation || 'Global'
                  const flag = (player as any).nationality_flag_url || (player as any).nation_flag || null
                  const image = (player as any).image_url || (player as any).photo_url || ''
                  const rankClass =
                    index === 0
                      ? 'text-amber-300'
                      : index === 1
                        ? 'text-slate-200'
                        : index === 2
                          ? 'text-orange-300'
                          : 'text-slate-600'

                  return (
                    <tr key={player.id} className="group transition-colors hover:bg-white/[0.018]">
                      <td className={`px-5 py-3 font-mono text-xs font-bold tabular-nums ${rankClass}`}>
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          to="/player/$id"
                          params={{ id: String(player.id) }}
                          className="flex items-center gap-3"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden border border-slate-800 bg-[#07101b] p-0.5">
                            {image ? (
                              <img
                                src={storageUrl(image)}
                                alt={player.name}
                                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="grid h-full place-items-center font-mono text-[7px] text-slate-700">NO IMG</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-display text-sm font-bold uppercase tracking-wide text-slate-200 transition-colors group-hover:text-white">
                              {player.name}
                            </div>
                            <div className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-widest text-slate-600">
                              {(player as any).role || (player as any).positions_short || 'PLAYER'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-slate-400">
                          <Flag url={flag} name={nation} />
                          <span className="whitespace-nowrap">{nation}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-widest ${statusClasses(player)}`}>
                          {(player as any).status || 'SQUAD'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-500">
                        {numberValue(player, 'apps').toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm font-black tabular-nums text-emerald-300">
                        {formatValue(value, metric)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!rankedPlayers.length && (
            <div className="border-t border-slate-800 p-10 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-slate-700">
              No qualifying records in this archive.
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md sm:p-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-600">Methodology / Advanced metrics</div>
            <h2 className="mt-1 font-display text-xl font-black uppercase text-white">Read the numbers correctly</h2>
            <div className="mt-4 space-y-3 font-mono text-[10px] leading-relaxed text-slate-500">
              <p>
                Rate-based records require at least {MIN_RATE_APPS.toLocaleString()} appearances. This prevents extremely small samples from dominating efficiency leaderboards.
              </p>
              <p>
                G+A is calculated as goals plus assists. Per-100 figures are derived from career totals divided by appearances, then scaled to 100 matches.
              </p>
              <p>
                The GOAT index uses normalized career output across appearances, goals, assists, trophies, awards, and Ballon d&apos;Or wins, plus a legacy component for Legends and Icons.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md sm:p-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-600">GOAT index / weighting</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Weight label="APPS" value="10%" />
              <Weight label="GOALS" value="20%" />
              <Weight label="ASSISTS" value="20%" />
              <Weight label="TROPHIES" value="25%" />
              <Weight label="AWARDS" value="15%" />
              <Weight label="BALLON D'OR" value="5%" />
              <Weight label="LEGACY" value="5%" />
            </div>
          </div>
        </section>

        <div className="border-t border-slate-900 pt-4 font-mono text-[8px] uppercase tracking-[0.24em] text-slate-700">
          FM SQUAD ARCHIVE // STATISTICAL RECORDS ROOM // SOURCE: LIVE PLAYER DATABASE + AWARDS ARCHIVE
        </div>
      </div>
    </main>
  )
}

function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="font-mono text-lg font-black tabular-nums text-slate-100">
        {value.toLocaleString()}
        {suffix ? <span className="ml-1 text-[8px] font-normal tracking-widest text-slate-600">{suffix}</span> : null}
      </div>
      <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.2em] text-slate-600">{label}</div>
    </div>
  )
}

function Weight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
      <div className="font-mono text-[8px] uppercase tracking-widest text-slate-600">{label}</div>
      <div className="mt-1 font-mono text-sm font-black tabular-nums text-slate-200">{value}</div>
    </div>
  )
}
