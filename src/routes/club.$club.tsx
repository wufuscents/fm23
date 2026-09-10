import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { TEAM_COLORS } from '../lib/team-colors'

function normalizeClubName(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(football|futbol|club|fc|cf|afc|ac|sc|calcio|de|del|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
}

const CLUB_ALIASES: Record<string, string> = {
  manchesterunited: 'manchesterunited',
  manchesterutd: 'manchesterunited',
  manunited: 'manchesterunited',
  manutd: 'manchesterunited',
  manu: 'manchesterunited',
  manchesteru: 'manchesterunited',
  manchesterunitedfc: 'manchesterunited',
  manchesterunitedfootballclub: 'manchesterunited',
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
  inter: 'intermilan',
  intermilan: 'intermilan',
  internazionale: 'intermilan',
}

function canonicalClubKey(value: unknown): string {
  const normalized = normalizeClubName(value)
  return CLUB_ALIASES[normalized] || normalized
}

function sameClubName(a: unknown, b: unknown): boolean {
  const left = canonicalClubKey(a)
  const right = canonicalClubKey(b)
  return Boolean(left && right && left === right)
}

async function fetchAllPlayers(): Promise<any[]> {
  const pageSize = 1000
  const rows: any[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .range(from, from + pageSize - 1)

    if (error) {
      if (from === 0) return []
      break
    }

    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) break
  }

  return rows
}

async function fetchAllCareerRows(): Promise<any[]> {
  const pageSize = 1000
  const rows: any[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('player_career_history')
      .select('player_id, team_name, club_logo_url, years, apps, goals')
      .range(from, from + pageSize - 1)

    if (error) {
      if (from === 0) return []
      break
    }

    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) break
  }

  return rows
}

export const Route = createFileRoute('/club/$club')({
  loader: async ({ params }) => {
    const decoded = decodeURIComponent(params.club)

    let playerRows = await fetchAllPlayers()
    if (playerRows.length === 0) {
      const fallback = await supabase.from('player_directory_view').select('*')
      playerRows = fallback.data || []
    }

    const careers = await fetchAllCareerRows()

    // The dedicated club_logos table is the primary logo source. The old view
    // and career-history logos remain fallbacks so existing clubs keep working.
    let logo = ''
    const { data: clubLogoRow } = await supabase
      .from('club_logos')
      .select('club_name, club_logo_url')
      .limit(1000)

    const directLogoMatch = (clubLogoRow || []).find((row: any) => sameClubName(row.club_name, decoded))
    logo = String(directLogoMatch?.club_logo_url || '')

    if (!logo) {
      const { data: clubViewRows } = await supabase
        .from('club_leaderboard_view')
        .select('club_name, club_logo_url')

      const viewMatch = (clubViewRows || []).find((row: any) => sameClubName(row.club_name, decoded))
      logo = String(viewMatch?.club_logo_url || '')
    }

    const matchingCareerRows = careers.filter((c: any) => sameClubName(c.team_name, decoded))
    const matchingIds = new Set(matchingCareerRows.map((c: any) => String(c.player_id)))

    // A player is connected to a club through either their career history or
    // their legacy-club relationship. Status decides Legend vs Icon; the
    // icon_at_clubs column is intentionally not used because the database
    // currently stores both legacy types in legend_at_clubs.
    const players = (playerRows as Player[]).filter((p: any) => {
      const legacyClubs = Array.isArray(p.legend_at_clubs) ? p.legend_at_clubs : []
      return (
        matchingIds.has(String(p.id)) ||
        legacyClubs.some((name: unknown) => sameClubName(name, decoded))
      )
    })

    if (!logo) {
      const careerLogo = matchingCareerRows.find((row: any) => String(row.club_logo_url || '').trim())
      logo = String(careerLogo?.club_logo_url || '')
    }

    return { club: decoded, players, matchingCareerRows, logo }
  },
  component: ClubPage,
})

function ClubPage() {
  const { club, players, matchingCareerRows, logo } = Route.useLoaderData()
  const color = TEAM_COLORS[club] || '#3b82f6'

  const legends = useMemo(() => players.filter((p) => {
    const legacyClubs = Array.isArray((p as any).legend_at_clubs) ? (p as any).legend_at_clubs : []
    const status = String((p as any).status || '').trim().toLowerCase()
    return (
      legacyClubs.some((name: unknown) => sameClubName(name, club)) &&
      status.includes('legend')
    )
  }), [players, club])

  const icons = useMemo(() => players.filter((p) => {
    const legacyClubs = Array.isArray((p as any).legend_at_clubs) ? (p as any).legend_at_clubs : []
    const status = String((p as any).status || '').trim().toLowerCase()
    return (
      legacyClubs.some((name: unknown) => sameClubName(name, club)) &&
      status.includes('icon') &&
      !status.includes('legend')
    )
  }), [players, club])

  const clubStats = useMemo(() => {
    const byPlayer = new Map<string, { apps: number; goals: number }>()
    matchingCareerRows.forEach((row: any) => {
      const id = String(row.player_id || '')
      if (!id) return
      const current = byPlayer.get(id) || { apps: 0, goals: 0 }
      current.apps += Number(row.apps || 0)
      current.goals += Number(row.goals || 0)
      byPlayer.set(id, current)
    })
    return byPlayer
  }, [matchingCareerRows])

  const rankedApps = useMemo(
    () => [...players].sort(
      (a, b) => getClubMetric(b, clubStats, 'apps') - getClubMetric(a, clubStats, 'apps') || String(a.name).localeCompare(String(b.name)),
    ),
    [players, clubStats],
  )

  const rankedGoals = useMemo(
    () => [...players].sort(
      (a, b) => getClubMetric(b, clubStats, 'goals') - getClubMetric(a, clubStats, 'goals') || String(a.name).localeCompare(String(b.name)),
    ),
    [players, clubStats],
  )

  // IMPORTANT: trophies are career-wide. We do not have data saying which
  // club each trophy was won at, so this ranking intentionally uses the
  // player's overall players.trophies value for every player connected to
  // this club.
  const rankedTrophies = useMemo(
    () => [...players].sort(
      (a, b) => getCareerTrophies(b) - getCareerTrophies(a) || String(a.name).localeCompare(String(b.name)),
    ),
    [players],
  )

  const totals = useMemo(() => ({
    apps: matchingCareerRows.reduce((sum: number, r: any) => sum + Number(r.apps || 0), 0),
    goals: matchingCareerRows.reduce((sum: number, r: any) => sum + Number(r.goals || 0), 0),
    trophies: players.reduce((sum, p) => sum + getCareerTrophies(p), 0),
  }), [matchingCareerRows, players])

  const nations = useMemo(() => {
    const map = new Map<string, { count: number; flag: string }>()
    players.forEach((p: any) => {
      const name = String(p.nationality || p.nation || '').trim()
      if (!name) return
      const existing = map.get(name) || { count: 0, flag: '' }
      existing.count += 1
      existing.flag ||= String(p.nationality_flag_url || p.nation_flag || '')
      map.set(name, existing)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
  }, [players])

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div
          className="overflow-hidden rounded-3xl border bg-slate-900/80 p-6 sm:p-10"
          style={{
            borderColor: `${color}88`,
            background: `radial-gradient(circle at 85% 10%, ${color}30, transparent 35%), rgba(15,23,42,.9)`,
          }}
        >
          <nav className="mb-8 flex gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Link to="/" className="text-slate-500 hover:text-white">Directory</Link>
            <span className="text-slate-700">/</span>
            <span className="text-white">Club</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-slate-950/70 p-3"
              style={{ borderColor: `${color}66` }}
            >
              {logo ? (
                <img src={storageUrl(logo)} alt={club} className="h-full w-full object-contain" />
              ) : (
                <span className="font-heading text-xl font-black" style={{ color }}>
                  {club.split(/\s+/).slice(0, 3).map((x) => x[0]).join('').toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color }}>CLUB ARCHIVE</div>
              <h1 className="mt-1 font-heading text-4xl font-black uppercase tracking-wider text-white sm:text-6xl">{club}</h1>
              <p className="mt-2 font-mono text-xs text-slate-500">{players.length} archived players connected to this club.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries({ Players: players.length, 'Club Apps': totals.apps, 'Club Goals': totals.goals, Trophies: totals.trophies }).map(([k, v]) => (
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

        <div className="grid gap-6 lg:grid-cols-3">
          <Ranking title="Most Appearances" players={rankedApps} field="apps" clubStats={clubStats} />
          <Ranking title="Most Goals" players={rankedGoals} field="goals" clubStats={clubStats} />
          <Ranking title="Most Trophies" players={rankedTrophies} field="trophies" clubStats={clubStats} />
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-600">CONNECTED DATABASE</div>
              <h2 className="mt-1 font-heading text-2xl font-black uppercase text-white">Player Nations</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">{nations.length} nations</span>
          </div>
          {nations.length ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {nations.map(([name, info]) => (
                <Link
                  key={name}
                  to="/nation/$nation"
                  params={{ nation: name }}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-slate-600"
                >
                  <div className="flex h-8 w-11 items-center justify-center">
                    {info.flag ? <img src={info.flag} alt="" className="max-h-6 max-w-9 object-contain" /> : null}
                  </div>
                  <span className="flex-1 truncate font-heading font-bold uppercase text-white">{name}</span>
                  <span className="font-mono text-[9px] text-slate-500">{info.count}</span>
                </Link>
              ))}
            </div>
          ) : <Empty />}
        </section>
      </div>
    </div>
  )
}

function getCareerTrophies(player: Player): number {
  return Number((player as any).trophies || 0)
}

function getClubMetric(
  player: Player,
  stats: Map<string, { apps: number; goals: number }>,
  field: 'apps' | 'goals',
) {
  return stats.get(String(player.id))?.[field] || 0
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
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600"
    >
      <span className="w-6 font-mono text-xs text-slate-600">{rank}</span>
      <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-900 p-1">
        {(player as any).image_url && (
          <img src={storageUrl((player as any).image_url)} alt={player.name} className="h-full w-full object-contain" />
        )}
      </div>
      <span className="flex-1 truncate font-heading font-bold uppercase text-white">{player.name}</span>
      <span className="font-mono text-[9px] uppercase text-slate-500">{(player as any).role || 'PLAYER'}</span>
    </Link>
  )
}

function Ranking({
  title,
  players,
  field,
  clubStats,
}: {
  title: string
  players: Player[]
  field: 'apps' | 'goals' | 'trophies'
  clubStats: Map<string, { apps: number; goals: number }>
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="font-heading text-2xl font-black uppercase text-white">{title}</h2>
      <div className="mt-4 space-y-2">
        {players.slice(0, 10).map((p, i) => {
          const value = field === 'trophies' ? getCareerTrophies(p) : getClubMetric(p, clubStats, field)
          return (
            <Link
              key={p.id}
              to="/player/$id"
              params={{ id: String(p.id) }}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600"
            >
              <span className="w-6 font-mono text-xs text-slate-600">{i + 1}</span>
              <span className="flex-1 truncate font-heading font-bold text-white">{p.name}</span>
              <span className="font-mono text-sm font-black text-emerald-400">{value.toLocaleString()}</span>
            </Link>
          )
        })}
        {!players.length && <Empty />}
      </div>
    </section>
  )
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center font-mono text-xs text-slate-600">No records in this archive.</div>
}
