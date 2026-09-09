// src/components/PlayerCard.tsx
import { Player } from '@/lib/types'
import { storageUrl } from '@/lib/fm'

export function PlayerCard({ player }: { player: Player }) {
  const isLegend = player.status?.toLowerCase() === 'legend'
  const isIcon = player.status?.toLowerCase() === 'icon'

  // Card theme variants
  const cardBorder = isLegend
    ? 'border-amber-400/50 shadow-amber-500/10'
    : isIcon
    ? 'border-slate-300/60 shadow-slate-300/10'
    : 'border-slate-700/50 shadow-black/20'

  const statusBadge = isLegend
    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
    : isIcon
    ? 'bg-slate-200/20 text-slate-200 border-slate-300/40'
    : 'bg-slate-800 text-slate-400 border-slate-700'

  return (
    <div className={`relative flex flex-col justify-between p-4 rounded-xl border bg-slate-900/80 backdrop-blur-md hover:scale-[1.02] transition-all duration-200 ${cardBorder}`}>
      {/* 7. Top Bar: Name & Flag First */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {player.nation_flag && (
            <img src={player.nation_flag} alt={player.nation} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
          )}
          {/* 1. Truncate long names to fit UI */}
          <h3 className="font-heading font-bold text-lg text-white truncate uppercase tracking-wider">
            {player.name}
          </h3>
        </div>
        
        {/* 4. Silver badge for Icons, Gold for Legends */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${statusBadge}`}>
          {player.status || 'Player'}
        </span>
      </div>

      {/* 2. Larger Avatar */}
      <div className="flex items-center gap-4 my-2">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800/80 border border-slate-700/60">
          <img
            src={storageUrl(player.photo_url)}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </div>

        <div className="flex flex-col justify-center min-w-0">
          {/* 3. Reverted Club Description */}
          <p className="text-xs text-amber-400 font-semibold truncate">
            {player.club_description || `${player.status || 'Member'} • ${player.current_club || player.nation}`}
          </p>
          
          <p className="text-xs text-slate-400 truncate mt-1">
            {player.nation}
          </p>

          {/* Position Tag at the bottom */}
          <div className="mt-2">
            <span className="text-[11px] font-mono text-slate-300 bg-slate-800/90 px-2 py-1 rounded border border-slate-700/50 block truncate max-w-full">
              {player.position || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Stats Grid */}
      <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-slate-800/80 text-center font-mono">
        <div>
          <div className="text-sm font-bold text-white">{player.apps ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Apps</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{player.goals ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Gls</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{player.trophies ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Trph</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{player.awards ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Awd</div>
        </div>
      </div>
    </div>
  )
}
