import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'

export const Route = createFileRoute('/leaderboards')({
  loader: async () => {
    let { data, error } = await supabase
      .from('player_directory_view')
      .select('*')

    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('players').select('*')
      data = fallback.data || []
    }

    const { data: awardRows } = await supabase
      .from('awards_and_trophies')
      .select('player_id, name, amount')

    const ballonDorCounts: Record<string, number> = {}

    for (const award of awardRows || []) {
      const awardName = String(award.name || '').toLowerCase().replace(/[’']/g, '')
      if (awardName.includes('ballon dor')) {
        const playerId = String(award.player_id || '')
        if (playerId) {
          ballonDorCounts[playerId] =
            (ballonDorCounts[playerId] || 0) + Number(award.amount || 1)
        }
      }
    }

    return { players: (data || []) as Player[], ballonDorCounts }
  },
  component: LeaderboardsPage,
})

type Metric = 'trophies' | 'apps' | 'goals' | 'assists' | 'ga' | 'gpg' | 'ballon_dor' | 'awards'

function getStatValue(player: Player, metric: Metric, ballonDorCounts: Record<string, number>): number {
  const apps = Number((player as any).apps ?? 0)
  const goals = Number((player as any).goals ?? 0)
  const assists = Number((player as any).assists ?? 0)

  if (metric === 'ga') return goals + assists
  if (metric === 'gpg') return apps > 0 ? goals / apps : 0
  if (metric === 'ballon_dor') return ballonDorCounts[String(player.id)] || 0

  return Number((player as any)[metric] ?? 0)
}

function getMetricLabel(metric: Metric): string {
  if (metric === 'apps') return 'Appearances'
  if (metric === 'gpg') return 'G/GM'
  if (metric === 'ga') return 'G+A'
  if (metric === 'ballon_dor') return "Ballon d'Or"
  return metric
}

function formatMetricValue(player: Player, metric: Metric, ballonDorCounts: Record<string, number>): string | number {
  const value = getStatValue(player, metric, ballonDorCounts)
  return metric === 'gpg' ? value.toFixed(2) : value
}

function LeaderboardsPage() {
  const { players, ballonDorCounts } = Route.useLoaderData()
  const [metric, setMetric] = useState<Metric>('trophies')

  const topPlayers = useMemo(() => {
    return [...players]
      .filter((player) => metric !== 'ballon_dor' || getStatValue(player, metric, ballonDorCounts) > 0)
      .sort((a, b) => getStatValue(b, metric, ballonDorCounts) - getStatValue(a, metric, ballonDorCounts))
      .slice(0, 50)
  }, [players, metric, ballonDorCounts])

  const metrics: Metric[] = ['trophies', 'apps', 'goals', 'assists', 'ga', 'gpg', 'ballon_dor', 'awards']

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-heading font-extrabold tracking-wider text-xl text-white">FM SQUAD ARCHIVE</span>
          </div>
          <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">
              DIRECTORY
            </Link>
            <Link to="/leaderboards" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">
              HALL OF FAME
            </Link>
            <Link to="/compare" className="hover:text-white transition-colors">
              COMPARE
            </Link>
          </nav>
        </div>

        {/* Header */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <h1 className="font-heading text-3xl font-extrabold text-white tracking-wide uppercase">
            HALL OF FAME
          </h1>
          <p className="text-slate-400 text-xs font-mono mt-1">
            All-time record holders across appearances, goals, assists, goal contributions, trophies, and individual honors.
          </p>

          <div className="flex flex-wrap gap-2 mt-4 font-mono text-xs">
            {metrics.map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-4 py-2 rounded-lg font-bold uppercase transition-colors ${
                  metric === m
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {getMetricLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Player</th>
                  <th className="py-3 px-3">Nation</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right uppercase">{getMetricLabel(metric)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topPlayers.map((player, idx) => {
                  const playerImage = (player as any).image_url || (player as any).photo_url || ''
                  const playerNation = (player as any).nationality || (player as any).nation || 'Global'
                  const playerFlag = (player as any).nationality_flag_url || (player as any).nation_flag || null

                  return (
                    <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <Link
                          to="/player/$id"
                          params={{ id: String(player.id) }}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 flex-shrink-0 flex items-center justify-center p-0.5">
                            {playerImage ? (
                              <img
                                src={storageUrl(playerImage)}
                                alt={player.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-[8px] text-slate-500">NO IMG</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">
                              {player.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {(player as any).role || (player as any).positions_short || '-'}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="flex items-center gap-2">
                          <Flag url={playerFlag} name={playerNation} />
                          <span>{playerNation}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{(player as any).status || 'Squad Member'}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-amber-400 text-base">
                        {formatMetricValue(player, metric, ballonDorCounts)}
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
