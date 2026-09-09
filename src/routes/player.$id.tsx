import { createFileRoute, Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { Player, CareerEntry, AwardEntry } from '@/lib/types'
import { storageUrl, sortCareerByYears } from '@/lib/fm'

export const Route = createFileRoute('/player/$id')({
  loader: async ({ params }) => {
    const { id } = params

    const [playerRes, playerCareerRes, coachCareerRes, awardsRes] = await Promise.all([
      supabase.from('players').select('*').eq('id', id).single(),
      supabase.from('player_career_history').select('*').eq('player_id', id),
      supabase.from('coach_career_history').select('*').eq('player_id', id),
      supabase.from('awards_and_trophies').select('*').eq('player_id', id),
    ])

    return {
      player: playerRes.data as Player | null,
      playerCareer: sortCareerByYears((playerCareerRes.data || []) as CareerEntry[]),
      coachCareer: sortCareerByYears((coachCareerRes.data || []) as CareerEntry[]),
      awards: (awardsRes.data || []) as AwardEntry[],
    }
  },
  component: PlayerProfilePage,
})

function PlayerProfilePage() {
  const { player, playerCareer, coachCareer, awards } = Route.useLoaderData()

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono">
        Player profile not found.
      </div>
    )
  }

  // 9. Background dynamic theme based on status (Legend, Icon, None)
  const statusLower = player.status?.toLowerCase() || ''
  const isLegend = statusLower === 'legend'
  const isIcon = statusLower === 'icon'

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

  return (
    <div className={`min-h-screen text-slate-100 p-4 sm:p-8 transition-colors duration-500 ${themeGlow}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          ← BACK TO DIRECTORY
        </Link>

        {/* Profile Banner */}
        <div className={`p-6 sm:p-8 rounded-2xl bg-slate-900/80 backdrop-blur-xl border ${cardBorder}`}>
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* Player Avatar */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 flex-shrink-0 shadow-2xl">
              <img
                src={storageUrl(player.photo_url)}
                alt={player.name}
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {player.nation_flag && (
                  <img src={player.nation_flag} alt={player.nation} className="w-6 h-4 object-cover rounded-sm" />
                )}
                <span className="text-xs font-mono uppercase text-slate-400">{player.nation}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeTheme}`}>
                  {player.status || 'Squad Member'}
                </span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-wide uppercase">
                {player.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-mono">
                {player.position || 'N/A'}
              </p>

              {/* Career Totals */}
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800/80 text-center font-mono max-w-md">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.caps ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Caps</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.apps ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Apps</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.goals ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Goals</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{player.trophies ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Trophies</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Career History */}
        {playerCareer.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4">
              Player Career
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Club</th>
                    <th className="py-2 px-3">Country</th>
                    <th className="py-2 px-3">Years</th>
                    <th className="py-2 px-3 text-right">Apps</th>
                    <th className="py-2 px-3 text-right">Gls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {playerCareer.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{entry.club}</td>
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

        {/* Coach Career History */}
        {coachCareer.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4">
              Managerial / Coaching Stints
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Club / Team</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Years</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {coachCareer.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{entry.club}</td>
                      <td className="py-3 px-3 text-slate-300">{entry.role || 'Head Coach'}</td>
                      <td className="py-3 px-3 text-slate-400">{entry.years || '-'}</td>
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
              Honours & Recognitions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
              {awards.map((award, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-200 font-semibold">{award.award_name}</span>
                  <span className="text-amber-400 font-bold ml-2">x{award.count || 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
