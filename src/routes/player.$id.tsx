import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'

function normalizeClubName(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(football|futbol|club|fc|cf|afc|ac|sc|calcio|de|del|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
}

const CLUB_ALIASES: Record<string, string> = {
  manchesterunited: 'manchesterunited',
  manchesterutd: 'manchesterunited',
  manunited: 'manchesterunited',
  manutd: 'manchesterunited',
  manu: 'manchesterunited',
  manchesteru: 'manchesterunited',
  manchesterunitedfc: 'manchesterunited',
  manchesterunitedfootballclub: 'manchesterunited',
  bayernmunich: 'bayernmunich',
  bayernmunchen: 'bayernmunich',
  fcbayern: 'bayernmunich',
  psg: 'parissaintgermain',
  parissaintgermain: 'parissaintgermain',
  barcelona: 'barcelona',
  barca: 'barcelona',
  realmadrid: 'realmadrid',
  realmadridcf: 'realmadrid',
  milan: 'milan',
  acmilan: 'milan',
  inter: 'intermilan',
  intermilan: 'intermilan',
  internazionale: 'intermilan',
}

function canonicalClubKey(value: unknown): string {
  const normalized = normalizeClubName(value)
  return CLUB_ALIASES[normalized] || normalized
}

function sameClubName(a: unknown, b: unknown): boolean {
  const left = canonicalClubKey(a)
  const right = canonicalClubKey(b)
  if (!left || !right) return false
  if (left === right) return true
  if (left.length >= 8 && right.length >= 8) {
    return left.startsWith(right) || right.startsWith(left)
  }
  return false
}

function resolveCanonicalClub(clubName: unknown, clubDirectoryRows: any[]): string | null {
  const match = clubDirectoryRows.find((row: any) => sameClubName(row.club_name, clubName))
  return match?.club_name ? String(match.club_name).trim() : null
}

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

      const [playerCareerRes, coachCareerRes, awardsRes, clubViewRes] = await Promise.all([
        supabase.from('player_career_history').select('*').eq('player_id', playerId),
        supabase.from('coach_career_history').select('*').eq('player_id', playerId),
        supabase.from('awards_and_trophies').select('*').eq('player_id', playerId),
        supabase.from('club_leaderboard_view').select('club_name, club_logo_url'),
      ])

      const clubDirectoryRows = (clubViewRes.data || [])
        .map((row: any) => ({
          club_name: String(row.club_name || '').trim(),
          club_logo_url: String(row.club_logo_url || '').trim(),
        }))
        .filter((row: any) => row.club_name)

      return {
        player: (playerRes.data || null) as Player | null,
        playerCareer: playerCareerRes.data || [],
        coachCareer: coachCareerRes.data || [],
        awards: awardsRes.data || [],
        clubDirectoryRows,
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
  const { player, playerCareer, coachCareer, awards, clubDirectoryRows } = Route.useLoaderData()
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

  const resolveLegacyClub = (clubName: string) =>
    resolveCanonicalClub(clubName, clubDirectoryRows)

  const sortedPlayerCareer = useMemo(() => {
    return [...playerCareer].sort((a: any, b: any) => {
      return getStartYear(b.years) - getStartYear(a.years)
    })
  }, [playerCareer])

  const latestClub = sortedPlayerCareer[0] as any
  const latestClubName = latestClub?.team_name || player.current_club || '—'
  const latestClubLogo = latestClub?.club_logo_url || null
  const nationColor = TEAM_COLORS[playerNation] || (isFemale ? '#ec4899' : isMale ? '#3b82f6' : '#64748b')
  const statusAccent = isLegend ? '#fbbf24' : isIcon ? '#cbd5e1' : nationColor

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

        {/* 1. Player Database Dossier Header */}
        <section
          className="group relative overflow-hidden rounded-3xl border backdrop-blur-xl"
          style={{
            borderColor: `${statusAccent}80`,
            boxShadow: `0 0 55px ${statusAccent}14`,
            background: `radial-gradient(circle at 8% 15%, ${nationColor}28 0%, transparent 32%), radial-gradient(circle at 92% 0%, ${statusAccent}18 0%, transparent 30%), linear-gradient(135deg, rgba(15,23,42,.98), rgba(7,12,25,.99))`,
          }}
        >
          <div
            className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:scale-125 group-hover:opacity-30"
            style={{ backgroundColor: nationColor }}
          />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-15 transition-all duration-700 group-hover:scale-125 group-hover:opacity-25"
            style={{ backgroundColor: statusAccent }}
          />

          <div className="relative z-10 border-b border-white/10 px-5 py-3 sm:px-7 flex items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-slate-500">
              <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: statusAccent }} />
              PLAYER DATABASE DOSSIER
            </div>
            <div className="hidden sm:block text-[9px] uppercase tracking-[0.2em] text-slate-600">
              FM SQUAD ARCHIVE • VERIFIED PROFILE
            </div>
          </div>

          <div className="relative z-10 p-5 sm:p-7 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-7 lg:gap-9 items-stretch">
              {/* Portrait / identity plate */}
              <div className="flex flex-col items-center lg:items-stretch gap-3">
                <div
                  className="relative w-48 h-56 sm:w-52 sm:h-60 lg:w-full lg:h-64 rounded-2xl overflow-hidden border bg-slate-950/75 shadow-2xl flex items-center justify-center p-3"
                  style={{ borderColor: `${nationColor}66` }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{ background: `linear-gradient(135deg, ${nationColor}35, transparent 45%, ${statusAccent}22)` }}
                  />
                  {playerImage ? (
                    <img
                      src={storageUrl(playerImage)}
                      alt={player.name}
                      className="relative z-10 w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                    />
                  ) : (
                    <span className="relative z-10 text-slate-500 font-mono text-xs">NO IMAGE</span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-slate-950/90 to-transparent" />
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-center">
                  <div className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-600">Gender</div>
                    <div className="mt-0.5 text-xs font-bold uppercase" style={{ color: nationColor }}>
                      {isFemale ? 'Female' : isMale ? 'Male' : '—'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2">
                    <div className="text-[9px] uppercase tracking-widest text-slate-600">Archive</div>
                    <div className="mt-0.5 text-xs font-bold text-white">ACTIVE</div>
                  </div>
                </div>
              </div>

              {/* Main player information */}
              <div className="min-w-0 flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: statusAccent,
                      borderColor: `${statusAccent}88`,
                      backgroundColor: `${statusAccent}16`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusAccent }} />
                    {statusText}
                  </span>
                  {playerFlag && (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1 font-mono text-[10px] text-slate-300">
                      <img src={playerFlag} alt={playerNation} className="h-4 w-5 rounded-sm object-cover" />
                      {playerNation}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase leading-none tracking-wide text-white">
                    {player.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs uppercase tracking-wider text-slate-400">
                    <span className="font-bold text-slate-200">{playerPos}</span>
                    <span className="text-slate-700">•</span>
                    <Link
                      to="/nation/$nation"
                      params={{ nation: playerNation }}
                      className="hover:text-white transition-colors"
                    >
                      {playerNation}
                    </Link>
                  </div>
                </div>

                {/* Club identity strip */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3 flex items-center gap-3">
                    <div className="h-11 w-11 flex-shrink-0 rounded-lg border border-white/10 bg-slate-900/80 flex items-center justify-center p-2">
                      {latestClubLogo ? (
                        <img src={storageUrl(latestClubLogo)} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="font-heading text-[10px] font-bold text-slate-500">CLUB</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Latest Club</div>
                      <div className="mt-0.5 truncate text-sm font-bold text-white">{latestClubName}</div>
                    </div>
                  </div>

                  <Link
                    to="/nation/$nation"
                    params={{ nation: playerNation }}
                    className="rounded-xl border border-white/10 bg-slate-950/55 p-3 flex items-center gap-3 transition-colors hover:border-white/25 hover:bg-slate-950/75"
                  >
                    <div className="h-11 w-11 flex-shrink-0 rounded-lg border border-white/10 bg-slate-900/80 flex items-center justify-center">
                      {playerFlag ? (
                        <img src={playerFlag} alt="" className="h-7 w-9 rounded-sm object-cover" />
                      ) : (
                        <span className="text-lg">🌐</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-slate-600">National Identity • OPEN DOSSIER</div>
                      <div className="mt-0.5 truncate text-sm font-bold text-white">{playerNation}</div>
                    </div>
                  </Link>
                </div>

                {/* Status / club recognition */}
                {(isLegend && legendClubs.length > 0) || (isIcon && iconClubs.length > 0) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {isLegend && legendClubs.map((clubName: string) => {
                      const canonicalClub = resolveLegacyClub(clubName)
                      return canonicalClub ? (
                        <Link
                          key={clubName}
                          to="/club/$club"
                          params={{ club: canonicalClub }}
                          className="rounded-lg border border-amber-400/45 bg-amber-400/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-400/20 hover:border-amber-300/70"
                        >
                          ★ LEGEND • {clubName}
                        </Link>
                      ) : (
                        <span
                          key={clubName}
                          className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300/60"
                        >
                          ★ LEGEND • {clubName}
                        </span>
                      )
                    })}
                    {isIcon && iconClubs.map((clubName: string) => {
                      const canonicalClub = resolveLegacyClub(clubName)
                      return canonicalClub ? (
                        <Link
                          key={clubName}
                          to="/club/$club"
                          params={{ club: canonicalClub }}
                          className="rounded-lg border border-slate-300/35 bg-slate-300/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200 transition-colors hover:bg-slate-300/20 hover:border-slate-200/70"
                        >
                          ◆ ICON • {clubName}
                        </Link>
                      ) : (
                        <span
                          key={clubName}
                          className="rounded-lg border border-slate-300/20 bg-slate-300/5 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300/60"
                        >
                          ◆ ICON • {clubName}
                        </span>
                      )
                    })}
                  </div>
                ) : null}

                {/* Headline statistics */}
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
                    <div
                      key={String(label)}
                      className="group/stat rounded-xl border border-white/10 bg-slate-950/60 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-950/80"
                    >
                      <div className="text-lg sm:text-xl font-extrabold text-white" style={{ textShadow: `0 0 14px ${color}35` }}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                      </div>
                      <div className="mt-0.5 text-[8px] uppercase tracking-widest text-slate-600">{label}</div>
                      <div className="mx-auto mt-2 h-0.5 w-8 rounded-full transition-all duration-300 group-hover/stat:w-12" style={{ backgroundColor: color }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

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
