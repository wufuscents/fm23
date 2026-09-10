import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
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

type CompareMetric = {
  label: string
  getValue: (player: Player) => number
  format?: (value: number) => string
}

const compareMetrics: CompareMetric[] = [
  { label: 'Appearances', getValue: (p) => Number((p as any).apps ?? 0) },
  { label: 'Goals', getValue: (p) => Number((p as any).goals ?? 0) },
  { label: 'Assists', getValue: (p) => Number((p as any).assists ?? 0) },
  { label: 'G+A', getValue: (p) => Number((p as any).goals ?? 0) + Number((p as any).assists ?? 0) },
  {
    label: 'G/GM',
    getValue: (p) => {
      const apps = Number((p as any).apps ?? 0)
      return apps > 0 ? Number((p as any).goals ?? 0) / apps : 0
    },
    format: (value) => value.toFixed(2),
  },
  { label: 'Trophies', getValue: (p) => Number((p as any).trophies ?? 0) },
  { label: 'Awards', getValue: (p) => Number((p as any).awards ?? 0) },
  { label: 'Personal 1st', getValue: (p) => Number((p as any).personal_1st ?? 0) },
  { label: 'Team 1st', getValue: (p) => Number((p as any).team_1st ?? 0) },
]

function statusMeta(player: Player) {
  const status = String((player as any).status ?? '').toLowerCase()
  if (status.includes('legend')) {
    return {
      label: 'LEGEND',
      border: 'border-amber-400/60',
      badge: 'border-amber-400/50 bg-amber-400/10 text-amber-300',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.10)]',
      accent: 'text-amber-300',
    }
  }
  if (status.includes('icon')) {
    return {
      label: 'ICON',
      border: 'border-slate-300/50',
      badge: 'border-slate-300/40 bg-slate-300/10 text-slate-200',
      glow: 'shadow-[0_0_40px_rgba(203,213,225,0.08)]',
      accent: 'text-slate-200',
    }
  }
  return {
    label: 'SQUAD',
    border: 'border-slate-800',
    badge: 'border-slate-700 bg-slate-950/70 text-slate-400',
    glow: '',
    accent: 'text-slate-300',
  }
}

function genderAccent(player: Player) {
  const gender = String((player as any).gender ?? '').toLowerCase()
  if (gender === 'female' || gender === 'f') {
    return {
      text: 'text-pink-300',
      border: 'border-pink-500/40',
      glow: 'shadow-[0_0_35px_rgba(236,72,153,0.10)]',
      bar: 'bg-pink-400',
      bg: 'from-pink-500/10 via-slate-950/20 to-transparent',
    }
  }
  return {
    text: 'text-blue-300',
    border: 'border-blue-500/40',
    glow: 'shadow-[0_0_35px_rgba(59,130,246,0.10)]',
    bar: 'bg-blue-400',
    bg: 'from-blue-500/10 via-slate-950/20 to-transparent',
  }
}

function ComparePlayer({ player }: { player: Player }) {
  const image = (player as any).image_url || (player as any).photo_url || ''
  const nation = (player as any).nationality || (player as any).nation || 'Global'
  const flag = (player as any).nationality_flag_url || (player as any).nation_flag || null
  const status = statusMeta(player)
  const gender = genderAccent(player)

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-slate-950/75 p-5 sm:p-6 ${status.border} ${status.glow}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gender.bg}`} />
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded border text-[10px] font-mono font-bold tracking-widest ${status.badge}`}>
            {status.label}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Flag url={flag} name={nation} />
            <span>{nation}</span>
          </div>
        </div>

        <Link to="/player/$id" params={{ id: String(player.id) }} className="group block">
          <div className={`w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-2xl bg-slate-900/90 border ${gender.border} flex items-center justify-center p-2 overflow-hidden transition-all duration-300 group-hover:scale-[1.025] group-hover:border-opacity-80 ${gender.glow}`}>
            {image ? (
              <img src={storageUrl(image)} alt={player.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <span className="text-slate-500 text-[10px] font-mono">NO IMAGE</span>
            )}
          </div>
          <h2 className={`mt-4 font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white transition-colors ${gender.text === 'text-pink-300' ? 'group-hover:text-pink-300' : 'group-hover:text-blue-300'}`}>
            {player.name}
          </h2>
        </Link>

        <p className="mt-1 text-xs font-mono text-slate-400 uppercase">
          {(player as any).role || (player as any).positions_short || '-'}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${gender.text}`}>
            {String((player as any).gender || 'Unknown')}
          </span>
          <span className="text-slate-700">•</span>
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${status.accent}`}>
            {status.label}
          </span>
        </div>
      </div>
    </div>
  )
}

function PlayerPicker({
  slot,
  players,
  value,
  onChange,
}: {
  slot: number
  players: Player[]
  value: string
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selectedPlayer = useMemo(
    () => players.find((p) => String(p.id) === value),
    [players, value],
  )

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return players

    return players.filter((player) => {
      const name = String(player.name || '').toLowerCase()
      const nationality = String((player as any).nationality || (player as any).nation || '').toLowerCase()
      const role = String((player as any).role || (player as any).positions_short || '').toLowerCase()
      const status = String((player as any).status || '').toLowerCase()
      return (
        name.includes(normalized) ||
        nationality.includes(normalized) ||
        role.includes(normalized) ||
        status.includes(normalized)
      )
    })
  }, [players, query])

  const choosePlayer = (player: Player) => {
    onChange(String(player.id))
    setQuery('')
    setOpen(false)
  }

  return (
    <div className={`relative ${open ? 'z-50' : 'z-0'}`}>
      <label className="block mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">Player {slot}</label>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group w-full min-h-[48px] rounded-lg border bg-slate-950 px-3 py-2.5 text-left transition-colors focus:outline-none ${
          open ? 'border-emerald-500/60' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {selectedPlayer ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{selectedPlayer.name}</div>
              <div className="mt-0.5 truncate text-[9px] font-mono uppercase tracking-wider text-slate-500">
                {(selectedPlayer as any).nationality || (selectedPlayer as any).nation || 'Global'}
                {(selectedPlayer as any).role || (selectedPlayer as any).positions_short ? ` • ${(selectedPlayer as any).role || (selectedPlayer as any).positions_short}` : ''}
              </div>
            </div>
            <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 group-hover:border-emerald-500/40 group-hover:text-emerald-300">
              CHANGE
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500">Search and choose a player…</span>
            <span className="shrink-0 text-xs text-slate-600">⌄</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
          <div className="border-b border-slate-800 p-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="Search name, club, nation, role, status…"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => {
                const playerId = String(player.id)
                const nationality = (player as any).nationality || (player as any).nation || 'Global'
                const isSelected = playerId === value

                return (
                  <button
                    type="button"
                    key={playerId}
                    onClick={() => choosePlayer(player)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent hover:bg-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                      {(player as any).image_url || (player as any).photo_url ? (
                        <img
                          src={storageUrl((player as any).image_url || (player as any).photo_url)}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] font-mono text-slate-600">FM</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-white">{player.name}</div>
                      <div className="mt-0.5 truncate text-[9px] font-mono uppercase tracking-wider text-slate-600">
                        {nationality} • {(player as any).role || (player as any).positions_short || 'PLAYER'}
                      </div>
                    </div>
                    {isSelected && <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">SELECTED</span>}
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-xs font-bold text-slate-400">NO PLAYERS FOUND</div>
                <div className="mt-1 text-[9px] font-mono uppercase tracking-wider text-slate-600">Try another name, club, nation, role or status</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ComparePage() {
  const { players } = Route.useLoaderData()
  // Start with an empty comparison so the user chooses both players intentionally.
  const [player1Id, setPlayer1Id] = useState<string>('')
  const [player2Id, setPlayer2Id] = useState<string>('')

  const p1 = useMemo(() => players.find((p) => String(p.id) === player1Id), [players, player1Id])
  const p2 = useMemo(() => players.find((p) => String(p.id) === player2Id), [players, player2Id])

  const swapPlayers = () => {
    setPlayer1Id(player2Id)
    setPlayer2Id(player1Id)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-heading font-extrabold tracking-wider text-xl text-white">FM SQUAD ARCHIVE</span>
            </div>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Head-to-head player dossier</p>
          </div>
          <nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">DIRECTORY</Link>
            <Link to="/hall-of-fame" className="hover:text-white transition-colors">HALL OF FAME</Link>
            <Link to="/compare" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">COMPARE</Link>
          </nav>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400">Comparison Lab</p>
              <h1 className="mt-1 font-heading text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">PLAYER VS PLAYER</h1>
            </div>
            <button
              type="button"
              onClick={swapPlayers}
              className="shrink-0 px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 hover:border-emerald-500/50 hover:text-white transition-colors"
            >
              ⇄ SWAP
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PlayerPicker
              slot={1}
              players={players}
              value={player1Id}
              onChange={setPlayer1Id}
            />
            <PlayerPicker
              slot={2}
              players={players}
              value={player2Id}
              onChange={setPlayer2Id}
            />
          </div>
        </div>

        {p1 && p2 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComparePlayer player={p1} />
              <ComparePlayer player={p2} />
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-800">
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Head-to-head metrics</p>
                <h2 className="mt-1 font-heading text-xl sm:text-2xl font-extrabold uppercase text-white">CAREER COMPARISON</h2>
              </div>

              <div className="divide-y divide-slate-800/70">
                {compareMetrics.map((metric) => {
                  const val1 = metric.getValue(p1)
                  const val2 = metric.getValue(p2)
                  const total = val1 + val2
                  const p1Share = total > 0 ? (val1 / total) * 100 : 50
                  const p2Share = total > 0 ? (val2 / total) * 100 : 50
                  const winner = val1 > val2 ? 1 : val2 > val1 ? 2 : 0
                  const display1 = metric.format ? metric.format(val1) : val1.toLocaleString()
                  const display2 = metric.format ? metric.format(val2) : val2.toLocaleString()

                  return (
                    <div key={metric.label} className="px-4 sm:px-6 py-4">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-mono">
                        <div className={`text-right font-extrabold text-base sm:text-lg ${winner === 1 ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {display1}
                        </div>
                        <div className="min-w-20 text-center text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                          {metric.label}
                        </div>
                        <div className={`text-left font-extrabold text-base sm:text-lg ${winner === 2 ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {display2}
                        </div>
                      </div>
                      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-950">
                        <div
                          className="bg-emerald-400 transition-all duration-500"
                          style={{ width: `${p1Share}%` }}
                          aria-label={`${p1.name} share`}
                        />
                        <div
                          className="bg-blue-400 transition-all duration-500"
                          style={{ width: `${p2Share}%` }}
                          aria-label={`${p2.name} share`}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between font-mono text-[8px] uppercase tracking-wider text-slate-600">
                        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{p1.name}</span>
                        <span className="flex items-center gap-1.5">{p2.name}<span className="h-1.5 w-1.5 rounded-full bg-blue-400" /></span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 border-t border-slate-800 bg-slate-950/40 text-center font-mono">
                <div className="p-4 border-r border-slate-800">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500">Better metrics</div>
                  <div className="mt-1 text-xl font-extrabold text-emerald-400">
                    {compareMetrics.filter((m) => m.getValue(p1) > m.getValue(p2)).length}
                  </div>
                  <div className="text-[10px] text-slate-500">{p1.name}</div>
                </div>
                <div className="p-4">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500">Better metrics</div>
                  <div className="mt-1 text-xl font-extrabold text-emerald-400">
                    {compareMetrics.filter((m) => m.getValue(p2) > m.getValue(p1)).length}
                  </div>
                  <div className="text-[10px] text-slate-500">{p2.name}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
