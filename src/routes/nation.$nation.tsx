import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'
import { filterPlayersForProfile, getArchiveProfile } from '../lib/archive-auth'

function normalizeNation(value: unknown): string { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase() }
function sameNation(a: unknown, b: unknown): boolean { const left = normalizeNation(a); const right = normalizeNation(b); return Boolean(left && right && left === right) }
function normalizeClubName(value: unknown): string { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/\b(football|futbol|club|fc|cf|afc|ac|sc|calcio|de|del|the)\b/g, ' ').replace(/[^a-z0-9]+/g, '') }

const CLUB_ALIASES: Record<string, string> = {
  manchesterunited: 'manchesterunited',
  manchesterutd: 'manchesterunited',
  manunited: 'manchesterunited',
  manutd: 'manchesterunited',
  manu: 'manchesterunited',
  manchesteru: 'manchesterunited',
  manufc: 'manchesterunited',

  bayern: 'bayernmunich',
  bayernmunich: 'bayernmunich',
  bayernmunchen: 'bayernmunich',
  fcbayern: 'bayernmunich',

  psg: 'parissaintgermain',
  parissaintgermain: 'parissaintgermain',

  barcelona: 'barcelona',
  barca: 'barcelona',

  realmadrid: 'realmadrid',
  realmadridcf: 'realmadrid',

  milan: 'milan',
  acmilan: 'milan',

  intermilan: 'intermilan',
  internazionale: 'intermilan',
  inter: 'intermilan',

  feyenoord: 'feyenoord',
  feyenoordrotterdam: 'feyenoord',
}

function canonicalClubKey(value: unknown): string { const normalized = normalizeClubName(value); return CLUB_ALIASES[normalized] || normalized }
function sameClubName(a: unknown, b: unknown): boolean { const left = canonicalClubKey(a); const right = canonicalClubKey(b); return Boolean(left && right && left === right) }

export const Route = createFileRoute('/nation/$nation')({
  loader: async ({ params }) => {
    let { data, error } = await supabase.from('players').select('*')
    if (error || !data || data.length === 0) { const fallback = await supabase.from('player_directory_view').select('*'); data = fallback.data || [] }
    const rawParam = String(params.nation || ''); let decoded = rawParam
    try { decoded = decodeURIComponent(rawParam) } catch { decoded = rawParam }
    const players = (data || []).filter((p: any) => sameNation(p.nationality ?? p.nation ?? p.nationality_name, decoded)) as Player[]
    const canonicalNation = String(players[0]?.nationality ?? players[0]?.nation ?? decoded).trim() || decoded
    const { data: directoryRows } = await supabase.from('player_directory_view').select('id, apps, goals')
    const careerTotals: Record<string, { apps: number; goals: number }> = {}
    ;(directoryRows || []).forEach((row: any) => { const id = String(row.id || ''); if (id) careerTotals[id] = { apps: Number(row.apps || 0), goals: Number(row.goals || 0) } })
    const missingIds = new Set(players.map((p) => String(p.id)).filter((id) => !careerTotals[id]))
    if (missingIds.size) { const { data: careerRows } = await supabase.from('player_career_history').select('player_id, apps, goals'); ;(careerRows || []).forEach((row: any) => { const id = String(row.player_id || ''); if (!id || !missingIds.has(id)) return; if (!careerTotals[id]) careerTotals[id] = { apps: 0, goals: 0 }; careerTotals[id].apps += Number(row.apps || 0); careerTotals[id].goals += Number(row.goals || 0) }) }
    const playerIds = new Set(players.map((p) => String(p.id)))
    const { data: careers } = await supabase.from('player_career_history').select('player_id, team_name, club_logo_url, apps, goals')
    const nationCareers = (careers || []).filter((row: any) => playerIds.has(String(row.player_id)))
    return { nation: canonicalNation, players, careerTotals, nationCareers }
  },
  component: NationPage,
})

function NationPage() {
  const { nation, players: loadedPlayers, careerTotals, nationCareers: loadedNationCareers } = Route.useLoaderData()
  const archiveProfile = getArchiveProfile()
  const players = useMemo(() => filterPlayersForProfile(loadedPlayers, archiveProfile), [loadedPlayers, archiveProfile])
  const visibleIds = useMemo(() => new Set(players.map((player: any) => String(player.id))), [players])
  const nationCareers = useMemo(() => loadedNationCareers.filter((row: any) => visibleIds.has(String(row.player_id))), [loadedNationCareers, visibleIds])
  const color = TEAM_COLORS[nation] || '#3b82f6'
  const getApps = (p: Player) => careerTotals[String(p.id)]?.apps || 0
  const getGoals = (p: Player) => careerTotals[String(p.id)]?.goals || 0
  const legends = useMemo(() => players.filter((p) => String((p as any).status || '').trim().toLowerCase().includes('legend')), [players])
  const icons = useMemo(() => players.filter((p) => String((p as any).status || '').trim().toLowerCase().includes('icon')), [players])
  const rankedApps = useMemo(() => [...players].sort((a, b) => getApps(b) - getApps(a) || String(a.name).localeCompare(String(b.name))), [players, careerTotals])
  const rankedGoals = useMemo(() => [...players].sort((a, b) => getGoals(b) - getGoals(a) || String(a.name).localeCompare(String(b.name))), [players, careerTotals])
  const rankedTrophies = useMemo(() => [...players].sort((a, b) => Number((b as any).trophies || 0) - Number((a as any).trophies || 0) || String(a.name).localeCompare(String(b.name))), [players])
  const representative = players.find((p) => (p as any).nationality_flag_url || (p as any).nation_flag)
  const flag = String((representative as any)?.nationality_flag_url || (representative as any)?.nation_flag || '')
  const totals = useMemo(() => players.reduce((a, p) => ({ apps: a.apps + getApps(p), goals: a.goals + getGoals(p), assists: a.assists + Number((p as any).assists || 0), trophies: a.trophies + Number((p as any).trophies || 0) }), { apps: 0, goals: 0, assists: 0, trophies: 0 }), [players, careerTotals])
  const clubs = useMemo(() => {
    const map = new Map<string, { name: string; count: number; apps: number; goals: number; logo: string }>()
    nationCareers.forEach((row: any) => {
      const raw = String(row.team_name || '').trim()
      if (!raw) return
      const key = canonicalClubKey(raw)
      if (!key) return
      const current = map.get(key) || { name: raw, count: 0, apps: 0, goals: 0, logo: '' }
      current.count += 1
      current.apps += Number(row.apps || 0)
      current.goals += Number(row.goals || 0)
      current.logo ||= String(row.club_logo_url || '')
      // Prefer the most recognizable/full club name when aliases were merged.
      if (raw.length > current.name.length) current.name = raw
      map.set(key, current)
    })
    return [...map.values()]
      .sort((a, b) => b.apps - a.apps || b.count - a.count || a.name.localeCompare(b.name))
  }, [nationCareers])

  return <div className="min-h-screen bg-[#070d18] p-4 text-slate-100 sm:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="relative overflow-hidden rounded-2xl border bg-[#0c1526] p-6 sm:p-10" style={{ borderColor: `${color}77` }}><div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 88% 8%, ${color}26, transparent 32%), linear-gradient(135deg, ${color}09, transparent 55%)` }} /><div className="relative"><ArchiveNav current="NATION" /><div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-5 sm:gap-7"><div className="flex h-24 w-32 shrink-0 items-center justify-center border border-white/10 bg-[#050a13] p-4 sm:h-32 sm:w-40">{flag ? <img src={storageUrl(flag)} alt={nation} className="max-h-20 max-w-32 object-contain" /> : <span className="font-mono text-[10px] text-slate-600">NO FLAG</span>}</div><div><div className="font-mono text-[10px] uppercase tracking-[0.32em]" style={{ color }}>ARCHIVE / NATIONAL DOSSIER</div><h1 className="mt-2 font-heading text-4xl font-black uppercase leading-none tracking-[0.04em] text-white sm:text-6xl">{nation}</h1><div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">{players.length} connected player profiles</div></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Metric label="PLAYERS" value={players.length} /><Metric label="APPS" value={totals.apps} /><Metric label="GOALS" value={totals.goals} /><Metric label="ASSISTS" value={totals.assists} /><Metric label="LEGENDS" value={legends.length} accent="#fbbf24" /><Metric label="ICONS" value={icons.length} accent="#cbd5e1" /></div></div></div></header>
    <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><SectionHeader eyebrow="NATIONAL RECORD / 01" title="Archive Totals" count={`${totals.trophies.toLocaleString()} connected trophies`} /><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="APPS" value={totals.apps} /><Metric label="GOALS" value={totals.goals} /><Metric label="ASSISTS" value={totals.assists} /><Metric label="TROPHIES" value={totals.trophies} /></div></section>
    <section className="grid gap-6 lg:grid-cols-2"><LegacySection title="National Legends" eyebrow="LEGACY INDEX / 01" color="#fbbf24" players={legends} /><LegacySection title="National Icons" eyebrow="LEGACY INDEX / 02" color="#cbd5e1" players={icons} /></section>
    <section className="grid gap-6 lg:grid-cols-3"><Ranking title="Most Appearances" eyebrow="RECORD INDEX / 01" players={rankedApps} getValue={getApps} /><Ranking title="Top Scorers" eyebrow="RECORD INDEX / 02" players={rankedGoals} getValue={getGoals} /><Ranking title="Most Decorated" eyebrow="RECORD INDEX / 03" players={rankedTrophies} getValue={(p) => Number((p as any).trophies || 0)} /></section>
    <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><SectionHeader eyebrow="CONNECTED DATABASE / CLUBS" title="Represented Clubs" count={`${clubs.length} clubs`} />{clubs.length ? <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{clubs.map((entry) => <Link key={canonicalClubKey(entry.name)} to="/club/$club" params={{ club: entry.name }} className="group flex items-center gap-3 border border-slate-800 bg-[#060c16] p-3 transition-all hover:-translate-y-0.5 hover:border-slate-600"><div className="flex h-10 w-12 items-center justify-center">{entry.logo && <img src={storageUrl(entry.logo)} alt="" className="max-h-8 max-w-10 object-contain" />}</div><div className="min-w-0 flex-1"><div className="truncate font-heading text-sm font-bold uppercase text-slate-200 group-hover:text-white">{entry.name}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-600">{entry.count} player spell{entry.count === 1 ? '' : 's'} / {entry.apps.toLocaleString()} apps</div></div><span className="font-mono text-[9px] text-slate-600">→</span></Link>)}</div> : <Empty />}</section>
    <div className="border-t border-slate-900 pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-700">FM SQUAD ARCHIVE // NATIONAL RECORD // SOURCE: PLAYER + CAREER HISTORY</div>
  </div></div>
}
function ArchiveNav({ current }: { current: string }) { return <nav className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em]"><Link to="/" className="text-slate-600 hover:text-white">Directory</Link><span className="text-slate-800">/</span><span className="text-slate-300">{current}</span></nav> }
function SectionHeader({ eyebrow, title, count }: { eyebrow: string; title: string; count?: string }) { return <div className="flex items-end justify-between gap-4"><div><div className="font-mono text-[9px] uppercase tracking-[0.24em] text-blue-500">{eyebrow}</div><h2 className="mt-1 font-heading text-2xl font-black uppercase tracking-wide text-white">{title}</h2></div>{count && <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">{count}</span>}</div> }
function Metric({ label, value, accent = '#e2e8f0' }: { label: string; value: number; accent?: string }) { return <div className="border border-white/10 bg-[#050a13]/80 p-3"><div className="font-mono text-xl font-black" style={{ color: accent }}>{value.toLocaleString()}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">{label}</div></div> }
function LegacySection({ title, eyebrow, color, players }: { title: string; eyebrow: string; color: string; players: Player[] }) { return <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><div className="font-mono text-[9px] uppercase tracking-[0.24em]" style={{ color }}>{eyebrow}</div><h2 className="mt-1 font-heading text-2xl font-black uppercase text-white">{title}</h2><div className="mt-5 space-y-2">{players.map((p, i) => <PlayerRow key={p.id} player={p} rank={i + 1} />)}{!players.length && <Empty />}</div></section> }
function PlayerRow({ player, rank }: { player: Player; rank: number }) { return <Link to="/player/$id" params={{ id: String(player.id) }} className="group flex items-center gap-3 border border-slate-800 bg-[#060c16] p-3 transition-all hover:-translate-y-0.5 hover:border-slate-600"><span className="w-6 font-mono text-[10px] text-slate-700">{String(rank).padStart(2, '0')}</span><div className="h-10 w-10 shrink-0 overflow-hidden border border-slate-800 bg-[#0b1422] p-1">{(player as any).image_url && <img src={storageUrl((player as any).image_url)} alt={player.name} className="h-full w-full object-contain" />}</div><span className="min-w-0 flex-1 truncate font-heading font-bold uppercase text-slate-200 group-hover:text-white">{player.name}</span><span className="hidden font-mono text-[9px] uppercase text-slate-600 sm:block">{(player as any).role || 'PLAYER'}</span></Link> }
function Ranking({ title, eyebrow, players, getValue }: { title: string; eyebrow: string; players: Player[]; getValue: (player: Player) => number }) { return <section className="border border-slate-800 bg-[#0a1220] p-5 sm:p-6"><div className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-600">{eyebrow}</div><h2 className="mt-1 font-heading text-xl font-black uppercase text-white">{title}</h2><div className="mt-4 space-y-1">{players.slice(0, 10).map((p, i) => <Link key={p.id} to="/player/$id" params={{ id: String(p.id) }} className="group flex items-center gap-3 border-b border-slate-900 px-2 py-3 hover:bg-white/[0.02]"><span className="w-5 font-mono text-[9px] text-slate-700">{i + 1}</span><span className="min-w-0 flex-1 truncate font-heading text-sm font-bold uppercase text-slate-300 group-hover:text-white">{p.name}</span><span className="font-mono text-sm font-black text-slate-100">{getValue(p).toLocaleString()}</span></Link>)}{!players.length && <Empty />}</div></section> }
function Empty() { return <div className="border border-dashed border-slate-800 p-6 text-center font-mono text-[10px] uppercase tracking-widest text-slate-700">No records in this archive.</div> }
