import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'

export const Route = createFileRoute('/player/$id')({
  loader: async ({ params }) => {
    const playerId = params.id

    try {
      let playerRes = await supabase
        .from('player_directory_view')
        .select('*')
        .eq('id', playerId)
        .maybeSingle()

      if (!playerRes.data) {
        playerRes = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .maybeSingle()
      }

      const [playerCareerRes, coachCareerRes, awardsRes] = await Promise.all([
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

function getStartYear(yearsStr?: string | null): number {
  if (!yearsStr) return 0
  const match = yearsStr.match(/\d{4}/)
  return match ? parseInt(match[0], 10) : 0
}

function PlayerProfilePage() {
  const { player, playerCareer, coachCareer, awards } = Route.useLoaderData()
  const [awardTab, setAwardTab] = useState<'team' | 'individual'>('team')

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

  const statusLower = String(player.status || '').trim().toLowerCase()
  const genderLower = String(player.gender || '').trim().toLowerCase()

  const isLegend = statusLower.includes('legend')
  const isIcon = !isLegend && statusLower.includes('icon')
  const isFemale = genderLower === 'female' || genderLower === 'f'
  const isMale = genderLower === 'male' || genderLower === 'm'

  // Status controls the metallic accent; gender controls the underlying
  // colour atmosphere. Keep the two independent so combinations such as
  // female Legend and male Icon are both represented correctly.
  const cardBackground = isFemale
    ? 'bg-gradient-to-br from-pink-950/70 via-slate-900/90 to-slate-950'
    : isMale
    ? 'bg-gradient-to-br from-blue-950/70 via-slate-900/90 to-slate-950'
    : 'bg-slate-900/80'

  const cardBorder = isLegend
    ? 'border-amber-400/90 shadow-[0_0_26px_rgba(251,191,36,0.16)]'
    : isIcon
    ? 'border-slate-300/80 shadow-[0_0_22px_rgba(226,232,240,0.14)]'
    : isFemale
    ? 'border-pink-500/50 shadow-[0_0_24px_rgba(236,72,153,0.14)]'
    : isMale
    ? 'border-blue-500/50 shadow-[0_0_24px_rgba(59,130,246,0.14)]'
    : 'border-slate-800'

  const statusText = isLegend
    ? 'LEGEND'
    : isIcon
    ? 'ICON'
    : (player.status || 'PLAYER')

  const playerImage = player.image_url || player.photo_url || ''
  const playerNation = player.nationality || player.nation || 'Global'
  const playerFlag = player.nationality_flag_url || player.nation_flag || null
  const playerPos = player.role || player.positions_short || player.position || '-'

  const legendClubs = player.legend_at_clubs || []
  const iconClubs = player.icon_at_clubs || []

  const sortedPlayerCareer = useMemo(() => {
    return [...playerCareer].sort((a: any, b: any) => {
      return getStartYear(b.years) - getStartYear(a.years)
    })
  }, [playerCareer])

  const totalCareerApps = useMemo(() => {
    return sortedPlayerCareer.reduce((sum: number, c: any) => sum + (c.apps || 0), 0)
  }, [sortedPlayerCareer])

  const totalCareerGoals = useMemo(() => {
    return sortedPlayerCareer.reduce((sum: number, c: any) => sum + (c.goals || 0), 0)
  }, [sortedPlayerCareer])

  const teamTrophies = useMemo(() => {
    return awards.filter((a: any) => {
      const cat = (a.category || '').toLowerCase()
      return cat.includes('team') || cat.includes('trophy') || !cat
    })
  }, [awards])

  const individualAwards = useMemo(() => {
    return awards.filter((a: any) => {
      const cat = (a.category || '').toLowerCase()
      return cat.includes('indiv') || cat.includes('award') || cat.includes('personal')
    })
  }, [awards])

  const totalTrophiesCount = useMemo(() => {
    if (player.trophies && player.trophies > 0) return player.trophies
    return teamTrophies.reduce((sum: number, a: any) => sum + (a.amount || 1), 0)
  }, [player, teamTrophies])

  const totalAwardsCount = useMemo(() => {
    if (player.awards && player.awards > 0) return player.awards
    return individualAwards.reduce((sum: number, a: any) => sum + (a.amount || 1), 0)
  }, [player, individualAwards])

  const displayApps = player.apps ?? totalCareerApps ?? 0
  const displayGoals = player.goals ?? totalCareerGoals ?? 0
  const displayAssists = (player as any).assists ?? 0
  const goalContributions = displayGoals + displayAssists
  const goalsPerGame = displayApps > 0 ? displayGoals / displayApps : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          ← BACK TO DIRECTORY
        </Link>

        {/* 1. Header Profile Card */}
        <div className={`p-6 sm:p-8 rounded-2xl ${cardBackground} backdrop-blur-xl border ${cardBorder}`}>
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

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {playerFlag && (
                  <img src={playerFlag} alt={playerNation} className="w-5 h-5 rounded-full object-cover shadow-sm" />
                )}
                <span className="text-xs font-mono uppercase text-slate-400">{playerNation}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    isLegend
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/70'
                      : isIcon
                      ? 'bg-slate-200/15 text-slate-100 border-slate-300/70'
                      : isFemale
                      ? 'bg-pink-500/15 text-pink-300 border-pink-400/50'
                      : isMale
                      ? 'bg-blue-500/15 text-blue-300 border-blue-400/50'
                      : 'bg-slate-800/90 text-slate-300 border-slate-600/80'
                  }`}
                >
                  {statusText}
                </span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white tracking-wide uppercase">
                {player.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-mono">
                {playerPos}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {isLegend && legendClubs.map((clubName: string) => (
                  <span
                    key={clubName}
                    className="text-xs font-semibold px-2.5 py-1 rounded border border-amber-400/50 bg-amber-400/10 text-amber-300"
                  >
                    Legend • {clubName}
                  </span>
                ))}
                {isIcon && iconClubs.map((clubName: string) => (
                  <span
                    key={clubName}
                    className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-300/50 bg-slate-300/10 text-slate-200"
                  >
                    Icon • {clubName}
                  </span>
                ))}
              </div>

              {/* Header Stat Boxes: APPS, GOALS, ASSISTS, G+A, G/GM, TROPHIES, AWARDS */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-4 border-t border-slate-800/80 text-center font-mono max-w-2xl">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-white">{displayApps}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Apps</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-white">{displayGoals}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Goals</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-white">{displayAssists}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Assists</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-white">{goalContributions}</div>
                  <div className="text-[10px] text-slate-500 uppercase">G+A</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-white">{goalsPerGame.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 uppercase">G/GM</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-amber-400">{totalTrophiesCount}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Trophies</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xl font-bold text-emerald-400">{totalAwardsCount}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Awards</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Milestones Grid Section */}
        <div>
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
            MILESTONES
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-bold text-amber-400">{player.personal_1st ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">Personal 1st</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-bold text-white">{player.personal_2nd ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">Personal 2nd</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-bold text-white">{player.personal_3rd ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">Personal 3rd</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-bold text-emerald-400">{player.team_1st ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">Team 1st</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-bold text-white">{player.team_2nd ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">Team 2nd</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-2xl font-bold text-white">{player.team_3rd ?? 0}</div>
              <div className="text-[10px] text-slate-500 uppercase mt-1">Team 3rd</div>
            </div>
          </div>
        </div>

        {/* 3. Player Career History Table */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <h2 className="font-heading text-2xl font-extrabold text-white uppercase tracking-wider mb-4">
            PLAYER CAREER
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Club</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3">Years</th>
                  <th className="py-2.5 px-3 text-right">Apps</th>
                  <th className="py-2.5 px-3 text-right">Gls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedPlayerCareer.map((entry: any) => (
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
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950/80 font-bold">
                  <td className="py-3 px-3 text-white uppercase">TOTAL</td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right text-white">{totalCareerApps}</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{totalCareerGoals}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 4. Managerial / Coaching History */}
        {coachCareer.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4">
              Managerial & Coaching Career
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Country</th>
                    <th className="py-2.5 px-3">Years</th>
                    <th className="py-2.5 px-3 text-right">Matches</th>
                    <th className="py-2.5 px-3 text-right">Win %</th>
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

        {/* 5. Awards & Trophies with Tabs */}
        <div>
          <div className="flex items-center gap-3 mb-4 font-mono text-xs">
            <button
              onClick={() => setAwardTab('team')}
              className={`px-4 py-2.5 rounded-lg font-bold uppercase transition-colors ${
                awardTab === 'team'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              TEAM TROPHIES ({totalTrophiesCount})
            </button>
            <button
              onClick={() => setAwardTab('individual')}
              className={`px-4 py-2.5 rounded-lg font-bold uppercase transition-colors ${
                awardTab === 'individual'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              INDIVIDUAL AWARDS ({totalAwardsCount})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
            {(awardTab === 'team' ? teamTrophies : individualAwards).map((item: any) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-4"
              >
                <div className="text-xl font-bold text-amber-400 px-3 py-1 bg-slate-950/80 rounded border border-slate-800 flex-shrink-0">
                  {item.amount || 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-bold text-sm truncate">{item.name}</div>
                  {item.years_or_details && (
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {item.years_or_details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Biography Dedicated Section at Bottom */}
        {player.biography && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <h2 className="font-heading text-2xl font-extrabold text-white uppercase tracking-wider mb-4">
              BIOGRAPHY
            </h2>
            <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-4 font-mono">
              {player.biography.split('\n\n').map((paragraph: string, idx: number) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
