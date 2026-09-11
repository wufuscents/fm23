import { Link } from '@tanstack/react-router'
import { Player } from '../../lib/types'
import { storageUrl } from '../../lib/fm'

export function Flag({ url, name }: { url?: string | null; name?: string | null }) {
  const flagSrc = storageUrl(url || '')
  if (!flagSrc) return null
  return (
    <img
      src={flagSrc}
      alt={name || 'Flag'}
      className="w-5 h-5 rounded-full object-cover flex-shrink-0 shadow-sm ring-1 ring-white/10"
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
    <div className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-slate-950/80 border border-white/10 shadow-inner flex items-center justify-center transition-all duration-300 ease-out group-hover:border-white/20 group-hover:shadow-lg ${className}`}>
      {photoPath ? (
        <img
          src={storageUrl(photoPath)}
          alt={name || 'Player'}
          className="w-full h-full object-contain max-h-full p-1 transition-transform duration-500 ease-out group-hover:scale-[1.07]"
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
  const statusLower = String(player.status || '').trim().toLowerCase()
  const genderLower = String(player.gender || '').trim().toLowerCase()

  const legendClubs = player.legend_at_clubs || []
  const iconClubs = player.icon_at_clubs || []

  // The explicit status field is the source of truth. The club arrays only
  // describe the clubs associated with that status.
  const isLegend = statusLower.includes('legend')
  const isIcon = !isLegend && statusLower.includes('icon')
  const displayStatus = isLegend ? 'LEGEND' : isIcon ? 'ICON' : (player.status || 'PLAYER')

  const isFemale = genderLower === 'female' || genderLower === 'f'
  const isMale = genderLower === 'male' || genderLower === 'm'

  // Gender controls the card atmosphere. Status controls the prestige layer.
  // This lets combinations such as Female + Legend remain visibly pink + gold.
  let genderAccent = 'slate'
  let cardBackground = 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950'
  let genderText = 'text-slate-300'
  let genderGlow = 'hover:shadow-[0_0_28px_rgba(148,163,184,0.10)]'

  if (isMale) {
    genderAccent = 'blue'
    cardBackground = 'bg-gradient-to-br from-blue-950/80 via-slate-950/95 to-slate-950'
    genderText = 'text-blue-300'
    genderGlow = 'hover:shadow-[0_0_30px_rgba(59,130,246,0.22)]'
  } else if (isFemale) {
    genderAccent = 'pink'
    cardBackground = 'bg-gradient-to-br from-pink-950/80 via-slate-950/95 to-slate-950'
    genderText = 'text-pink-300'
    genderGlow = 'hover:shadow-[0_0_30px_rgba(236,72,153,0.22)]'
  }

  let statusBorder = 'border-slate-700/80'
  let statusBadge = 'bg-slate-800/90 text-slate-300 border-slate-600/80'
  let statusText = genderText
  let statusGlow = ''
  let statusMarker = 'bg-slate-500'

  if (isLegend) {
    statusBorder = 'border-amber-400/90'
    statusBadge = 'bg-amber-400/15 text-amber-300 border-amber-400/70'
    statusText = 'text-amber-300'
    statusGlow = 'shadow-[0_0_20px_rgba(251,191,36,0.16)]'
    statusMarker = 'bg-amber-300'
  } else if (isIcon) {
    statusBorder = 'border-slate-300/80'
    statusBadge = 'bg-slate-200/10 text-slate-100 border-slate-300/70'
    statusText = 'text-slate-200'
    statusGlow = 'shadow-[0_0_18px_rgba(226,232,240,0.14)]'
    statusMarker = 'bg-slate-200'
  }

  const playerImage = player.image_url || player.photo_url || ''
  const playerNation = player.nationality || player.nation || 'Global'
  const playerFlag = player.nationality_flag_url || player.nation_flag || null
  const playerPos = player.role || player.positions_short || player.position || '-'

  const playerGoals = player.goals ?? 0
  const playerAssists = (player as any).assists ?? 0
  const goalContributions = playerGoals + playerAssists
  const goalsPerGame = player.apps && player.apps > 0 ? playerGoals / player.apps : 0

  const accentLine =
    genderAccent === 'blue'
      ? 'from-blue-500/0 via-blue-400/70 to-blue-500/0'
      : genderAccent === 'pink'
        ? 'from-pink-500/0 via-pink-400/70 to-pink-500/0'
        : 'from-slate-500/0 via-slate-400/50 to-slate-500/0'

  const statAccent = isLegend
    ? 'text-amber-100'
    : isIcon
      ? 'text-slate-100'
      : genderText

  return (
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.015] hover:z-10 block overflow-hidden ${cardBackground} ${statusBorder} ${statusGlow} ${genderGlow}`}
    >
      {/* Subtle gender-colored ambient light */}
      <div
        className={`pointer-events-none absolute -top-20 -left-16 h-40 w-40 rounded-full blur-3xl opacity-20 transition-all duration-500 ease-out group-hover:opacity-40 group-hover:scale-125 ${
          genderAccent === 'blue'
            ? 'bg-blue-500'
            : genderAccent === 'pink'
              ? 'bg-pink-500'
              : 'bg-slate-500'
        }`}
      />

      {/* Opposite-side gender light for a subtle depth effect */}
      <div
        className={`pointer-events-none absolute -bottom-24 -right-20 h-44 w-44 rounded-full blur-3xl opacity-10 transition-all duration-500 ease-out group-hover:opacity-25 group-hover:scale-125 ${
          genderAccent === 'blue'
            ? 'bg-blue-400'
            : genderAccent === 'pink'
              ? 'bg-pink-400'
              : 'bg-slate-400'
        }`}
      />

      {/* Status-colored prestige shine */}
      {isLegend && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-400/0 via-amber-300/80 to-amber-400/0" />
      )}
      {isIcon && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-slate-300/0 via-slate-200/80 to-slate-300/0" />
      )}

      <div className="relative z-10 transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Flag url={playerFlag} name={playerNation} />
            <h3 className="font-heading font-bold text-base sm:text-lg text-white truncate uppercase tracking-wider">
              {player.name}
            </h3>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 transition-all duration-300 group-hover:brightness-125 group-hover:-translate-y-px ${statusBadge}`}
          >
            {displayStatus}
          </span>
        </div>

        <div className={`h-px bg-gradient-to-r ${accentLine} opacity-60 mb-3`} />

        <div className="flex items-start gap-3 my-2">
          <Avatar url={playerImage} name={player.name} className="w-24 h-24" />

          <div className="flex flex-col justify-center min-w-0 flex-1">
            {isLegend && legendClubs.length > 0 ? (
              <p className="text-[11px] font-semibold leading-tight break-words text-amber-300">
                Legend • {legendClubs.join(', ')}
              </p>
            ) : isIcon && iconClubs.length > 0 ? (
              <p className="text-[11px] font-semibold leading-tight break-words text-slate-200">
                Icon • {iconClubs.join(', ')}
              </p>
            ) : (
              <p className={`text-[11px] font-semibold leading-tight break-words ${statusText}`}>
                {displayStatus}
              </p>
            )}

            <p className="text-xs text-slate-400 truncate mt-1">
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

      <div className="relative z-10 grid grid-cols-4 sm:grid-cols-7 gap-1 mt-3 pt-3 border-t border-slate-800/80 text-center font-mono">
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{player.apps ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Apps</div>
        </div>
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{playerGoals}</div>
          <div className="text-[9px] text-slate-500 uppercase">Gls</div>
        </div>
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{playerAssists}</div>
          <div className="text-[9px] text-slate-500 uppercase">Ast</div>
        </div>
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{goalContributions}</div>
          <div className="text-[9px] text-slate-500 uppercase">G+A</div>
        </div>
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{goalsPerGame.toFixed(2)}</div>
          <div className="text-[9px] text-slate-500 uppercase">G/GM</div>
        </div>
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{player.trophies ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Trph</div>
        </div>
        <div>
          <div className={`text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px ${statAccent}`}>{player.awards ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Awd</div>
        </div>
      </div>

      {/* Soft bottom edge highlight revealed by hover */}
      <div
        className={`pointer-events-none absolute inset-x-8 bottom-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-70 bg-gradient-to-r ${
          genderAccent === 'blue'
            ? 'from-blue-500/0 via-blue-400/70 to-blue-500/0'
            : genderAccent === 'pink'
              ? 'from-pink-500/0 via-pink-400/70 to-pink-500/0'
              : 'from-slate-500/0 via-slate-400/50 to-slate-500/0'
        }`}
      />
    </Link>
  )
}
