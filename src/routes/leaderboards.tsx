import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'
import { ArchiveHeader } from '../components/fm/ArchiveHeader'

export const Route = createFileRoute('/leaderboards')({
  loader: async () => {
    let { data, error } = await supabase
      .from('player_directory_view')
      .select('*')

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
  component: LeaderboardsPage,
})

type Metric = 'trophies' | 'apps' | 'goals' | 'assists' | 'ga' | 'gpg' | 'ballon_dor' | 'awards' | 'goals_per_100' | 'ga_per_100' | 'assists_per_100' | 'goat'

function getStatValue(player: Player, metric: Metric, ballonDorCounts: Record<string, number>): number {
  const apps = Number((player as any).apps ?? 0)
  const goals = Number((player as any).goals ?? 0)
  const assists = Number((player as any).assists ?? 0)

  if (metric === 'ga') return goals + assists
  if (metric === 'gpg') return apps > 0 ? goals / apps : 0
  if (metric === 'goals_per_100') return apps > 0 ? (goals / apps) * 100 : 0
  if (metric === 'assists_per_100') return apps > 0 ? (assists / apps) * 100 : 0
  if (metric === 'ga_per_100') return apps > 0 ? ((goals + assists) / apps) * 100 : 0
  if (metric === 'ballon_dor') return ballonDorCounts[String(player.id)] || 0
  return Number((player as any)[metric] ?? 0)
}

function getMetricLabel(metric: Metric): string {
  const labels: Record<Metric, string> = {
    trophies: 'Trophies',
    apps: 'Appearances',
    goals: 'Goals',
    assists: 'Assists',
    ga: 'G+A',
    gpg: 'G/GM',
    ballon_dor: "Ballon d'Or",
    awards: 'Awards',
    goals_per_100: 'Goals / 100 Apps',
    assists_per_100: 'Assists / 100 Apps',
    ga_per_100: 'G+A / 100 Apps',
    goat: 'GOAT Score',
  }
  return labels[metric]
}

function normalize(value: number, max: number) {
  return max > 0 ? value / max : 0
}

function getGoatScore(player: Player, players: Player[], ballonDorCounts: Record<string, number>): number {
  const metrics: Array<[Metric, number]> = [
    ['apps', 10],
    ['goals', 20],
    ['assists', 20],
    ['trophies', 25],
    ['awards', 15],
    ['ballon_dor', 5],
  ]

  let score = 0
  for (const [metric, weight] of metrics) {
    const max = Math.max(...players.map((p) => getStatValue(p, metric, ballonDorCounts)), 0)
    score += normalize(getStatValue(player, metric, ballonDorCounts), max) * weight
  }

  // Status/Legacy is a deliberate prestige component:
  // Legend = full 5%, Icon = 75% of the component, everyone else = 0%.
  const status = String((player as any).status ?? '').toLowerCase()
  const statusLegacyScore = status.includes('legend')
    ? 1
    : status.includes('icon')
      ? 0.75
      : 0

  score += statusLegacyScore * 5
  return score
}

function formatMetricValue(value: number, metric: Metric) {
  if (metric === 'gpg' || metric === 'goals_per_100' || metric === 'assists_per_100' || metric === 'ga_per_100' || metric === 'goat') {
    return value.toFixed(2)
  }
  return value.toLocaleString()
}

function statusClasses(player: Player) {
  const status = String((player as any).status ?? '').toLowerCase()
  if (status.includes('legend')) return 'border-amber-400/40 bg-amber-400/10 text-amber-300'
  if (status.includes('icon')) return 'border-slate-300/40 bg-slate-300/10 text-slate-200'
  return 'border-slate-700 bg-slate-950/70 text-slate-400'
}

function LeaderboardsPage() {
  const { players, ballonDorCounts } = Route.useLoaderData()
  const [metric, setMetric] = useState<Metric>('trophies')

  const metrics: Metric[] = [
    'trophies', 'apps', 'goals', 'assists', 'ga', 'gpg', 'goals_per_100', 'assists_per_100', 'ga_per_100', 'ballon_dor', 'awards', 'goat',
  ]

  const topPlayers = useMemo(() => {
    return [...players]
      .filter((player) => metric !== 'ballon_dor' || getStatValue(player, metric, ballonDorCounts) > 0)
      .sort((a, b) => {
        const valueA = metric === 'goat' ? getGoatScore(a, players, ballonDorCounts) : getStatValue(a, metric, ballonDorCounts)
        const valueB = metric === 'goat' ? getGoatScore(b, players, ballonDorCounts) : getStatValue(b, metric, ballonDorCounts)
        return valueB - valueA
      })
      .slice(0, 50)
  }, [players, metric, ballonDorCounts])

  const leader = topPlayers[0]
  const leaderValue = leader
    ? metric === 'goat'
      ? getGoatScore(leader, players, ballonDorCounts)
      : getStatValue(leader, metric, ballonDorCounts)
    : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <ArchiveHeader active="records" />

        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-blue-400">Archive Records</p>
          <h1 className="mt-1 font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-wide uppercase">ARCHIVE RECORDS</h1>
          <p className="text-slate-400 text-xs font-mono mt-2 max-w-3xl">
            Career totals, efficiency records, honours, and the FM Squad Archive's composite GOAT score.
          </p>

          <div className="flex flex-wrap gap-2 mt-5 font-mono text-[10px]">
            {metrics.map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-2 rounded-lg font-bold uppercase transition-all ${
                  metric === m
                    ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {getMetricLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {leader && (
          <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-amber-400/20 backdrop-blur-md shadow-[0_0_45px_rgba(251,191,36,0.06)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-emerald-400/5" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-3xl font-heading font-extrabold text-amber-300">#1</div>
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center p-1 shrink-0">
                {(leader as any).image_url || (leader as any).photo_url ? (
                  <img src={storageUrl((leader as any).image_url || (leader as any).photo_url)} alt={leader.name} className="w-full h-full object-contain" />
                ) : <span className="text-[8px] text-slate-500">NO IMG</span>}
              </div>
              <div className="min-w-0 flex-1">
                <Link to="/player/$id" params={{ id: String(leader.id) }} className="font-heading text-xl font-extrabold uppercase text-white hover:text-blue-400 transition-colors">
                  {leader.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase">
                  <Flag url={(leader as any).nationality_flag_url || (leader as any).nation_flag || null} name={(leader as any).nationality || (leader as any).nation || 'Global'} />
                  <span>{(leader as any).nationality || (leader as any).nation || 'Global'}</span>
                  <span>•</span>
                  <span className={`px-1.5 py-0.5 rounded border ${statusClasses(leader)}`}>{(leader as any).status || 'SQUAD'}</span>
                </div>
              </div>
              <div className="sm:text-right">
                <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Current leader</div>
                <div className="mt-1 text-2xl font-mono font-extrabold text-amber-300">{formatMetricValue(leaderValue, metric)}</div>
                <div className="text-[9px] font-mono uppercase text-slate-500">{getMetricLabel(metric)}</div>
              </div>
            </div>
          </div>
        )}

        {metric === 'goat' && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-500 leading-relaxed">
            <span className="text-slate-300 font-bold">GOAT SCORE FORMULA:</span> Apps 10% • Goals 20% • Assists 20% • Trophies 25% • Awards 15% • Ballon d'Or 5% • Status/Legacy 5%. Status/Legacy: Legend = 100%, Icon = 75%, other status = 0%. Each statistical category is normalized against the strongest player in the current archive.
          </div>
        )}

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Top 50 records</p>
              <h2 className="mt-1 font-heading text-xl sm:text-2xl font-extrabold uppercase text-white">{getMetricLabel(metric)}</h2>
            </div>
            <div className="text-[10px] font-mono uppercase text-slate-500">{topPlayers.length} ranked</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Nation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">{getMetricLabel(metric)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topPlayers.map((player, idx) => {
                  const playerImage = (player as any).image_url || (player as any).photo_url || ''
                  const playerNation = (player as any).nationality || (player as any).nation || 'Global'
                  const playerFlag = (player as any).nationality_flag_url || (player as any).nation_flag || null
                  const value = metric === 'goat' ? getGoatScore(player, players, ballonDorCounts) : getStatValue(player, metric, ballonDorCounts)
                  const isTopThree = idx < 3

                  return (
                    <tr key={player.id} className="group hover:bg-slate-800/40 transition-colors">
                      <td className={`py-3 px-4 font-bold ${idx === 0 ? 'text-amber-300' : idx === 1 ? 'text-slate-200' : idx === 2 ? 'text-orange-300' : 'text-slate-500'}`}>
                        {isTopThree ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <Link to="/player/$id" params={{ id: String(player.id) }} className="flex items-center gap-3 group/link">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 flex-shrink-0 flex items-center justify-center p-0.5">
                            {playerImage ? (
                              <img src={storageUrl(playerImage)} alt={player.name} className="w-full h-full object-contain transition-transform duration-300 group-hover/link:scale-105" />
                            ) : (
                              <span className="text-[8px] text-slate-500">NO IMG</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white uppercase group-hover/link:text-emerald-400 transition-colors">{player.name}</div>
                            <div className="text-[9px] text-slate-500">{(player as any).role || (player as any).positions_short || '-'}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <Flag url={playerFlag} name={playerNation} />
                          <span>{playerNation}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded border text-[9px] font-bold uppercase ${statusClasses(player)}`}>
                          {(player as any).status || 'SQUAD'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-extrabold text-base ${metric === 'goat' || metric === 'ballon_dor' || metric === 'trophies' ? 'text-amber-300' : 'text-blue-300'}`}>
                        {formatMetricValue(value, metric)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
