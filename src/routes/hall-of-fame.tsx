import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'
import { Flag } from '../components/fm/PlayerCard'

export const Route = createFileRoute('/hall-of-fame')({
  loader: async () => {
    let { data, error } = await supabase.from('player_directory_view').select('*')
    if (error || !data || data.length === 0) {
      const fallback = await supabase.from('players').select('*')
      data = fallback.data || []
    }

    const awardRows: Array<{ player_id: string | null; name: string | null; amount: number | null }> = []
    const pageSize = 1000
    let from = 0
    while (true) {
      const { data: page, error: awardsError } = await supabase
        .from('awards_and_trophies')
        .select('player_id, name, amount')
        .range(from, from + pageSize - 1)
      if (awardsError || !page || page.length === 0) break
      awardRows.push(...page)
      if (page.length < pageSize) break
      from += pageSize
    }

    const ballonDorCounts: Record<string, number> = {}
    for (const award of awardRows) {
      const name = String(award.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’'`]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
      if (name.includes('ballon dor')) {
        const id = String(award.player_id || '')
        if (id) ballonDorCounts[id] = (ballonDorCounts[id] || 0) + Number(award.amount || 1)
      }
    }

    return { players: (data || []) as Player[], ballonDorCounts }
  },
  component: HallOfFamePage,
})

type Category = 'legends' | 'icons' | 'trophies' | 'goals' | 'assists' | 'ballon_dor'

function status(player: Player) {
  const value = String((player as any).status || '').toLowerCase()
  return value.includes('legend') ? 'legend' : value.includes('icon') ? 'icon' : 'other'
}

function valueFor(player: Player, category: Category, ballonDorCounts: Record<string, number>) {
  if (category === 'trophies') return Number((player as any).trophies || 0)
  if (category === 'goals') return Number((player as any).goals || 0)
  if (category === 'assists') return Number((player as any).assists || 0)
  if (category === 'ballon_dor') return ballonDorCounts[String(player.id)] || 0
  return 0
}

function HallCard({ player, rank, value, label, ballonDorCounts }: { player: Player; rank: number; value: number; label: string; ballonDorCounts: Record<string, number> }) {
  const s = status(player)
  const accent = s === 'legend' ? '#fbbf24' : s === 'icon' ? '#cbd5e1' : '#60a5fa'
  const nation = (player as any).nationality || (player as any).nation || ''
  const flag = (player as any).nationality_flag_url || (player as any).nation_flag || ''
  const goals = Number((player as any).goals || 0)
  const assists = Number((player as any).assists || 0)
  return (
    <Link to="/player/$id" params={{ id: String(player.id) }} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-slate-600" style={{ boxShadow: `0 0 30px ${accent}10` }}>
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />
        <div className="flex items-center gap-4">
          <div className="w-9 text-center font-heading text-2xl font-black" style={{ color: rank <= 3 ? accent : '#64748b' }}>{rank}</div>
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-1">
            {(player as any).image_url ? <img src={storageUrl((player as any).image_url)} alt={player.name} className="h-full w-full object-contain" /> : <span className="flex h-full items-center justify-center text-[9px] font-mono text-slate-600">NO IMAGE</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-heading text-lg font-extrabold uppercase tracking-wide text-white">{player.name}</h3>
              <Flag url={flag} name={nation} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase tracking-widest">
              <span className="rounded border px-2 py-1" style={{ borderColor: `${accent}66`, color: accent, backgroundColor: `${accent}12` }}>{s === 'other' ? String((player as any).status || 'PLAYER') : s}</span>
              <span className="text-slate-500">{nation || 'Unknown nation'}</span>
            </div>
          </div>
          <div className="hidden sm:block text-right font-mono">
            <div className="text-2xl font-black text-white">{value.toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center font-mono">
          <div><div className="font-bold text-white">{goals.toLocaleString()}</div><div className="text-[8px] uppercase tracking-widest text-slate-600">Goals</div></div>
          <div><div className="font-bold text-white">{assists.toLocaleString()}</div><div className="text-[8px] uppercase tracking-widest text-slate-600">Assists</div></div>
          <div><div className="font-bold text-white">{(ballonDorCounts[String(player.id)] || 0).toLocaleString()}</div><div className="text-[8px] uppercase tracking-widest text-slate-600">Ballon d'Or</div></div>
        </div>
      </div>
    </Link>
  )
}

function HallOfFamePage() {
  const { players, ballonDorCounts } = Route.useLoaderData()
  const [category, setCategory] = useState<Category>('legends')
  const categories: Array<[Category, string]> = [
    ['legends', 'Legends'], ['icons', 'Icons'], ['trophies', 'Most Decorated'], ['goals', 'Most Goals'], ['assists', 'Most Assists'], ['ballon_dor', "Most Ballon d'Ors"],
  ]

  const ranked = useMemo(() => {
    if (category === 'legends' || category === 'icons') {
      return players.filter((p) => status(p) === (category === 'legends' ? 'legend' : 'icon')).sort((a, b) => {
        const ta = Number((a as any).trophies || 0), tb = Number((b as any).trophies || 0)
        return tb - ta || Number((b as any).goals || 0) - Number((a as any).goals || 0)
      }).slice(0, 50)
    }
    return [...players].sort((a, b) => valueFor(b, category, ballonDorCounts) - valueFor(a, category, ballonDorCounts)).slice(0, 50)
  }, [players, category, ballonDorCounts])

  const podium = ranked.slice(0, 3)
  const label = category === 'legends' ? 'Legacy' : category === 'icons' ? 'Legacy' : category === 'ballon_dor' ? "Ballon d'Or" : categories.find(([key]) => key === category)?.[1] || ''

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber-400">FM SQUAD ARCHIVE</div><h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-widest text-white sm:text-6xl">Hall of Fame</h1><p className="mt-2 max-w-2xl font-mono text-xs text-slate-500">The museum floor of the archive — legends, icons and the players who own its all-time records.</p></div>
          <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest"><Link to="/" className="rounded-lg border border-slate-800 px-3 py-2 text-slate-400 hover:text-white">Directory</Link><Link to="/leaderboards" className="rounded-lg border border-slate-800 px-3 py-2 text-slate-400 hover:text-white">Records</Link><Link to="/compare" className="rounded-lg border border-slate-800 px-3 py-2 text-slate-400 hover:text-white">Compare</Link></nav>
        </header>

        {podium.length > 0 && <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {podium.map((p, i) => <HallCard key={p.id} player={p} rank={i + 1} value={category === 'legends' || category === 'icons' ? Number((p as any).trophies || 0) : valueFor(p, category, ballonDorCounts)} label={label} ballonDorCounts={ballonDorCounts} />)}
        </div>}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">{categories.map(([key, text]) => <button key={key} onClick={() => setCategory(key)} className={`rounded-lg border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${category === key ? 'border-amber-400/60 bg-amber-400 text-slate-950' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`}>{text}</button>)}</div>
          <div className="mt-6 space-y-3">
            {ranked.map((p, i) => <HallCard key={p.id} player={p} rank={i + 1} value={category === 'legends' || category === 'icons' ? Number((p as any).trophies || 0) : valueFor(p, category, ballonDorCounts)} label={label} ballonDorCounts={ballonDorCounts} />)}
            {ranked.length === 0 && <div className="py-16 text-center font-mono text-sm text-slate-500">No archive records found for this category.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}
