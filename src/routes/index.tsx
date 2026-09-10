import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { PlayerCard } from '../components/fm/PlayerCard'
import { TEAM_COLORS } from '../lib/team-colors'

const PAGE_SIZE = 12

export const Route = createFileRoute('/')({
  loader: async () => {
    let { data, error } = await supabase
      .from('player_directory_view')
      .select('*')
      .order('trophies', { ascending: false })

    if (error || !data || data.length === 0) {
      const fallback = await supabase
        .from('players')
        .select('*')
        .order('trophies', { ascending: false })
      data = fallback.data || []
    }

    // Pull club logos from the career-history table so the selected club
    // legacy card can use the real database logo instead of generated initials.
    const { data: careerLogoRows } = await supabase
      .from('player_career_history')
      .select('team_name, club_logo_url')

    const clubLogoMap: Record<string, string> = {}
    ;(careerLogoRows || []).forEach((row: any) => {
      const teamName = String(row.team_name || '').trim()
      const logo = String(row.club_logo_url || '').trim()
      if (teamName && logo && !clubLogoMap[teamName]) {
        clubLogoMap[teamName] = logo
      }
    })

    return { players: (data || []) as Player[], clubLogoMap }
  },
  component: DirectoryPage,
})

function DirectoryPage() {
  const { players, clubLogoMap } = Route.useLoaderData()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [genderMode, setGenderMode] = useState<'both' | 'male' | 'female'>('male')
  const [club, setClub] = useState('all')
  const [nation, setNation] = useState('all')
  const [sortBy, setSortBy] = useState('trophies')
  const [page, setPage] = useState(1)
  const [filtersReady, setFiltersReady] = useState(false)
  const skipInitialPageReset = useRef(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fm_directory_state')
      if (saved) {
        const state = JSON.parse(saved) as {
          search?: string
          status?: string
          genderMode?: 'both' | 'male' | 'female'
          club?: string
          nation?: string
          sortBy?: string
          page?: number
        }

        if (typeof state.search === 'string') setSearch(state.search)
        if (typeof state.status === 'string') setStatus(state.status)
        if (state.genderMode === 'both' || state.genderMode === 'male' || state.genderMode === 'female') {
          setGenderMode(state.genderMode)
        }
        if (typeof state.club === 'string') setClub(state.club)
        if (typeof state.nation === 'string') setNation(state.nation)
        if (
          state.sortBy === 'trophies' ||
          state.sortBy === 'apps' ||
          state.sortBy === 'goals' ||
          state.sortBy === 'awards' ||
          state.sortBy === 'name'
        ) {
          setSortBy(state.sortBy)
        }
        if (typeof state.page === 'number' && Number.isFinite(state.page) && state.page >= 1) {
          setPage(Math.floor(state.page))
        }
      }
    } catch {
      // Ignore malformed saved directory state and use the defaults.
    } finally {
      setFiltersReady(true)
    }
  }, [])

  useEffect(() => {
    if (!filtersReady) return

    localStorage.setItem(
      'fm_directory_state',
      JSON.stringify({ search, status, genderMode, club, nation, sortBy, page }),
    )
  }, [filtersReady, search, status, genderMode, club, nation, sortBy, page])

  const toggleGenderMode = () => {
    setPage(1)
    if (genderMode === 'both') setGenderMode('male')
    else if (genderMode === 'male') setGenderMode('female')
    else setGenderMode('both')
  }

  const clubs = useMemo(() => {
    const clubSet = new Set<string>()
    players.forEach((p) => {
      if (Array.isArray(p.legend_at_clubs)) {
        p.legend_at_clubs.forEach((c) => c && clubSet.add(c))
      }
      if (Array.isArray(p.icon_at_clubs)) {
        p.icon_at_clubs.forEach((c) => c && clubSet.add(c))
      }
      if (p.club_name) clubSet.add(p.club_name)
      if (p.current_club) clubSet.add(p.current_club)
    })
    return Array.from(clubSet).sort()
  }, [players])

  const nations = useMemo(() => {
    const unique = new Set(players.map((p) => p.nationality || p.nation).filter(Boolean))
    return Array.from(unique).sort()
  }, [players])

  const filteredPlayers = useMemo(() => {
    return players
      .filter((player) => {
        const playerNation = player.nationality || player.nation || ''
        const playerGender = (player.gender || '').toLowerCase()

        const playerClubs = [
          ...(player.legend_at_clubs || []),
          ...(player.icon_at_clubs || []),
          player.club_name,
          player.current_club,
        ].filter(Boolean) as string[]

        const matchesSearch =
          !search ||
          player.name.toLowerCase().includes(search.toLowerCase()) ||
          playerNation.toLowerCase().includes(search.toLowerCase()) ||
          playerClubs.some((c) => c.toLowerCase().includes(search.toLowerCase()))

        const matchesStatus =
          status === 'all' ||
          (player.status || '').toLowerCase().includes(status.toLowerCase())

        const matchesGender =
          genderMode === 'both' ||
          (genderMode === 'female' && (playerGender === 'female' || playerGender === 'f')) ||
          (genderMode === 'male' && (playerGender === 'male' || playerGender === 'm'))

        const matchesClub = club === 'all' || playerClubs.includes(club)
        const matchesNation = nation === 'all' || playerNation === nation

        return matchesSearch && matchesStatus && matchesGender && matchesClub && matchesNation
      })
      .sort((a, b) => {
        if (sortBy === 'trophies') return (b.trophies || 0) - (a.trophies || 0)
        if (sortBy === 'apps') return (b.apps || 0) - (a.apps || 0)
        if (sortBy === 'goals') return (b.goals || 0) - (a.goals || 0)
        if (sortBy === 'awards') return (b.awards || 0) - (a.awards || 0)
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return 0
      })
  }, [players, search, status, genderMode, club, nation, sortBy])

  // Club Dynasty Stat Calculations (Total Apps & Goals)
  const clubLegacyStats = useMemo(() => {
    if (club === 'all') return null
    const clubPlayers = players.filter((p) => {
      const pClubs = [
        ...(p.legend_at_clubs || []),
        ...(p.icon_at_clubs || []),
        p.club_name,
        p.current_club,
      ]
      return pClubs.includes(club)
    })
    return {
      name: club,
      count: clubPlayers.length,
      apps: clubPlayers.reduce((sum, p) => sum + (p.apps || 0), 0),
      goals: clubPlayers.reduce((sum, p) => sum + (p.goals || 0), 0),
      trophies: clubPlayers.reduce((sum, p) => sum + (p.trophies || 0), 0),
      awards: clubPlayers.reduce((sum, p) => sum + (p.awards || 0), 0),
    }
  }, [players, club])

  // Country Dynasty Stat Calculations (Total Apps & Goals)
  const nationLegacyStats = useMemo(() => {
    if (nation === 'all') return null
    const nationPlayers = players.filter((p) => (p.nationality || p.nation) === nation)
    return {
      name: nation,
      count: nationPlayers.length,
      apps: nationPlayers.reduce((sum, p) => sum + (p.apps || 0), 0),
      goals: nationPlayers.reduce((sum, p) => sum + (p.goals || 0), 0),
      trophies: nationPlayers.reduce((sum, p) => sum + (p.trophies || 0), 0),
      awards: nationPlayers.reduce((sum, p) => sum + (p.awards || 0), 0),
    }
  }, [players, nation])

  useEffect(() => {
    if (!filtersReady) return
    if (skipInitialPageReset.current) {
      skipInitialPageReset.current = false
      return
    }
    setPage(1)
  }, [filtersReady, search, status, genderMode, club, nation, sortBy])

  const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE) || 1
  const paginatedPlayers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredPlayers.slice(start, start + PAGE_SIZE)
  }, [filteredPlayers, page])

  // Keep each side independently valid. `transparent33` is not a valid CSS color,
  // so using it as the fallback would invalidate the entire background-image when
  // only one filter is selected.
  const leftColor = club !== 'all' && TEAM_COLORS[club] ? `${TEAM_COLORS[club]}33` : 'transparent'
  const rightColor = nation !== 'all' && TEAM_COLORS[nation] ? `${TEAM_COLORS[nation]}33` : 'transparent'

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 transition-all duration-700 relative"
      style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, ${leftColor} 0%, transparent 45%),
          radial-gradient(circle at 90% 20%, ${rightColor} 0%, transparent 45%)
        `,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-heading font-extrabold tracking-wider text-xl text-white">FM SQUAD ARCHIVE</span>
          </div>
          <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-slate-400">
            <Link to="/" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">
              DIRECTORY
            </Link>
            <Link to="/hall-of-fame" className="hover:text-white transition-colors">
              HALL OF FAME
            </Link>
            <Link to="/leaderboards" className="hover:text-white transition-colors">
              RECORDS
            </Link>
            <Link to="/compare" className="hover:text-white transition-colors">
              COMPARE
            </Link>
          </nav>
        </div>

        {/* Directory Card & Filters */}
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="text-xs font-mono font-semibold tracking-widest text-emerald-400 uppercase mb-1">
            Database Archive
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={toggleGenderMode}
              type="button"
              className="text-left group focus:outline-none flex items-center gap-3"
            >
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-wide">
                SQUAD DIRECTORY
              </h1>
              {genderMode === 'male' && (
                <span className="text-xs font-mono px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-bold">
                  M
                </span>
              )}
              {genderMode === 'female' && (
                <span className="text-xs font-mono px-2 py-0.5 rounded border border-pink-500/50 bg-pink-500/20 text-pink-300 font-bold">
                  F
                </span>
              )}
            </button>
          </div>

          <p className="text-slate-400 text-sm mt-1">
            {players.length} profiles recorded across legends, icons, and squad members.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
            <input
              type="text"
              placeholder="Search player or club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="legend">Legend</option>
              <option value="icon">Icon</option>
            </select>

            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="all">All Clubs</option>
              {clubs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={nation}
              onChange={(e) => setNation(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="all">All Nations</option>
              {nations.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="trophies">Most Trophies Won</option>
              <option value="apps">Most Appearances</option>
              <option value="goals">Most Goals Scored</option>
              <option value="awards">Most Individual Awards</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Legacy Summary Banner */}
        {(clubLegacyStats || nationLegacyStats) && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
            {clubLegacyStats && (() => {
              const values = [clubLegacyStats.apps, clubLegacyStats.goals, clubLegacyStats.trophies, clubLegacyStats.awards]
              const maxValue = Math.max(...values, 1)
              const clubLogo =
                clubLogoMap[clubLegacyStats.name] ||
                Object.entries(clubLogoMap).find(([name]) => name.toLowerCase() === clubLegacyStats.name.toLowerCase())?.[1] ||
                null

              return (
                <div
                  className="group relative overflow-hidden rounded-2xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1"
                  style={{
                    borderColor: `${TEAM_COLORS[clubLegacyStats.name] || '#3b82f6'}99`,
                    boxShadow: `0 0 35px ${TEAM_COLORS[clubLegacyStats.name] || '#3b82f6'}22`,
                    background: `radial-gradient(circle at 92% 8%, ${TEAM_COLORS[clubLegacyStats.name] || '#3b82f6'}25 0%, transparent 38%), linear-gradient(135deg, rgba(15,23,42,.97), rgba(7,13,28,.98))`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl opacity-25 transition-all duration-500 group-hover:scale-125 group-hover:opacity-40"
                    style={{ backgroundColor: TEAM_COLORS[clubLegacyStats.name] || '#3b82f6' }}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border bg-slate-950/70 p-2 shadow-inner"
                        style={{
                          borderColor: `${TEAM_COLORS[clubLegacyStats.name] || '#3b82f6'}99`,
                        }}
                      >
                        {clubLogo ? (
                          <img
                            src={clubLogo}
                            alt={clubLegacyStats.name}
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <span
                            className="font-heading text-lg font-extrabold tracking-wider"
                            style={{ color: TEAM_COLORS[clubLegacyStats.name] || '#93c5fd' }}
                          >
                            CL
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">
                          <span
                            className="h-1.5 w-6 rounded-full"
                            style={{ backgroundColor: TEAM_COLORS[clubLegacyStats.name] || '#3b82f6' }}
                          />
                          CLUB LEGACY
                        </div>
                        <h3 className="mt-1 truncate font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white">
                          {clubLegacyStats.name}
                        </h3>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          {clubLegacyStats.count} profiles • legacy in numbers
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:block rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-right font-mono">
                      <div className="text-[9px] uppercase tracking-widest text-slate-500">Archive</div>
                      <div className="text-xs font-bold text-slate-200">CLUB DOSSIER</div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'APPS', value: clubLegacyStats.apps, accent: 'blue' },
                      { label: 'GLS', value: clubLegacyStats.goals, accent: 'rose' },
                      { label: 'TRPH', value: clubLegacyStats.trophies, accent: 'amber' },
                      { label: 'AWD', value: clubLegacyStats.awards, accent: 'violet' },
                    ].map(({ label, value, accent }) => {
                      const accentClass =
                        accent === 'amber' ? 'text-amber-300' : accent === 'rose' ? 'text-rose-300' : accent === 'violet' ? 'text-violet-300' : 'text-blue-300'
                      const barColor =
                        accent === 'amber' ? '#fbbf24' : accent === 'rose' ? '#fb7185' : accent === 'violet' ? '#a78bfa' : TEAM_COLORS[clubLegacyStats.name] || '#60a5fa'
                      const width = Math.max(8, (Number(value) / maxValue) * 100)

                      return (
                        <div key={label} className="rounded-xl border border-white/10 bg-slate-950/55 p-3 font-mono text-center transition-all duration-300 group-hover:bg-slate-950/70">
                          <div className={`text-xl font-extrabold ${accentClass}`}>{Number(value).toLocaleString()}</div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
                          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    <span className="text-slate-600">FM SQUAD ARCHIVE</span>
                    <Link to="/club/$club" params={{ club: clubLegacyStats.name }} className="font-bold text-slate-400 transition-colors hover:text-white">
                      OPEN CLUB DOSSIER →
                    </Link>
                  </div>
                </div>
              )
            })()}

            {nationLegacyStats && (() => {
              const values = [nationLegacyStats.apps, nationLegacyStats.goals, nationLegacyStats.trophies, nationLegacyStats.awards]
              const maxValue = Math.max(...values, 1)
              const nationPlayer = players.find((p) => (p.nationality || p.nation) === nationLegacyStats.name)
              const flagUrl = nationPlayer?.nationality_flag_url || nationPlayer?.nation_flag || null

              const nationColor = TEAM_COLORS[nationLegacyStats.name] || '#ef4444'

              return (
                <div
                  className="group relative overflow-hidden rounded-2xl border p-5 sm:p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1"
                  style={{
                    borderColor: `${nationColor}99`,
                    boxShadow: `0 0 35px ${nationColor}22`,
                    background: `radial-gradient(circle at 94% 8%, ${nationColor}35 0%, transparent 38%), linear-gradient(135deg, rgba(20,15,24,.97), rgba(10,14,28,.98))`,
                  }}
                >
                  <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl opacity-25 transition-all duration-500 group-hover:scale-125 group-hover:opacity-40" style={{ backgroundColor: nationColor }} />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/70 p-2 shadow-inner">
                        {flagUrl ? (
                          <img src={flagUrl} alt={nationLegacyStats.name} className="max-h-full max-w-full rounded-md object-contain" />
                        ) : (
                          <span className="font-heading text-lg font-extrabold text-slate-300">NAT</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">
                          <span className="h-1.5 w-6 rounded-full bg-red-500" />
                          NATIONAL TEAM LEGACY
                        </div>
                        <h3 className="mt-1 truncate font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white">
                          {nationLegacyStats.name}
                        </h3>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          {nationLegacyStats.count} profiles • national archive
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:block rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-right font-mono">
                      <div className="text-[9px] uppercase tracking-widest text-slate-500">Archive</div>
                      <div className="text-xs font-bold text-slate-200">NATION DOSSIER</div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'APPS', value: nationLegacyStats.apps, barColor: '#ef4444' },
                      { label: 'GLS', value: nationLegacyStats.goals, barColor: '#fb7185' },
                      { label: 'TRPH', value: nationLegacyStats.trophies, barColor: '#fbbf24' },
                      { label: 'AWD', value: nationLegacyStats.awards, barColor: '#f9a8d4' },
                    ].map(({ label, value, barColor }) => {
                      const width = Math.max(8, (Number(value) / maxValue) * 100)
                      return (
                        <div key={label} className="rounded-xl border border-white/10 bg-slate-950/55 p-3 font-mono text-center transition-all duration-300 group-hover:bg-slate-950/70">
                          <div className="text-xl font-extrabold text-white">{Number(value).toLocaleString()}</div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
                          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    <span className="text-slate-600">FM SQUAD ARCHIVE</span>
                    <Link to="/nation/$nation" params={{ nation: nationLegacyStats.name }} className="font-bold text-slate-400 transition-colors hover:text-white">
                      OPEN NATION DOSSIER →
                    </Link>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4 px-1 font-mono text-xs text-slate-400">
          <div>
            SHOWING <span className="text-white font-bold">{paginatedPlayers.length}</span> OF{' '}
            <span className="text-white font-bold">{filteredPlayers.length}</span> RESULTS
          </div>
          <div>
            PAGE <span className="text-white font-bold">{page}</span> OF{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </div>
        </div>

        {/* Squad Grid */}
        {paginatedPlayers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-slate-400 font-mono text-sm">No profiles found matching selected filters.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 font-mono text-xs">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:border-slate-600 transition-colors"
            >
              ← PREVIOUS
            </button>
            <span className="text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:border-slate-600 transition-colors"
            >
              NEXT →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
