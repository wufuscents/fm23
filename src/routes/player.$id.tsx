import { createFileRoute, Link } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'

export const Route = createFileRoute('/player/$id')({
  loader: async ({ params }) => {
    const playerId = params.id

    try {
      const [playerRes, playerCareerRes, coachCareerRes, awardsRes] = await Promise.all([
        supabase.from('players').select('*').eq('id', playerId).single(),
        supabase.from('player_career_history').select('*').eq('player_id', playerId),
        supabase.from('coach_career_history').select('*').eq('player_id', playerId),
        supabase.from('awards_and_trophies').select('*').eq('player_id', playerId),
      ])

      return {
        player: (playerRes.data || null) as Player | null,
        playerCareer: playerCareerRes.data || [],
        coachCareer: coachCareerRes.data || [],
        awards: awardsRes.data || [],
      }
    } catch (err) {
      console.error('Error loading player profile:', err)
      return {
        player: null,
        playerCareer: [],
        coachCareer: [],
        awards: [],
      }
    }
  },
  component: PlayerProfilePage,
})

function PlayerProfilePage() {
  const { player, playerCareer, coachCareer, awards } = Route.useLoaderData()

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono gap-4 p-4">
        <div className="text-base text-white">Player profile could not be loaded.</div>
        <Link to="/" className="px-4 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs hover:border-slate-600 transition-colors">
          ← BACK TO DIRECTORY
        </Link>
      </div>
    )
  }

  const statusLower = (player.status || '').toLowerCase()
  const isLegend = statusLower.includes('legend') || (player.legend_at_clubs && player.legend_at_clubs.length > 0)
  const isIcon = statusLower.includes('icon') || (player.icon_at_clubs && player.icon_at_clubs.length > 0)

  const themeGlow = isLegend
    ? 'bg-radial from-amber-500/15 via-slate-950 to-slate-950'
    : isIcon
    ? 'bg-radial from-slate-300/15 via-slate-950 to-slate-950'
    : 'bg-slate-950'

  const cardBorder = isLegend
    ? 'border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.1)]'
    : isIcon
    ? 'border-slate-300/30 shadow-[0_0_30px_rgba(203,213,225,0.1)]'
    : 'border-slate-800'

  const badgeTheme = isLegend
    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
    : isIcon
    ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
    : 'bg-slate-800 text-slate-400 border-slate-700'

  const playerImage = player.image_url || ''
  const playerNation = player.nationality || 'Global'
  const playerFlag = player.nationality_flag_url || null
  const playerPos = player.role || '-'

  return (
    <div className={`min-h-screen text-slate-100 p-4 sm:p-8 transition-colors duration-500 ${themeGlow}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          ← BACK TO DIRECTORY
        </Link>

        {/* Profile Card Header */}
        <div className={`p-6 sm:p-8 rounded-2xl bg-slate-900/80 backdrop-blur-xl border ${cardBorder}`}>
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 flex-shrink-0 shadow-2xl flex items-center justify-center p-2">
              {playerImage ? (
                <img
                  src={storageUrl(playerImage)}
                  alt={player.name}
                  className="w-full h-full object-contain max-h-full"
                />
              ) : (
                <span className="text-slate-500 font-mono text-xs">NO IMAGE</span>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {playerFlag && (
                  <img src={playerFlag} alt={playerNation} className="w-6 h-4 object-cover rounded-sm" />
                )}
                <span className="text-xs font-mono uppercase text-slate-400">{playerNation}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeTheme}`}>
                  {player.status || 'Squad Member'}
                </span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-wide uppercase">
                {player.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-mono">
                Position: <span className="text-emerald-400 font-bold">{playerPos}</span>
              </p>

              {player.biography && (
                <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                  {player.biography}
                </p>
              )}

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800/80 text-center font-mono max-w-md">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.international_apps ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Caps</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.international_goals ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Goals</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.trophies ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Trophies</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.awards ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Awards</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Career History */}
        {playerCareer.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4">
              Player Career History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3">Country</th>
                    <th className="py-2 px-3">Years</th>
                    <th className="py-2 px-3 text-right">Apps</th>
                    <th className="py-2 px-3 text-right">Gls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {playerCareer.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        {entry.club_logo_url && (
                          <img src={storageUrl(entry.club_logo_url)} alt="" className="w-4 h-4 object-contain" />
                        )}
                        {entry.team_name}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{entry.country || '-'}</td>
                      <td className="py-3 px-3 text-slate-300">{entry.years || '-'}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{entry.apps ?? '-'}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">{entry.goals ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Managerial / Coaching History */}
        {coachCareer.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4">
              Managerial & Coaching Career
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3">Country</th>
                    <th className="py-2 px-3">Years</th>
                    <th className="py-2 px-3 text-right">Matches</th>
                    <th className="py-2 px-3 text-right">Win %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {coachCareer.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        {entry.club_logo_url && (
                          <img src={storageUrl(entry.club_logo_url)} alt="" className="w-4 h-4 object-contain" />
                        )}
                        {entry.team_name}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{entry.country || '-'}</td>
                      <td className="py-3 px-3 text-slate-300">{entry.years || '-'}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{entry.matches_managed ?? '-'}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {entry.win_percentage ? `${entry.win_percentage}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Honours & Awards */}
        {awards.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4">
              Awards & Trophies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
              {awards.map((award: any) => (
                <div key={award.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="text-slate-200 font-semibold block">{award.name}</span>
                    {award.years_or_details && (
                      <span className="text-[10px] text-slate-500 block">{award.years_or_details}</span>
                    )}
                  </div>
                  <span className="text-amber-400 font-bold ml-2">x{award.amount || 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
