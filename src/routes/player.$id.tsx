import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'
import { getArchiveProfile, isPlayerVisibleToProfile } from '../lib/archive-auth'

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

  const archiveProfile = getArchiveProfile()

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

  if (!isPlayerVisibleToProfile(player as any, archiveProfile)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono gap-4 p-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Archive access restriction</div>
        <div className="text-base text-white">This player is outside the active archive profile.</div>
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

  const statusText = isLegend ? 'LEGEND' : isIcon ? 'ICON' : (player.status || 'PLAYER')

  const playerImage = (player as any).image_url || (player as any).photo_url || ''
  const playerNation = (player as any).nationality || (player as any).nation || 'Global'
  const playerFlag = (player as any).nationality_flag_url || (player as any).nation_flag || null
  const playerPos = (player as any).role || (player as any).positions_short || (player as any).position || '-'

  const legacyClubs = (player as any).legend_at_clubs || []
  const legendClubs = legacyClubs
  const iconClubs = legacyClubs

  const sortedPlayerCareer = useMemo(() => {
    return [...playerCareer].sort((a: any, b: any) => getStartYear(b.years) - getStartYear(a.years))
  }, [playerCareer])

  const mostPlayedClub = useMemo(() => {
    const totals = new Map<string, { teamName: string; apps: number; goals: number; logo: string | null }>()
    for (const career of playerCareer as any[]) {
      const teamName = String(career.team_name || '').trim()
      if (!teamName) continue
      const existing = totals.get(teamName) || { teamName, apps: 0, goals: 0, logo: null }
      existing.apps += Number(career.apps || 0)
      existing.goals += Number(career.goals || 0)
      if (!existing.logo && career.club_logo_url) existing.logo = String(career.club_logo_url)
      totals.set(teamName, existing)
    }
    return Array.from(totals.values()).sort((a, b) =>
      b.apps - a.apps || b.goals - a.goals || a.teamName.localeCompare(b.teamName)
    )[0] || null
  }, [playerCareer])

  const nationColor = TEAM_COLORS[playerNation] || (isFemale ? '#ec4899' : isMale ? '#3b82f6' : '#64748b')
  const statusAccent = isLegend ? '#fbbf24' : isIcon ? '#cbd5e1' : nationColor

  const totalCareerApps = useMemo(() => sortedPlayerCareer.reduce((sum: number, c: any) => sum + Number(c.apps || 0), 0), [sortedPlayerCareer])
  const totalCareerGoals = useMemo(() => sortedPlayerCareer.reduce((sum: number, c: any) => sum + Number(c.goals || 0), 0), [sortedPlayerCareer])

  const teamTrophies = useMemo(() => awards.filter((a: any) => {
    const cat = String(a.category || '').toLowerCase()
    return cat.includes('team') || cat.includes('trophy') || !cat
  }), [awards])

  const individualAwards = useMemo(() => awards.filter((a: any) => {
    const cat = String(a.category || '').toLowerCase()
    return cat.includes('indiv') || cat.includes('award') || cat.includes('personal')
  }), [awards])

  const totalTrophiesCount = useMemo(() => {
    const playerTrophies = Number((player as any).trophies || 0)
    return playerTrophies > 0 ? playerTrophies : teamTrophies.reduce((sum: number, a: any) => sum + Number(a.amount || 1), 0)
  }, [player, teamTrophies])

  const totalAwardsCount = useMemo(() => {
    const playerAwards = Number((player as any).awards || 0)
    return playerAwards > 0 ? playerAwards : individualAwards.reduce((sum: number, a: any) => sum + Number(a.amount || 1), 0)
  }, [player, individualAwards])

  const displayApps = Number((player as any).apps ?? totalCareerApps ?? 0)
  const displayGoals = Number((player as any).goals ?? totalCareerGoals ?? 0)
  const displayAssists = Number((player as any).assists ?? 0)
  const goalContributions = displayGoals + displayAssists
  const goalsPerGame = displayApps > 0 ? displayGoals / displayApps : 0

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors"
        >
          ← BACK TO DIRECTORY
        </Link>

        {/* 1. Player Database Dossier Header */}
        <section
          className="group relative overflow-hidden rounded-md border backdrop-blur-xl"
          style={{
            borderColor: `${statusAccent}80`,
            boxShadow: `0 0 55px ${statusAccent}14`,
            background: `radial-gradient(circle at 8% 15%, ${nationColor}28 0%, transparent 32%), radial-gradient(circle at 92% 0%, ${statusAccent}18 0%, transparent 30%), linear-gradient(135deg, rgba(15,23,42,.98), rgba(7,12,25,.99))`,
          }}
        >
          <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:scale-125 group-hover:opacity-30" style={{ backgroundColor: nationColor }} />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-15 transition-all duration-700 group-hover:scale-125 group-hover:opacity-25" style={{ backgroundColor: statusAccent }} />

          <div className="relative z-10 border-b border-white/10 px-5 py-3 sm:px-7 flex items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-slate-500">
              <span className="h-1.5 w-8" style={{ backgroundColor: statusAccent }} />
              PLAYER DATABASE DOSSIER
            </div>
            <div className="hidden sm:block text-[9px] uppercase tracking-[0.2em] text-slate-600">
              FM SQUAD ARCHIVE • VERIFIED PROFILE
            </div>
          </div>

          <div className="relative z-10 p-5 sm:p-7 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-7 lg:gap-9 items-stretch">
              <div className="flex flex-col items-center lg:items-stretch gap-3">
                <div
                  className="relative w-48 h-56 sm:w-52 sm:h-60 lg:w-full lg:h-64 overflow-hidden border bg-slate-950/75 shadow-2xl flex items-center justify-center p-3"
                  style={{ borderColor: `${nationColor}66` }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${nationColor}35, transparent 45%, ${statusAccent}22)` }} />
                  {playerImage ? (
                    <img src={storageUrl(playerImage)} alt={player.name} className="relative z-10 w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.025]" />
                  ) : (
                    <span className="relative z-10 text-slate-500 font-mono text-xs">NO IMAGE</span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-slate-950/90 to-transparent" />
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-center">
                  <div className="border border-white/10 bg-slate-950/60 px-2 py-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-600">Gender</div>
                    <div className="mt-0.5 text-xs font-bold uppercase" style={{ color: nationColor }}>
                      {isFemale ? 'Female' : isMale ? 'Male' : '—'}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-slate-950/60 px-2 py-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-600">Archive</div>
                    <div className="mt-0.5 text-xs font-bold text-white">{(player as any).is_retired_player ? 'RETIRED' : 'ACTIVE'}</div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: statusAccent, borderColor: `${statusAccent}88`, backgroundColor: `${statusAccent}16` }}
                  >
                    <span className="h-1.5 w-1.5" style={{ backgroundColor: statusAccent }} />
                    {statusText}
                  </span>
                  {playerFlag && (
                    <Link
                      to="/nation/$nation"
                      params={{ nation: playerNation }}
                      className="inline-flex items-center gap-2 border border-white/10 bg-slate-950/50 px-2.5 py-1 font-mono text-[10px] text-slate-300 hover:border-white/30 hover:text-white transition-colors"
                    >
                      <img src={storageUrl(playerFlag)} alt={playerNation} className="h-5 w-7 max-h-5 max-w-7 shrink-0 rounded-sm object-contain" />
                      {playerNation}
                    </Link>
                  )}
                </div>

                <div className="mt-4">
                  <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase leading-none tracking-wide text-white">
                    {player.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs uppercase tracking-wider text-slate-400">
                    <span className="font-bold text-slate-200">{playerPos}</span>
                    <span className="text-slate-700">•</span>
                    <Link to="/nation/$nation" params={{ nation: playerNation }} className="hover:text-white transition-colors">
                      {playerNation}
                    </Link>
                  </div>
                </div>

                {/* Primary club identity: club with the most career appearances */}
                <div className="mt-6">
                  {mostPlayedClub ? (
                    <Link
                      to="/club/$club"
                      params={{ club: mostPlayedClub.teamName }}
                      className="group/club block border border-white/10 bg-slate-950/55 p-3 hover:border-white/25 hover:bg-slate-950/75 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 flex-shrink-0 border border-white/10 bg-slate-900/80 flex items-center justify-center p-2">
                          {mostPlayedClub.logo ? (
                            <img src={storageUrl(mostPlayedClub.logo)} alt="" className="h-full w-full object-contain transition-transform duration-300 group-hover/club:scale-110" />
                          ) : (
                            <span className="font-heading text-[10px] font-bold text-slate-500">CLUB</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-slate-600">
                            <span className="h-1.5 w-5 bg-slate-500" />
                            Most Played Club
                          </div>
                          <div className="mt-0.5 truncate text-sm font-bold text-white group-hover/club:text-slate-200">{mostPlayedClub.teamName}</div>
                        </div>
                        <div className="hidden sm:block text-right font-mono">
                          <div className="text-[9px] uppercase tracking-widest text-slate-600">Career Apps</div>
                          <div className="text-sm font-extrabold text-white">{mostPlayedClub.apps.toLocaleString()}</div>
                        </div>
                        <span className="text-slate-600 group-hover/club:text-white transition-colors">→</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="border border-white/10 bg-slate-950/55 p-3 font-mono text-xs text-slate-500">NO CLUB RECORD</div>
                  )}
                </div>

                {(isLegend && legendClubs.length > 0) || (isIcon && iconClubs.length > 0) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isLegend && legendClubs.map((clubName: string) => (
                      <Link key={clubName} to="/club/$club" params={{ club: clubName }} className="border border-amber-400/45 bg-amber-400/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-400/15 transition-colors">
                        ★ LEGEND • {clubName}
                      </Link>
                    ))}
                    {isIcon && iconClubs.map((clubName: string) => (
                      <Link key={clubName} to="/club/$club" params={{ club: clubName }} className="border border-slate-300/35 bg-slate-300/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:bg-slate-300/15 transition-colors">
                        ◆ ICON • {clubName}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 font-mono text-center">
                  {[
                    { label: 'APPS', value: displayApps, color: nationColor },
                    { label: 'GOALS', value: displayGoals, color: nationColor },
                    { label: 'ASSISTS', value: displayAssists, color: nationColor },
                    { label: 'G+A', value: goalContributions, color: '#a78bfa' },
                    { label: 'G/GM', value: goalsPerGame.toFixed(2), color: '#60a5fa' },
                    { label: 'TROPHIES', value: totalTrophiesCount, color: '#fbbf24' },
                    { label: 'AWARDS', value: totalAwardsCount, color: '#34d399' },
                  ].map(({ label, value, color }) => (
                    <div key={String(label)} className="border border-white/10 bg-slate-950/60 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-950/80">
                      <div className="text-lg sm:text-xl font-extrabold text-white" style={{ textShadow: `0 0 14px ${color}35` }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </div>
                      <div className="mt-0.5 text-[8px] uppercase tracking-widest text-slate-600">{label}</div>
                      <div className="mx-auto mt-2 h-0.5 w-8 transition-all duration-300" style={{ backgroundColor: color }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Performance Milestones Archive */}
        <section className="border border-slate-800/90 bg-slate-900/70">
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-slate-600">RECORD INDEX 02</div>
              <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">PERFORMANCE MILESTONES</h2>
            </div>
            <div className="hidden sm:block font-mono text-[9px] uppercase tracking-widest text-slate-600">RANKING HISTORY</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-800/80">
            <div className="bg-slate-950/70 p-5">
              <div className="mb-3 text-[9px] font-mono font-bold uppercase tracking-[0.22em] text-amber-400">PERSONAL RECORD</div>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {[
                  ['1ST', player.personal_1st ?? 0, 'text-amber-400'],
                  ['2ND', player.personal_2nd ?? 0, 'text-white'],
                  ['3RD', player.personal_3rd ?? 0, 'text-slate-300'],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="border border-slate-800 bg-slate-900/70 p-3 text-center">
                    <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-950/70 p-5">
              <div className="mb-3 text-[9px] font-mono font-bold uppercase tracking-[0.22em] text-emerald-400">TEAM RECORD</div>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {[
                  ['1ST', player.team_1st ?? 0, 'text-emerald-400'],
                  ['2ND', player.team_2nd ?? 0, 'text-white'],
                  ['3RD', player.team_3rd ?? 0, 'text-slate-300'],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="border border-slate-800 bg-slate-900/70 p-3 text-center">
                    <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Player Career History */}
        <section className="border border-slate-800/90 bg-slate-900/70">
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-slate-600">RECORD INDEX 03</div>
              <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">CAREER RECORD</h2>
            </div>
            <div className="hidden sm:block font-mono text-[9px] uppercase tracking-widest text-slate-600">CLUB HISTORY / VERIFIED</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500 uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4">Club</th><th className="py-3 px-4">Country</th><th className="py-3 px-4">Years</th><th className="py-3 px-4 text-right">Apps</th><th className="py-3 px-4 text-right">Gls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sortedPlayerCareer.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {entry.club_logo_url && <img src={storageUrl(entry.club_logo_url)} alt="" className="w-5 h-5 object-contain" />}
                        <span>{entry.team_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{entry.country || '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{entry.years || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{entry.apps ?? '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">{entry.goals ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950/80 font-bold">
                  <td className="py-3 px-4 text-white uppercase">TOTAL</td><td /><td /><td className="py-3 px-4 text-right text-white">{totalCareerApps}</td><td className="py-3 px-4 text-right text-emerald-400">{totalCareerGoals}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* 4. Managerial / Coaching History */}
        {coachCareer.length > 0 && (
          <section className="border border-slate-800/90 bg-slate-900/70">
            <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-slate-600">RECORD INDEX 04</div>
              <h2 className="mt-1 font-heading text-2xl font-extrabold uppercase tracking-wider text-white">MANAGERIAL RECORD</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead><tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500 uppercase text-[9px] tracking-wider"><th className="py-3 px-4">Team</th><th className="py-3 px-4">Country</th><th className="py-3 px-4">Years</th><th className="py-3 px-4 text-right">Matches</th><th className="py-3 px-4 text-right">Win %</th></tr></thead>
                <tbody className="divide-y divide-slate-800/70">
                  {coachCareer.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">{entry.club_logo_url && <img src={storageUrl(entry.club_logo_url)} alt="" className="w-5 h-5 object-contain" />}{entry.team_name}</td>
                      <td className="py-3 px-4 text-slate-400">{entry.country || '-'}</td><td className="py-3 px-4 text-slate-300">{entry.years || '-'}</td><td className="py-3 px-4 text-right font-bold text-white">{entry.matches_managed ?? '-'}</td><td className="py-3 px-4 text-right font-bold text-emerald-400">{entry.win_percentage ? `${entry.win_percentage}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 5. Honours Archive */}
        <section className="border border-slate-800/90 bg-slate-900/70">
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-slate-600">RECORD INDEX 05</div>
              <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">HONOURS ARCHIVE</h2>
            </div>
            <div className="flex items-center gap-1 border border-slate-800 bg-slate-950/60 p-1 font-mono text-[9px]">
              <button onClick={() => setAwardTab('team')} className={`px-3 py-2 font-bold uppercase tracking-wider transition-colors ${awardTab === 'team' ? 'bg-amber-400 text-slate-950' : 'text-slate-500 hover:text-white'}`}>TEAM TROPHIES · {totalTrophiesCount}</button>
              <button onClick={() => setAwardTab('individual')} className={`px-3 py-2 font-bold uppercase tracking-wider transition-colors ${awardTab === 'individual' ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:text-white'}`}>INDIVIDUAL AWARDS · {totalAwardsCount}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800/70">
            {(awardTab === 'team' ? teamTrophies : individualAwards).map((item: any) => (
              <div key={item.id} className="bg-slate-950/65 p-4 flex items-center gap-4 hover:bg-slate-950/90 transition-colors">
                <div className="min-w-12 border border-slate-800 bg-slate-900 px-3 py-2 text-center font-mono text-xl font-extrabold text-amber-400">{item.amount || 1}</div>
                <div className="min-w-0 flex-1"><div className="text-white font-bold text-sm truncate">{item.name}</div>{item.years_or_details && <div className="text-[10px] text-slate-500 truncate mt-1">{item.years_or_details}</div>}</div>
              </div>
            ))}
          </div>
          {(awardTab === 'team' ? teamTrophies : individualAwards).length === 0 && <div className="p-8 text-center font-mono text-xs uppercase tracking-wider text-slate-600">NO RECORDS IN THIS ARCHIVE</div>}
        </section>

        {/* 6. Biography / Archive Notes */}
        {player.biography && (
          <section className="border border-slate-800/90 bg-slate-900/70">
            <div className="border-b border-slate-800 px-5 py-4 sm:px-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-slate-600">RECORD INDEX 06</div>
                <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">ARCHIVE NOTES</h2>
              </div>
              <div className="hidden sm:block font-mono text-[9px] uppercase tracking-widest text-slate-600">BIOGRAPHICAL RECORD</div>
            </div>
            <div className="p-5 sm:p-7 bg-[linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:32px_32px]">
              <div className="max-w-4xl border-l-2 border-slate-700 pl-5 sm:pl-7 text-slate-300 text-xs sm:text-sm leading-relaxed space-y-4 font-mono">
                {player.biography.split('\n\n').map((paragraph: string, idx: number) => <p key={idx}>{paragraph}</p>)}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
