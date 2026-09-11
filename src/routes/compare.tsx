import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'
import { ArchiveHeader } from '../components/fm/ArchiveHeader'
import { filterPlayersForProfile, getArchiveProfile } from '../lib/archive-auth'

export const Route = createFileRoute('/compare')({
  loader: async () => {
    let { data, error } = await supabase.from('player_directory_view').select('*')

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
  shortLabel: string
  getValue: (player: Player) => number
  format?: (value: number) => string
  category: 'career' | 'honours' | 'efficiency'
}

const compareMetrics: CompareMetric[] = [
  {
    label: 'Appearances',
    shortLabel: 'Apps',
    getValue: (p) => Number((p as any).apps ?? 0),
    category: 'career',
  },
  {
    label: 'Goals',
    shortLabel: 'Goals',
    getValue: (p) => Number((p as any).goals ?? 0),
    category: 'career',
  },
  {
    label: 'Assists',
    shortLabel: 'Assists',
    getValue: (p) => Number((p as any).assists ?? 0),
    category: 'career',
  },
  {
    label: 'Goals + Assists',
    shortLabel: 'G+A',
    getValue: (p) => Number((p as any).goals ?? 0) + Number((p as any).assists ?? 0),
    category: 'career',
  },
  {
    label: 'Goals per Game',
    shortLabel: 'G/GM',
    getValue: (p) => {
      const apps = Number((p as any).apps ?? 0)
      return apps > 0 ? Number((p as any).goals ?? 0) / apps : 0
    },
    format: (value) => value.toFixed(2),
    category: 'efficiency',
  },
  {
    label: 'Trophies',
    shortLabel: 'Trophies',
    getValue: (p) => Number((p as any).trophies ?? 0),
    category: 'honours',
  },
  {
    label: 'Awards',
    shortLabel: 'Awards',
    getValue: (p) => Number((p as any).awards ?? 0),
    category: 'honours',
  },
  {
    label: 'Personal 1st',
    shortLabel: 'Personal 1st',
    getValue: (p) => Number((p as any).personal_1st ?? 0),
    category: 'honours',
  },
  {
    label: 'Team 1st',
    shortLabel: 'Team 1st',
    getValue: (p) => Number((p as any).team_1st ?? 0),
    category: 'honours',
  },
]

function statusMeta(player: Player) {
  const status = String((player as any).status ?? '').trim().toLowerCase()

  if (status.includes('legend')) {
    return {
      label: 'LEGEND',
      border: 'border-amber-400/60',
      badge: 'border-amber-400/50 bg-amber-400/10 text-amber-300',
      glow: 'shadow-[0_0_42px_rgba(251,191,36,0.08)]',
      accent: 'text-amber-300',
    }
  }

  if (status.includes('icon')) {
    return {
      label: 'ICON',
      border: 'border-slate-300/45',
      badge: 'border-slate-300/35 bg-slate-300/10 text-slate-200',
      glow: 'shadow-[0_0_42px_rgba(203,213,225,0.06)]',
      accent: 'text-slate-100',
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
  const gender = String((player as any).gender ?? '').trim().toLowerCase()

  if (gender === 'female' || gender === 'f') {
    return {
      text: 'text-pink-300',
      border: 'border-pink-500/45',
      glow: 'shadow-[0_0_36px_rgba(236,72,153,0.10)]',
      bar: 'bg-pink-400',
      tint: 'from-pink-500/10 via-slate-950/20 to-transparent',
    }
  }

  return {
    text: 'text-blue-300',
    border: 'border-blue-500/45',
    glow: 'shadow-[0_0_36px_rgba(59,130,246,0.10)]',
    bar: 'bg-blue-400',
    tint: 'from-blue-500/10 via-slate-950/20 to-transparent',
  }
}

function PlayerPicker({
  slot,
  players,
  value,
  onChange,
}: {
  slot: 1 | 2
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

  const accent = slot === 1 ? 'emerald' : 'blue'
  const accentText = accent === 'emerald' ? 'text-emerald-300' : 'text-blue-300'
  const accentBorder = accent === 'emerald' ? 'border-emerald-500/45' : 'border-blue-500/45'
  const accentBg = accent === 'emerald' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
  const accentRing = accent === 'emerald' ? 'focus:border-emerald-400/55' : 'focus:border-blue-400/55'

  return (
    <div className={`relative ${open ? 'z-[9999]' : 'z-0'}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className={`text-[10px] font-mono uppercase tracking-[0.24em] ${accentText}`}>
          Selection / 0{slot}
        </label>
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600">
          {selectedPlayer ? 'Loaded' : 'Awaiting player'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group w-full min-h-[78px] rounded-xl border bg-slate-950/80 px-4 py-3 text-left transition-all ${
          open
            ? `${accentBorder} ${accentBg} shadow-[0_16px_36px_-22px_rgba(0,0,0,0.95)]`
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {selectedPlayer ? (
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${accentBorder} bg-slate-900 p-1`}>
              {(selectedPlayer as any).image_url || (selectedPlayer as any).photo_url ? (
                <img
                  src={storageUrl((selectedPlayer as any).image_url || (selectedPlayer as any).photo_url)}
                  alt={selectedPlayer.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-[9px] font-mono ${accentText}`}>FM</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-heading text-lg font-black uppercase tracking-wide text-white">
                {selectedPlayer.name}
              </div>
              <div className="mt-1 flex items-center gap-2 truncate text-[9px] font-mono uppercase tracking-wider text-slate-500">
                <span>{(selectedPlayer as any).nationality || (selectedPlayer as any).nation || 'Global'}</span>
                <span className="text-slate-700">•</span>
                <span>{(selectedPlayer as any).role || (selectedPlayer as any).positions_short || 'PLAYER'}</span>
              </div>
            </div>
            <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${accentBorder} ${accentText} ${accentBg}`}>
              CHANGE
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-heading text-base font-bold uppercase tracking-wide text-slate-300">
                Select player
              </div>
              <div className="mt-1 text-[9px] font-mono uppercase tracking-widest text-slate-600">
                Search the live archive database
              </div>
            </div>
            <span className="text-xs text-slate-600">⌄</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[10000] mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50">
          <div className="border-b border-slate-800 bg-slate-950/95 p-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="Search name, nation, role or status…"
                className={`w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-600 outline-none ${accentRing}`}
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
                      isSelected
                        ? `${accentBg} border ${accentBorder}`
                        : 'border border-transparent hover:border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <div className={`h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-0.5 ${isSelected ? accentBorder : ''}`}>
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
                    {isSelected && <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${accentText}`}>LOADED</span>}
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-xs font-bold text-slate-400">NO PLAYERS FOUND</div>
                <div className="mt-1 text-[9px] font-mono uppercase tracking-wider text-slate-600">
                  Try another name, nation, role or status
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ComparePlayer({ player, side }: { player: Player; side: 1 | 2 }) {
  const image = (player as any).image_url || (player as any).photo_url || ''
  const nation = (player as any).nationality || (player as any).nation || 'Global'
  const flag = (player as any).nationality_flag_url || (player as any).nation_flag || null
  const status = statusMeta(player)
  const gender = genderAccent(player)
  const sideColor = side === 1 ? 'text-emerald-300' : 'text-blue-300'
  const sideBorder = side === 1 ? 'border-emerald-500/40' : 'border-blue-500/40'

  return (
    <section className={`relative overflow-hidden rounded-xl border bg-slate-950/75 ${status.border} ${status.glow}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gender.tint}`} />
      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className={`font-mono text-[9px] font-bold uppercase tracking-[0.28em] ${sideColor}`}>
            Subject / 0{side}
          </span>
          <span className={`rounded border px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-[108px_1fr] items-center gap-4 sm:grid-cols-[132px_1fr] sm:gap-5">
          <Link to="/player/$id" params={{ id: String(player.id) }} className="group block">
            <div className={`aspect-square overflow-hidden rounded-xl border bg-slate-900/90 p-2 ${sideBorder} ${gender.glow} transition-transform duration-300 group-hover:scale-[1.02]`}>
              {image ? (
                <img
                  src={storageUrl(image)}
                  alt={player.name}
                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[9px] font-mono text-slate-600">NO IMAGE</div>
              )}
            </div>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-slate-500">
              <Flag url={flag} name={nation} />
              <span className="truncate">{nation}</span>
              <span className="text-slate-700">•</span>
              <span className="truncate">{(player as any).role || (player as any).positions_short || 'PLAYER'}</span>
            </div>
            <Link to="/player/$id" params={{ id: String(player.id) }} className="group/name block">
              <h2 className="mt-2 truncate font-heading text-2xl font-black uppercase tracking-wide text-white transition-colors group-hover/name:text-slate-200 sm:text-3xl">
                {player.name}
              </h2>
            </Link>
            <div className="mt-3 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-slate-600">
              <span>Archive ID</span>
              <span className="text-slate-400">{String(player.id).slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricRow({ metric, p1, p2 }: { metric: CompareMetric; p1: Player; p2: Player }) {
  const val1 = metric.getValue(p1)
  const val2 = metric.getValue(p2)
  const total = val1 + val2
  const p1Share = total > 0 ? (val1 / total) * 100 : 50
  const p2Share = total > 0 ? (val2 / total) * 100 : 50
  const winner = val1 > val2 ? 1 : val2 > val1 ? 2 : 0
  const display1 = metric.format ? metric.format(val1) : val1.toLocaleString()
  const display2 = metric.format ? metric.format(val2) : val2.toLocaleString()

  return (
    <div className="grid grid-cols-[1fr_118px_1fr] items-center gap-3 border-b border-slate-800/70 px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_150px_1fr] sm:px-6">
      <div className={`font-heading text-2xl font-black tracking-tight ${winner === 1 ? 'text-emerald-300' : 'text-slate-200'}`}>
        {display1}
      </div>

      <div className="min-w-0 text-center">
        <div className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">{metric.category}</div>
        <div className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">{metric.label}</div>
      </div>

      <div className={`text-right font-heading text-2xl font-black tracking-tight ${winner === 2 ? 'text-blue-300' : 'text-slate-200'}`}>
        {display2}
      </div>

      <div className="col-span-3 flex h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800 sm:col-span-3">
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
    </div>
  )
}

function ScoreBox({ player, wins, total }: { player: Player; wins: number; total: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-heading text-lg font-black uppercase tracking-wide text-white">{player.name}</div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-600">Metrics won</div>
        </div>
        <div className="text-right">
          <div className="font-heading text-3xl font-black text-white">{wins}</div>
          <div className="font-mono text-[8px] uppercase tracking-widest text-slate-600">/ {total}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full bg-emerald-400 transition-all duration-500"
          style={{ width: `${total > 0 ? (wins / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

function ComparePage() {
  const { players: loadedPlayers } = Route.useLoaderData()
  const archiveProfile = getArchiveProfile()
  const players = useMemo(() => filterPlayersForProfile(loadedPlayers, archiveProfile), [loadedPlayers, archiveProfile])
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')

  const p1 = useMemo(() => players.find((p) => String(p.id) === player1Id), [players, player1Id])
  const p2 = useMemo(() => players.find((p) => String(p.id) === player2Id), [players, player2Id])

  const metricsWon = useMemo(() => {
    if (!p1 || !p2) return { p1: 0, p2: 0, tied: 0 }
    let first = 0
    let second = 0
    let tied = 0

    for (const metric of compareMetrics) {
      const value1 = metric.getValue(p1)
      const value2 = metric.getValue(p2)
      if (value1 > value2) first += 1
      else if (value2 > value1) second += 1
      else tied += 1
    }

    return { p1: first, p2: second, tied }
  }, [p1, p2])

  const swapPlayers = () => {
    setPlayer1Id(player2Id)
    setPlayer2Id(player1Id)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <ArchiveHeader active="compare" />

        <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">Analysis terminal</p>
              <h1 className="mt-1 font-heading text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
                PLAYER COMPARISON
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                Load two player dossiers and interrogate the archive across career output, efficiency and honours.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              Live database
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
            <PlayerPicker slot={1} players={players} value={player1Id} onChange={setPlayer1Id} />

            <div className="flex items-center justify-center md:px-1">
              <button
                type="button"
                onClick={swapPlayers}
                disabled={!player1Id && !player2Id}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-950 font-mono text-sm text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Swap players"
              >
                ⇄
              </button>
            </div>

            <PlayerPicker slot={2} players={players} value={player2Id} onChange={setPlayer2Id} />
          </div>
        </section>

        {!p1 || !p2 ? (
          <section className="rounded-xl border border-dashed border-slate-800 bg-slate-900/35 px-6 py-16 text-center">
            <div className="mx-auto flex max-w-lg flex-col items-center">
              <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-emerald-400">Awaiting analysis</div>
              <h2 className="mt-2 font-heading text-2xl font-black uppercase tracking-wide text-white">LOAD TWO DOSSIERS</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Select one player for each terminal slot to activate the head-to-head comparison matrix.
              </p>
              <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-2 font-mono text-[8px] uppercase tracking-widest text-slate-600">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">Career output</div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">Efficiency</div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">Honours</div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">Direct verdict</div>
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ComparePlayer player={p1} side={1} />
              <ComparePlayer player={p2} side={2} />
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/75">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">Statistical matrix</p>
                  <h2 className="mt-1 font-heading text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                    HEAD-TO-HEAD
                  </h2>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
                  {compareMetrics.length} metrics / {metricsWon.tied} ties
                </div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {compareMetrics.map((metric) => (
                  <MetricRow key={metric.label} metric={metric} p1={p1} p2={p2} />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">Terminal verdict</p>
                  <h2 className="mt-1 font-heading text-2xl font-black uppercase tracking-wide text-white">METRICS WON</h2>
                </div>
                <Link
                  to="/"
                  className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-white"
                >
                  Return to archive →
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ScoreBox player={p1} wins={metricsWon.p1} total={compareMetrics.length} />
                <ScoreBox player={p2} wins={metricsWon.p2} total={compareMetrics.length} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/55 px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-slate-600">
                <span>Winner = higher raw value for each metric</span>
                <span>{metricsWon.tied} metric{metricsWon.tied === 1 ? '' : 's'} tied</span>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
