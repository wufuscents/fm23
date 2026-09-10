import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'

export const Route = createFileRoute('/compare')({
  loader: async () => {
    let { data, error } = await supabase
      .from('player_directory_view')
      .select('*')

    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('players').select('*')
      data = fallback.data || []
    }

    return { players: (data || []) as Player[] }
  },
  component: ComparePage,
})

function ComparePage() {
  const { players } = Route.useLoaderData()
  const [player1Id, setPlayer1Id] = useState<string>(players[0]?.id ? String(players[0].id) : '')
  const [player2Id, setPlayer2Id] = useState<string>(players[1]?.id ? String(players[1].id) : '')

  const p1 = useMemo(() => players.find((p) => String(p.id) === player1Id), [players, player1Id])
  const p2 = useMemo(() => players.find((p) => String(p.id) === player2Id), [players, player2Id])

  const p1Img = p1?.image_url || p1?.photo_url || ''
  const p2Img = p2?.image_url || p2?.photo_url || ''

  const p1Flag = p1?.nationality_flag_url || p1?.nation_flag || null
  const p2Flag = p2?.nationality_flag_url || p2?.nation_flag || null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-heading font-extrabold tracking-wider text-xl text-white">FM SQUAD ARCHIVE</span>
          </div>
          <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">
              DIRECTORY
            </Link>
            <Link to="/leaderboards" className="hover:text-white transition-colors">
              HALL OF FAME
            </Link>
            <Link to="/compare" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">
              COMPARE
            </Link>
          </nav>
        </div>

        {/* Player Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Select Player 1</label>
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {players.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.name} ({p.nationality || p.nation || 'Global'})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Select Player 2</label>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {players.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.name} ({p.nationality || p.nation || 'Global'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Layout */}
        {p1 && p2 && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-6 font-mono">
              {/* Player 1 Card */}
              <div className="text-center space-y-3">
                <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-2">
                  {p1Img ? (
                    <img src={storageUrl(p1Img)} alt={p1.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-slate-500 text-xs">NO IMAGE</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Flag url={p1Flag} name={p1.nationality || p1.nation} />
                  <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white uppercase">{p1.name}</h3>
                </div>
                <p className="text-xs text-slate-400">{p1.role || p1.positions_short || '-'}</p>
              </div>

              {/* Player 2 Card */}
              <div className="text-center space-y-3">
                <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-2">
                  {p2Img ? (
                    <img src={storageUrl(p2Img)} alt={p2.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-slate-500 text-xs">NO IMAGE</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Flag url={p2Flag} name={p2.nationality || p2.nation} />
                  <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white uppercase">{p2.name}</h3>
                </div>
                <p className="text-xs text-slate-400">{p2.role || p2.positions_short || '-'}</p>
              </div>
            </div>

            {/* Stat Rows */}
            <div className="mt-8 divide-y divide-slate-800/80 font-mono text-sm">
              {[
                { label: 'Appearances', key: 'apps' },
                { label: 'Goals', key: 'goals' },
                { label: 'Trophies', key: 'trophies' },
                { label: 'Awards', key: 'awards' },
                { label: 'Personal 1st', key: 'personal_1st' },
                { label: 'Team 1st', key: 'team_1st' },
              ].map(({ label, key }) => {
                const val1 = Number(p1[key as keyof Player] || 0)
                const val2 = Number(p2[key as keyof Player] || 0)

                return (
                  <div key={key} className="py-3 grid grid-cols-3 items-center text-center">
                    <span className={`font-extrabold ${val1 > val2 ? 'text-emerald-400 text-base' : 'text-slate-300'}`}>
                      {val1}
                    </span>
                    <span className="text-xs uppercase text-slate-500 font-bold">{label}</span>
                    <span className={`font-extrabold ${val2 > val1 ? 'text-emerald-400 text-base' : 'text-slate-300'}`}>
                      {val2}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
