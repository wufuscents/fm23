import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'

export const Route = createFileRoute('/nation/$nation')({
  loader: async ({ params }) => {
    // Nation identity is stored directly on `players.nationality`, so use the
    // source-of-truth table here instead of depending on a view's projection.
    // This also keeps the dossier reliable when the directory view changes.
    let { data, error } = await supabase.from('players').select('*')
    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('player_directory_view').select('*')
      data = fallback.data || []
    }

    const rawParam = String(params.nation || '')
    let decoded = rawParam
    try {
      decoded = decodeURIComponent(rawParam)
    } catch {
      decoded = rawParam
    }

    const normalizeNation = (value: unknown) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()

    const targetNation = normalizeNation(decoded)
    const players = (data || []).filter((p: any) => {
      const playerNation = p.nationality ?? p.nation ?? p.nationality_name ?? ''
      return normalizeNation(playerNation) === targetNation
    }) as Player[]

    // Keep the canonical database spelling in the dossier heading when the URL
    // arrives with different casing or encoding.
    const canonicalNation = String(
      players[0]?.nationality ?? players[0]?.nation ?? decoded,
    ).trim() || decoded

    return { nation: canonicalNation, players }
  },
  component: NationPage,
})

function NationPage() {
  const { nation, players } = Route.useLoaderData()
  const color = TEAM_COLORS[nation] || '#3b82f6'

  const legends = useMemo(
    () => players.filter((p) => String((p as any).status || '').toLowerCase().includes('legend')),
    [players],
  )
  const icons = useMemo(
    () => players.filter((p) => String((p as any).status || '').toLowerCase().includes('icon')),
    [players],
  )
  const sortedGoals = useMemo(
    () => [...players].sort((a, b) => Number((b as any).goals || 0) - Number((a as any).goals || 0)),
    [players],
  )
  const sortedTrophies = useMemo(
    () => [...players].sort((a, b) => Number((b as any).trophies || 0) - Number((a as any).trophies || 0)),
    [players],
  )

  const representative = players.find((p) => (p as any).nationality_flag_url || (p as any).nation_flag)
  const flag = (representative as any)?.nationality_flag_url || (representative as any)?.nation_flag || ''

  const totals = players.reduce(
    (a, p) => ({
      apps: a.apps + Number((p as any).apps || 0),
      goals: a.goals + Number((p as any).goals || 0),
      assists: a.assists + Number((p as any).assists || 0),
      trophies: a.trophies + Number((p as any).trophies || 0),
    }),
    { apps: 0, goals: 0, assists: 0, trophies: 0 },
  )

  const clubs = useMemo(() => {
    const names = new Set<string>()
    players.forEach((p: any) => {
      ;[...(Array.isArray(p.legend_at_clubs) ? p.legend_at_clubs : []), ...(Array.isArray(p.icon_at_clubs) ? p.icon_at_clubs : [])].forEach((name) => {
        if (name) names.add(String(name))
      })
      if (p.club_name) names.add(String(p.club_name))
      if (p.current_club) names.add(String(p.current_club))
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [players])

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div
          className="overflow-hidden rounded-3xl border bg-slate-900/80 p-6 sm:p-10"
          style={{ borderColor: `${color}88`, background: `radial-gradient(circle at 85% 10%, ${color}30, transparent 35%), rgba(15,23,42,.88)` }}
        >
          <nav className="mb-8 flex gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Link to="/" className="text-slate-500 hover:text-white">Directory</Link>
            <span className="text-slate-700">/</span>
            <span className="text-white">Nation</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-32 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              {flag ? <img src={flag} alt={nation} className="max-h-16 max-w-24 rounded object-contain" /> : <span className="font-mono text-xs text-slate-600">NO FLAG</span>}
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color }}>NATIONAL ARCHIVE</div>
              <h1 className="mt-1 font-heading text-4xl font-black uppercase tracking-wider text-white sm:text-6xl">{nation}</h1>
              <p className="mt-2 font-mono text-xs text-slate-500">{players.length} archived player profiles connected to this nation.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries({ Players: players.length, Apps: totals.apps, Goals: totals.goals, Assists: totals.assists, Trophies: totals.trophies }).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <div className="font-mono text-xl font-black text-white">{Number(v).toLocaleString()}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-600">{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LegacySection title="Legends" color="#fbbf24" players={legends} />
          <LegacySection title="Icons" color="#cbd5e1" players={icons} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Ranking title="Top Scorers" players={sortedGoals} field="goals" />
          <Ranking title="Most Trophies" players={sortedTrophies} field="trophies" />
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-600">CONNECTED DATABASE</div>
              <h2 className="mt-1 font-heading text-2xl font-black uppercase text-white">Represented Clubs</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">{clubs.length} clubs</span>
          </div>
          {clubs.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {clubs.map((club) => (
                <Link
                  key={club}
                  to="/club/$club"
                  params={{ club }}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  {club} →
                </Link>
              ))}
            </div>
          ) : <Empty />}
        </section>
      </div>
    </div>
  )
}

function LegacySection({ title, color, players }: { title: string; color: string; players: Player[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="font-heading text-2xl font-black uppercase" style={{ color }}>{title}</h2>
      <div className="mt-4 space-y-2">
        {players.map((p, i) => <PlayerRow key={p.id} player={p} rank={i + 1} />)}
        {!players.length && <Empty />}
      </div>
    </section>
  )
}

function PlayerRow({ player, rank }: { player: Player; rank: number }) {
  return (
    <Link to="/player/$id" params={{ id: String(player.id) }} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600">
      <span className="w-6 font-mono text-xs text-slate-600">{rank}</span>
      <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-900 p-1">{(player as any).image_url && <img src={storageUrl((player as any).image_url)} alt={player.name} className="h-full w-full object-contain" />}</div>
      <span className="flex-1 truncate font-heading font-bold uppercase text-white">{player.name}</span>
      <span className="font-mono text-[9px] uppercase text-slate-500">{(player as any).role || 'PLAYER'}</span>
    </Link>
  )
}

function Ranking({ title, players, field }: { title: string; players: Player[]; field: 'goals' | 'trophies' }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="font-heading text-2xl font-black uppercase text-white">{title}</h2>
      <div className="mt-4 space-y-2">
        {players.slice(0, 10).map((p, i) => (
          <Link key={p.id} to="/player/$id" params={{ id: String(p.id) }} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600">
            <span className="w-6 font-mono text-xs text-slate-600">{i + 1}</span>
            <span className="flex-1 truncate font-heading font-bold text-white">{p.name}</span>
            <span className="font-mono text-sm font-black text-emerald-400">{Number((p as any)[field] || 0).toLocaleString()}</span>
          </Link>
        ))}
        {!players.length && <Empty />}
      </div>
    </section>
  )
}

function Empty() { return <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center font-mono text-xs text-slate-600">No records in this archive.</div> }
