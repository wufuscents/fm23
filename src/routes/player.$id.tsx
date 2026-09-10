@@ -1,162 +1,162 @@
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

  const statusLower = (player.status || '').toLowerCase()
  const isLegend = statusLower.includes('legend') || (player.legend_at_clubs && player.legend_at_clubs.length > 0)
  const isIcon = statusLower.includes('icon') || (player.icon_at_clubs && player.icon_at_clubs.length > 0)

  const cardBorder = isLegend
    ? 'border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.1)]'
    : isIcon
    ? 'border-slate-300/30 shadow-[0_0_30px_rgba(203,213,225,0.1)]'
    : 'border-slate-800'

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

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {playerFlag && (
                  <img src={playerFlag} alt={playerNation} className="w-5 h-3.5 object-cover rounded-sm" />
                  <img src={playerFlag} alt={playerNation} className="w-5 h-5 rounded-full object-cover shadow-sm" />
                )}
                <span className="text-xs font-mono uppercase text-slate-400">{playerNation}</span>
              </div>
