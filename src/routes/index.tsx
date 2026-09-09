import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { PlayerCard } from '../components/fm/PlayerCard'
import { TEAM_COLORS } from '../lib/team-colors'

const PAGE_SIZE = 12

export const Route = createFileRoute('/')({
  loader: async () => {
    const { data, error } = await supabase
      .from('player_directory_view')
      .select('*')
      .order('trophies', { ascending: false })

    if (error) {
      console.error('Error fetching squad archive:', error)
      return { players: [] as Player[] }
    }

    return { players: (data || []) as Player[] }
  },
  component: DirectoryPage,
})

function DirectoryPage() {
  const { players } = Route.useLoaderData()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [genderMode, setGenderMode] = useState<'both' | 'male' | 'female'>('both')
  const [club, setClub] = useState('all')
  const [nation, setNation] = useState('all')
  const [sortBy, setSortBy] = useState('trophies')
  const [page, setPage] = useState(1)

  // Toggle gender mode when pressing header button
  const toggleGenderMode = () => {
    setPage(1)
    if (genderMode === 'both') setGenderMode('male')
    else if (genderMode === 'male') setGenderMode('female')
    else setGenderMode('both')
  }

  const clubs = useMemo(() => {
    const unique = new Set(
      players.map((p) => p.club_name || p.current_club || p.club).filter(Boolean)
    )
    return Array.from(unique).sort()
  }, [players])

  const nations = useMemo(() => {
    const unique = new Set(
      players.map((p) => p.nation || p.nationality || p.nationality_name).filter(Boolean)
    )
    return Array.from(unique).sort()
  }, [players])

  const filteredPlayers = useMemo(() => {
    return players
      .filter((player) => {
        const playerClub = player.club_name || player.current_club || player.club || ''
        const playerNation = player.nation || player.nationality || player.nationality_name || ''
        const playerGender = (player.gender || '').toLowerCase()

        const matchesSearch =
          !search ||
          player.name.toLowerCase().includes(search.toLowerCase()) ||
          playerClub.toLowerCase().includes(search.toLowerCase()) ||
          playerNation.toLowerCase().includes(search.toLowerCase())

        const matchesStatus =
          status === 'all' ||
          (player.status || player.legacy_status || '').toLowerCase().includes(status.toLowerCase())

        const matchesGender =
          genderMode === 'both' ||
          (genderMode === 'female' && (playerGender === 'female' || playerGender === 'f')) ||
          (genderMode === 'male' && (playerGender === 'male' || playerGender === 'm'))

        const matchesClub = club === 'all' || playerClub === club
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

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1)
  }, [search, status, genderMode, club, nation, sortBy])

  const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE) || 1
  const paginatedPlayers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredPlayers.slice(start, start + PAGE_SIZE)
  }, [filteredPlayers, page])

  const leftColor = club !== 'all' && TEAM_COLORS[club] ? TEAM_COLORS[club] : 'transparent'
  const rightColor = nation !== 'all' && TEAM_COLORS[nation] ? TEAM_COLORS[nation] : 'transparent'

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 transition-all duration-700 relative"
      style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, ${leftColor}33 0%, transparent 45%),
          radial-gradient(circle at 90% 20%, ${rightColor}33 0%, transparent 45%)
        `,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Card */}
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="text-xs font-mono font-semibold tracking-widest text-emerald-400 uppercase mb-1">
            Database Archive
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Interactive Header Button */}
            <button
              onClick={toggleGenderMode}
              type="button"
              className="text-left group focus:outline-none"
            >
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-wide group-hover:text-emerald-400 transition-colors flex items-center gap-3">
                SQUAD DIRECTORY
                <span className="text-xs font-mono px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-normal">
                  {genderMode === 'both' ? 'MALE & FEMALE' : genderMode === 'male' ? 'MALE ONLY' : 'FEMALE ONLY'}
                </span>
              </h1>
            </button>
          </div>

          <p className="text-slate-400 text-sm mt-1">
            {players.length} profiles recorded across legends, icons, and squad members. Click header to toggle gender view.
          </p>

          {/* Filter Bar */}
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

        {/* Pagination Controls */}
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
