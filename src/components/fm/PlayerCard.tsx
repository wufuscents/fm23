import { Link } from '@tanstack/react-router'
import { Player } from '../../lib/types'
import { storageUrl } from '../../lib/fm'

export function Flag({ url, name }: { url?: string | null; name?: string | null }) {
  const flagSrc = url || ''
  if (!flagSrc) return null
  return (
    <img
      src={flagSrc}
      alt={name || 'Flag'}
      className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0 shadow-sm"
    />
  )
}

export function Avatar({
  url,
  image_url,
  photo_url,
  name,
  className = 'w-24 h-24',
}: {
  url?: string | null
  image_url?: string | null
  photo_url?: string | null
  name?: string | null
  className?: string
}) {
  const photoPath = url || image_url || photo_url || ''
  return (
    <div className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-slate-900/90 border border-slate-700/60 shadow-inner flex items-center justify-center ${className}`}>
      {photoPath ? (
        <img
          src={storageUrl(photoPath)}
          alt={name || 'Player'}
          className="w-full h-full object-contain max-h-full p-1"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 font-mono text-[10px]">
          NO IMAGE
        </div>
      )}
    </div>
  )
}

export function PlayerCard({ player }: { player: Player }) {
  const statusLower = (player.status || '').toLowerCase()
  const isLegend = statusLower.includes('legend') || (player.legend_at_clubs && player.legend_at_clubs.length > 0)
  const isIcon = statusLower.includes('icon') || (player.icon_at_clubs && player.icon_at_clubs.length > 0)

  const genderVal = (player.gender || '').toLowerCase()
  const isFemale = genderVal === 'female' || genderVal === 'f'

  let cardBorder = 'border-slate-800 bg-slate-900/70'
  let statusBadge = 'bg-slate-800 text-slate-400 border-slate-700'
  let roleText = 'text-amber-400'

  if (isFemale) {
    if (isLegend) {
      cardBorder = 'border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.2)] bg-gradient-to-b from-pink-950/40 via-slate-900 to-slate-900'
      statusBadge = 'bg-pink-500/20 text-pink-300 border-pink-400/50'
      roleText = 'text-pink-400'
    } else if (isIcon) {
      cardBorder = 'border-fuchsia-300/50 shadow-[0_0_15px_rgba(217,70,239,0.15)] bg-slate-900/90'
      statusBadge = 'bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-300/40'
      roleText = 'text-fuchsia-300'
    }
  } else {
    if (isLegend) {
      cardBorder = 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.2)] bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900'
      statusBadge = 'bg-amber-400/20 text-amber-300 border-amber-400/50'
      roleText = 'text-amber-400'
    } else if (isIcon) {
      cardBorder = 'border-slate-300/60 shadow-[0_0_15px_rgba(203,213,225,0.15)] bg-slate-900/90'
      statusBadge = 'bg-slate-300/20 text-slate-200 border-slate-300/50'
      roleText = 'text-slate-300'
    }
  }

  const playerImage = player.image_url || player.photo_url || ''
  const playerNation = player.nationality || player.nation || 'Global'
  const playerFlag = player.nationality_flag_url || player.nation_flag || null
  const playerPos = player.role || player.positions_short || player.position || '-'

  const legendClubs = player.legend_at_clubs || []
  const iconClubs = player.icon_at_clubs || []

  return (
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className={`relative flex flex-col justify-between p-4 rounded-xl border backdrop-blur-md transition-all duration-200 hover:scale-[1.02] block ${cardBorder}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Flag url={playerFlag} name={playerNation} />
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

        <div className="flex items-start gap-3 my-2">
          <Avatar url={playerImage} name={player.name} className="w-24 h-24" />

          <div className="flex flex-col justify-center min-w-0 flex-1">
            {legendClubs.length > 0 ? (
              <p className={`text-xs font-semibold truncate ${roleText}`}>
                Legend • {legendClubs.join(', ')}
              </p>
            ) : iconClubs.length > 0 ? (
              <p className={`text-xs font-semibold truncate ${roleText}`}>
                Icon • {iconClubs.join(', ')}
              </p>
            ) : (
              <p className={`text-xs font-semibold truncate ${roleText}`}>
                {player.status || 'Squad Member'}
              </p>
            )}

            <p className="text-xs text-slate-400 truncate mt-0.5">
              {playerNation}
            </p>

            <div className="mt-2">
              <span className="text-[11px] font-mono text-slate-300 bg-slate-800/90 px-2 py-1 rounded border border-slate-700/50 block truncate max-w-full">
                {playerPos}
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
    </Link>
  )
}
