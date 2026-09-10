@@ -1,113 +1,114 @@
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
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
        if (sortBy === 'apps') return (b.international_apps || b.apps || 0) - (a.international_apps || a.apps || 0)
        if (sortBy === 'goals') return (b.international_goals || b.goals || 0) - (a.international_goals || a.goals || 0)
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
@@ -122,21 +123,22 @@
    return {
      name: club,
      count: clubPlayers.length,
      apps: clubPlayers.reduce((sum, p) => sum + (p.international_apps || p.apps || 0), 0),
      goals: clubPlayers.reduce((sum, p) => sum + (p.international_goals || p.goals || 0), 0),
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
      apps: nationPlayers.reduce((sum, p) => sum + (p.international_apps || p.apps || 0), 0),
      goals: nationPlayers.reduce((sum, p) => sum + (p.international_goals || p.goals || 0), 0),
      apps: nationPlayers.reduce((sum, p) => sum + (p.apps || 0), 0),
      goals: nationPlayers.reduce((sum, p) => sum + (p.goals || 0), 0),
      trophies: nationPlayers.reduce((sum, p) => sum + (p.trophies || 0), 0),
      awards: nationPlayers.reduce((sum, p) => sum + (p.awards || 0), 0),
    }
@@ -293,7 +295,7 @@
                <div className="grid grid-cols-4 gap-2 font-mono text-center">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <div className="text-base font-bold text-white">{clubLegacyStats.apps.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 uppercase">Caps</div>
                    <div className="text-[9px] text-slate-500 uppercase">Apps</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <div className="text-base font-bold text-white">{clubLegacyStats.goals.toLocaleString()}</div>
@@ -325,7 +327,7 @@
                <div className="grid grid-cols-4 gap-2 font-mono text-center">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <div className="text-base font-bold text-white">{nationLegacyStats.apps.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 uppercase">Caps</div>
                    <div className="text-[9px] text-slate-500 uppercase">Apps</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <div className="text-base font-bold text-white">{nationLegacyStats.goals.toLocaleString()}</div>
