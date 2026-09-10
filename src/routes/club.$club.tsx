import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'

export const Route = createFileRoute('/club/$club')({
  loader: async ({ params }) => {
    let { data, error } = await supabase.from('player_directory_view').select('*')
    if (error || !data || data.length === 0) data = (await supabase.from('players').select('*')).data || []
    const decoded = decodeURIComponent(params.club)
    const { data: careers } = await supabase.from('player_career_history').select('player_id, team_name, club_logo_url, years, apps, goals')
    const playerRows = (data || []) as Player[]
    const matchingIds = new Set((careers || []).filter((c: any) => String(c.team_name || '').trim().toLowerCase() === decoded.trim().toLowerCase()).map((c: any) => String(c.player_id)))
    const players = playerRows.filter((p: any) => matchingIds.has(String(p.id)) || (Array.isArray(p.legend_at_clubs) && p.legend_at_clubs.includes(decoded)) || (Array.isArray(p.icon_at_clubs) && p.icon_at_clubs.includes(decoded)) || String(p.club_name || '').trim().toLowerCase() === decoded.trim().toLowerCase() || String(p.current_club || '').trim().toLowerCase() === decoded.trim().toLowerCase())
    const clubRows = (careers || []).filter((c: any) => String(c.team_name || '').trim().toLowerCase() === decoded.trim().toLowerCase())
    return { club: decoded, players, clubRows }
  },
  component: ClubPage,
})

function ClubPage() {
  const { club, players, clubRows } = Route.useLoaderData()
  const color = TEAM_COLORS[club] || '#3b82f6'
  const logo = String(clubRows.find((r: any) => r.club_logo_url)?.club_logo_url || '')
  const legends = players.filter((p) => String((p as any).status || '').toLowerCase().includes('legend'))
  const icons = players.filter((p) => String((p as any).status || '').toLowerCase().includes('icon'))
  const sortedApps = useMemo(() => [...players].sort((a, b) => Number((b as any).apps || 0) - Number((a as any).apps || 0)), [players])
  const sortedGoals = useMemo(() => [...players].sort((a, b) => Number((b as any).goals || 0) - Number((a as any).goals || 0)), [players])
  const sortedTrophies = useMemo(() => [...players].sort((a, b) => Number((b as any).trophies || 0) - Number((a as any).trophies || 0)), [players])
  const totals = players.reduce((a, p) => ({ apps: a.apps + Number((p as any).apps || 0), goals: a.goals + Number((p as any).goals || 0), assists: a.assists + Number((p as any).assists || 0), trophies: a.trophies + Number((p as any).trophies || 0) }), { apps: 0, goals: 0, assists: 0, trophies: 0 })
  return <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <div className="overflow-hidden rounded-3xl border bg-slate-900/80 p-6 sm:p-10" style={{ borderColor: `${color}88`, background: `radial-gradient(circle at 85% 10%, ${color}30, transparent 35%), rgba(15,23,42,.9)` }}>
      <nav className="mb-8 flex gap-2 font-mono text-[10px] uppercase tracking-widest"><Link to="/" className="text-slate-500 hover:text-white">Directory</Link><span className="text-slate-700">/</span><span className="text-white">Club</span></nav>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-slate-950/70 p-3" style={{ borderColor: `${color}66` }}>{logo ? <img src={storageUrl(logo)} alt={club} className="h-full w-full object-contain" /> : <span className="font-heading text-xl font-black" style={{ color }}>{club.split(/\s+/).slice(0, 3).map((x) => x[0]).join('').toUpperCase()}</span>}</div><div><div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color }}>CLUB ARCHIVE</div><h1 className="mt-1 font-heading text-4xl font-black uppercase tracking-wider text-white sm:text-6xl">{club}</h1><p className="mt-2 font-mono text-xs text-slate-500">{players.length} archived players connected to this club.</p></div></div>
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries({ Players: players.length, Apps: totals.apps, Goals: totals.goals, Assists: totals.assists, Trophies: totals.trophies }).map(([k, v]) => <div key={k} className="rounded-xl border border-white/10 bg-slate-950/60 p-3"><div className="font-mono text-xl font-black text-white">{Number(v).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-slate-600">{k}</div></div>)}</div>
    </div>
    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-heading text-2xl font-black uppercase text-amber-300">Legends</h2><div className="mt-4 space-y-2">{legends.map((p, i) => <PlayerRow key={p.id} player={p} rank={i + 1} />)}{!legends.length && <Empty />}</div></section><section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-heading text-2xl font-black uppercase text-slate-200">Icons</h2><div className="mt-4 space-y-2">{icons.map((p, i) => <PlayerRow key={p.id} player={p} rank={i + 1} />)}{!icons.length && <Empty />}</div></section></div>
    <div className="grid gap-6 lg:grid-cols-3"><Ranking title="Most Appearances" players={sortedApps} field="apps" /><Ranking title="Most Goals" players={sortedGoals} field="goals" /><Ranking title="Most Trophies" players={sortedTrophies} field="trophies" /></div>
  </div></div>
}
function PlayerRow({ player, rank }: { player: Player; rank: number }) { return <Link to="/player/$id" params={{ id: String(player.id) }} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600"><span className="w-6 font-mono text-xs text-slate-600">{rank}</span><div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-900 p-1">{(player as any).image_url && <img src={storageUrl((player as any).image_url)} alt={player.name} className="h-full w-full object-contain" />}</div><span className="flex-1 truncate font-heading font-bold uppercase text-white">{player.name}</span><span className="font-mono text-[9px] uppercase text-slate-500">{(player as any).role || 'PLAYER'}</span></Link> }
function Ranking({ title, players, field }: { title: string; players: Player[]; field: 'apps' | 'goals' | 'trophies' }) { return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-heading text-2xl font-black uppercase text-white">{title}</h2><div className="mt-4 space-y-2">{players.slice(0, 10).map((p, i) => <Link key={p.id} to="/player/$id" params={{ id: String(p.id) }} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600"><span className="w-6 font-mono text-xs text-slate-600">{i + 1}</span><span className="flex-1 truncate font-heading font-bold text-white">{p.name}</span><span className="font-mono text-sm font-black text-emerald-400">{Number((p as any)[field] || 0).toLocaleString()}</span></Link>)}{!players.length && <Empty />}</div></section> }
function Empty() { return <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center font-mono text-xs text-slate-600">No records in this archive.</div> }
