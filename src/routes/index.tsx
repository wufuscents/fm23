import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { PlayerCard } from '../components/fm/PlayerCard'
import { TEAM_COLORS } from '../lib/team-colors'

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
  const [club, setClub] = useState('all')
  const [nation, setNation] = useState('all')
  const [sortBy, setSortBy] = useState('trophies')

  const clubs = useMemo(() => {
    const unique = new Set(players.map((p) => p.current_club).filter(Boolean))
    return Array.from(unique).sort()
  }, [players])

  const nations = useMemo(() => {
    const unique = new Set(players.map((p) => p.nation).filter(Boolean))
    return Array.from(unique).sort()
  }, [players])

  const filteredPlayers = useMemo(() => {
    return players
      .filter((player) => {
        const matchesSearch =
          !search ||
          player.name.toLowerCase().includes(search.toLowerCase()) ||
          player.current_club?.toLowerCase().includes(search.toLowerCase()) ||
          player.nation?.toLowerCase().includes(search.toLowerCase())

        const matchesStatus =
          status === 'all' ||
          player.status?.toLowerCase() === status.toLowerCase()

        const matchesClub = club === 'all' || player.current_club === club
        const matchesNation = nation === 'all' || player.nation === nation

        return matchesSearch && matchesStatus && matchesClub && matchesNation
      })
      .sort((a, b) => {
        if (sortBy === 'trophies') return (b.trophies || 0) - (a.trophies || 0)
        if (sortBy === 'apps') return (b.apps || 0) - (a.apps || 0)
        if (sortBy === 'goals') return (b.goals || 0) - (a.goals || 0)
        if (sortBy === 'awards') return (b.awards || 0) - (a.awards || 0)
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return 0
      })
  }, [players, search, status, club, nation, sortBy])

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
        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="text-xs font-mono font-semibold tracking-widest text-emerald-400 uppercase mb-1">
            Database Archive
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-wide">
            SQUAD DIRECTORY
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {players.length} profiles recorded across legends, icons, retired greats, and head coaches.
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
              <option value="head coach">Head Coach</option>
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
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Showing <span className="text-white font-bold">{filteredPlayers.length}</span> Results
          </div>
        </div>

        {/* Squad Grid */}
        {filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-slate-400 font-mono text-sm">No profiles found matching selected filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
