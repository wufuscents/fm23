import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'

function normalizeClubName(value: unknown): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/\b(football|futbol|club|fc|cf|afc|ac|sc|calcio|de|del|the)\b/g, ' ').replace(/[^a-z0-9]+/g, '')
}
function sameClubName(a: unknown, b: unknown): boolean {
  const left = normalizeClubName(a); const right = normalizeClubName(b)
  return Boolean(left && right && left === right)
}

export const Route = createFileRoute('/club/$club')({
  loader: async ({ params }) => {
    let { data, error } = await supabase.from('player_directory_view').select('*')
    if (error || !data || data.length === 0) data = (await supabase.from('players').select('*')).data || []
    const decoded = decodeURIComponent(params.club)
    const { data: careers } = await supabase.from('player_career_history').select('player_id, team_name, club_logo_url, years, apps, goals, country')
    const { data: clubViewRows } = await supabase.from('club_leaderboard_view').select('club_name, club_logo_url')
    const playerRows = (data || []) as Player[]
    const matchingCareerRows = (careers || []).filter((c: any) => sameClubName(c.team_name, decoded))
    const matchingIds = new Set(matchingCareerRows.map((c: any) => String(c.player_id)))
    const players = playerRows.filter((p: any) => {
      const legendClubs = Array.isArray(p.legend_at_clubs) ? p.legend_at_clubs : []
      const iconClubs = Array.isArray(p.icon_at_clubs) ? p.icon_at_clubs : []
      return matchingIds.has(String(p.id)) || legendClubs.some((name: unknown) => sameClubName(name, decoded)) || iconClubs.some((name: unknown) => sameClubName(name, decoded)) || sameClubName(p.club_name, decoded) || sameClubName(p.current_club, decoded)
    })
    const viewMatch = (clubViewRows || []).find((row: any) => sameClubName(row.club_name, decoded))
    const logo = String(viewMatch?.club_logo_url || matchingCareerRows.find((r: any) => r.club_logo_url)?.club_logo_url || '')
    return { club: decoded, players, matchingCareerRows, logo }
  },
  component: ClubPage,
})

function ClubPage() {
  const { club, players, matchingCareerRows, logo } = Route.useLoaderData()
  const color = TEAM_COLORS[club] || '#3b82f6'
  const legends = useMemo(() => players.filter((p) => Array.isArray((p as any).legend_at_clubs) && (p as any).legend_at_clubs.some((name: unknown) => sameClubName(name, club))), [players, club])
  const icons = useMemo(() => players.filter((p) => Array.isArray((p as any).icon_at_clubs) && (p as any).icon_at_clubs.some((name: unknown) => sameClubName(name, club))), [players, club])
  const clubStats = useMemo(() => {
    const map = new Map<string, { apps: number; goals: number }>()
    matchingCareerRows.forEach((row: any) => { const id = String(row.player_id || ''); if (!id) return; const current = map.get(id) || { apps: 0, goals: 0 }; current.apps += Number(row.apps || 0); current.goals += Number(row.goals || 0); map.set(id, current) })
    return map
  }, [matchingCareerRows])
  const rankedApps = useMemo(() => rankPlayers(players, clubStats, 'apps'), [players, clubStats])
  const rankedGoals = useMemo(() => rankPlayers(players, clubStats, 'goals'), [players, clubStats])
  const rankedDecorated = useMemo(() => [...players].sort((a, b) => Number((b as any).trophies || 0) - Number((a as any).trophies || 0) || Number((b as any).awards || 0) - Number((a as any).awards || 0) || String(a.name).localeCompare(String(b.name))), [players])
  const totals = useMemo(() => ({ apps: matchingCareerRows.reduce((s: number, r: any) => s + Number(r.apps || 0), 0), goals: matchingCareerRows.reduce((s: number, r: any) => s + Number(r.goals || 0), 0) }), [matchingCareerRows])
  const clubCountry = useMemo(() => {
    const counts = new Map<string, number>(); matchingCareerRows.forEach((r: any) => { const c = String(r.country || '').trim(); if (c) counts.set(c, (counts.get(c) || 0) + 1) })
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || ''
  }, [matchingCareerRows])
  const nations = useMemo(() => {
    const map = new Map<string, { count: number; flag: string }>()
    players.forEach((p: any) => { const name = String(p.nationality || p.nation || '').trim(); if (!name) return; const current = map.get(name) || { count: 0, flag: '' }; current.count++; current.flag ||= String(p.nationality_flag_url || p.nation_flag || ''); map.set(name, current) })
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
  }, [players])

  return <div className="min-h-screen bg-[#070d18] p-4 text-slate-100 sm:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="relative overflow-hidden rounded-2xl border bg-[#0c1526] p-6 sm:p-10" style={{ borderColor: `${color}77` }}><div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 88% 8%, ${color}26, transparent 32%), linear-gradient(135deg, ${color}09, transparent 55%)` }} /><div className="relative"><ArchiveNav current="CLUB" /><div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-5 sm:gap-7"><div className="flex h-24 w-24 shrink-0 items-center justify-center border bg-[#050a13] p-3 sm:h-32 sm:w-32" style={{ borderColor: `${color}66` }}>{logo ? <img src={storageUrl(logo)} alt={club} className="h-full w-full object-contain" /> : <span className="font-heading text-2xl font-black" style={{ color }}>{initials(club)}</span>}</div><div><div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color }}>ARCHIVE / CLUB DOSSIER</div><h1 className="mt-2 font-heading text-4xl font-black uppercase leading-none tracking-[0.04em] text-white sm:text-6xl">{club}</h1><div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500"><span>{players.length} connected profiles</span>{clubCountry && <><span className="text-slate-700">/</span><span>{clubCountry}</span></>}</div></div></div><div className="grid grid-cols-2 gap-2 sm:min-w-[330px]"><Metric label="CLUB APPS" value={totals.apps} /><Metric label="CLUB GOALS" value={totals.goals} /><Metric label="LEGENDS" value={legends.length} accent="#fbbf24" /><Metric label="ICONS" value={icons.length} accent="#cbd5e1" /></div></div></div></header>
    <section className="grid gap-6 lg:grid-cols-2"><LegacySection title="Legends at this club" eyebrow="LEGACY INDEX / 01" color="#fbbf24" players={legends} /><LegacySection title="Icons at this club" eyebrow="LEGACY INDEX / 02" color="#cbd5e1" players={icons} /></section>
    <section className="grid gap-6 lg:grid-cols-3"><Ranking title="Most Appearances" eyebrow="RECORD INDEX / 01" players={rankedApps} field="apps" clubStats={clubStats} /><Ranking title="Most Goals" eyebrow="RECORD INDEX / 02" players={rankedGoals} field="goals" clubStats={clubStats} /><Ranking title="Most Decorated" eyebrow="RECORD INDEX / 03" players={rankedDecorated} field="trophies" clubStats={clubStats} /></section>
    <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><SectionHeader eyebrow="CONNECTED DATABASE / NATIONS" title="Player Nations" count={`${nations.length} nations`} />{nations.length ? <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{nations.map(([name, info]) => <Link key={name} to="/nation/$nation" params={{ nation: name }} className="group flex items-center gap-3 border border-slate-800 bg-[#060c16] p-3 transition-all hover:-translate-y-0.5 hover:border-slate-600"><div className="flex h-9 w-12 items-center justify-center">{info.flag && <img src={storageUrl(info.flag)} alt="" className="max-h-6 max-w-10 object-contain" />}</div><span className="flex-1 truncate font-heading font-bold uppercase text-slate-200 group-hover:text-white">{name}</span><span className="font-mono text-[9px] text-slate-600">{info.count} PL</span></Link>)}</div> : <Empty />}</section>
    <div className="border-t border-slate-900 pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-700">FM SQUAD ARCHIVE // CLUB RECORD // SOURCE: PLAYER CAREER HISTORY + PLAYER DIRECTORY</div>
  </div></div>
}
function ArchiveNav({ current }: { current: string }) { return <nav className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em]"><Link to="/" className="text-slate-600 hover:text-white">Directory</Link><span className="text-slate-800">/</span><span className="text-slate-300">{current}</span></nav> }
function Metric({ label, value, accent = '#e2e8f0' }: { label: string; value: number; accent?: string }) { return <div className="border border-white/10 bg-[#050a13]/80 p-3"><div className="font-mono text-xl font-black" style={{ color: accent }}>{value.toLocaleString()}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">{label}</div></div> }
function SectionHeader({ eyebrow, title, count }: { eyebrow: string; title: string; count?: string }) { return <div className="flex items-end justify-between gap-4"><div><div className="font-mono text-[9px] uppercase tracking-[0.24em] text-blue-500">{eyebrow}</div><h2 className="mt-1 font-heading text-2xl font-black uppercase tracking-wide text-white">{title}</h2></div>{count && <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">{count}</span>}</div> }
function LegacySection({ title, eyebrow, color, players }: { title: string; eyebrow: string; color: string; players: Player[] }) { return <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><div className="font-mono text-[9px] uppercase tracking-[0.24em]" style={{ color }}>{eyebrow}</div><h2 className="mt-1 font-heading text-2xl font-black uppercase text-white">{title}</h2><div className="mt-5 space-y-2">{players.map((p, i) => <PlayerRow key={p.id} player={p} rank={i + 1} />)}{!players.length && <Empty />}</div></section> }
function PlayerRow({ player, rank }: { player: Player; rank: number }) { return <Link to="/player/$id" params={{ id: String(player.id) }} className="group flex items-center gap-3 border border-slate-800 bg-[#060c16] p-3 transition-all hover:-translate-y-0.5 hover:border-slate-600"><span className="w-6 font-mono text-[10px] text-slate-700">{String(rank).padStart(2, '0')}</span><div className="h-10 w-10 shrink-0 overflow-hidden border border-slate-800 bg-[#0b1422] p-1">{(player as any).image_url && <img src={storageUrl((player as any).image_url)} alt={player.name} className="h-full w-full object-contain" />}</div><span className="min-w-0 flex-1 truncate font-heading font-bold uppercase text-slate-200 group-hover:text-white">{player.name}</span><span className="hidden font-mono text-[9px] uppercase text-slate-600 sm:block">{(player as any).role || 'PLAYER'}</span></Link> }
function Ranking({ title, eyebrow, players, field, clubStats }: { title: string; eyebrow: string; players: Player[]; field: 'apps' | 'goals' | 'trophies'; clubStats: Map<string, { apps: number; goals: number }> }) { return <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><div className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-600">{eyebrow}</div><h2 className="mt-1 font-heading text-xl font-black uppercase text-white">{title}</h2><div className="mt-4 space-y-1">{players.slice(0, 10).map((p, i) => { const value = field === 'trophies' ? Number((p as any).trophies || 0) : getClubMetric(p, clubStats, field); return <Link key={p.id} to="/player/$id" params={{ id: String(p.id) }} className="group flex items-center gap-3 border-b border-slate-900 px-2 py-3 hover:bg-white/[0.02]"><span className="w-5 font-mono text-[9px] text-slate-700">{i + 1}</span><span className="min-w-0 flex-1 truncate font-heading text-sm font-bold uppercase text-slate-300 group-hover:text-white">{p.name}</span><span className="font-mono text-sm font-black text-slate-100">{value.toLocaleString()}</span></Link> })}{!players.length && <Empty />}</div></section> }
function rankPlayers(players: Player[], stats: Map<string, { apps: number; goals: number }>, field: 'apps' | 'goals') { return [...players].sort((a, b) => getClubMetric(b, stats, field) - getClubMetric(a, stats, field) || String(a.name).localeCompare(String(b.name))) }
function getClubMetric(player: Player, stats: Map<string, { apps: number; goals: number }>, field: 'apps' | 'goals') { return stats.get(String(player.id))?.[field] || 0 }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 3).map((x) => x[0]).join('').toUpperCase() }
function Empty() { return <div className="border border-dashed border-slate-800 p-6 text-center font-mono text-[10px] uppercase tracking-widest text-slate-700">No records in this archive.</div> }
