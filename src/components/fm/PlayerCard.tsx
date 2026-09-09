import { Player } from '../lib/types'
import { storageUrl } from '../lib/fm'

export function PlayerCard({ player }: { player: Player }) {
  const statusLower = player.status?.toLowerCase() || ''
  const isLegend = statusLower === 'legend'
  const isIcon = statusLower === 'icon'

  const cardTheme = isLegend
    ? 'border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-slate-900/90'
    : isIcon
    ? 'border-slate-300/60 shadow-[0_0_15px_rgba(203,213,225,0.15)] bg-slate-900/90'
    : 'border-slate-800 bg-slate-900/70 shadow-black/30'

  const statusBadge = isLegend
    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
    : isIcon
    ? 'bg-slate-300/20 text-slate-200 border-slate-300/50 shadow-[0_0_8px_rgba(255,255,255,0.1)]'
    : 'bg-slate-800 text-slate-400 border-slate-700'

  return (
    <div
      className={`relative flex flex-col justify-between p-4 rounded-xl border backdrop-blur-md transition-all duration-200 hover:scale-[1.02] ${cardTheme}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {player.nation_flag && (
              <img
                src={player.nation_flag}
                alt={player.nation}
                className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0 shadow-sm"
              />
            )}
            <h3 className="font-heading font-bold text-base sm:text-lg text-white truncate uppercase tracking-wider">
              {player.name}
            </h3>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${statusBadge}`}
          >
            {player.status || 'Player'}
          </span>
        </div>

        <div className="flex items-center gap-3 my-2">
          <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800/80 border border-slate-700/60 shadow-inner">
            <img
              src={storageUrl(player.photo_url)}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col justify-center min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-400 truncate">
              {player.club_description || `${player.status || 'Squad'} • ${player.current_club || player.nation}`}
            </p>

            <p className="text-xs text-slate-400 truncate mt-0.5">
              {player.nation}
            </p>

            <div className="mt-2">
              <span className="text-[11px] font-mono text-slate-300 bg-slate-800/90 px-2 py-1 rounded border border-slate-700/50 block truncate max-w-full">
                {player.position || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

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
