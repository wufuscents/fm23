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
      className="w-5 h-5 rounded-full object-cover flex-shrink-0 shadow-sm"
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
  const statusLower = String(player.status || '').trim().toLowerCase()
  const genderLower = String(player.gender || '').trim().toLowerCase()

  const legendClubs = player.legend_at_clubs || []
  const iconClubs = player.icon_at_clubs || []

  // Treat the club lists as the source of truth as well as the status field.
  // This prevents cards with status="NONE" but a populated legend/icon list
  // from showing the wrong status badge.
  const isLegend = statusLower.includes('legend') || legendClubs.length > 0
  const isIcon = !isLegend && (statusLower.includes('icon') || iconClubs.length > 0)
  const displayStatus = isLegend ? 'LEGEND' : isIcon ? 'ICON' : (player.status || 'PLAYER')

  const isFemale = genderLower === 'female' || genderLower === 'f'
  const isMale = genderLower === 'male' || genderLower === 'm'

  // Gender controls the card's overall atmosphere:
  //   male   = blue
  //   female = pink
  // Status controls the metallic accent:
  //   legend = gold
  //   icon   = silver
  // This keeps both pieces of information visible at the same time.
  let cardBorder = 'border-slate-700/80 bg-slate-900/80'
  let cardShadow = ''
  let cardBackground = ''
  let statusBadge = 'bg-slate-800/90 text-slate-300 border-slate-600/80'
  let roleText = 'text-slate-300'

  if (isMale) {
    cardBackground = 'bg-gradient-to-br from-blue-950/70 via-slate-900/90 to-slate-950'
    cardBorder = 'border-blue-500/50'
    cardShadow = 'shadow-[0_0_24px_rgba(59,130,246,0.14)]'
    roleText = 'text-blue-300'
  } else if (isFemale) {
    cardBackground = 'bg-gradient-to-br from-pink-950/70 via-slate-900/90 to-slate-950'
    cardBorder = 'border-pink-500/50'
    cardShadow = 'shadow-[0_0_24px_rgba(236,72,153,0.14)]'
    roleText = 'text-pink-300'
  }

  if (isLegend) {
    cardBorder = isMale
      ? 'border-amber-400/90'
      : isFemale
        ? 'border-amber-400/90'
        : 'border-amber-400/70'
    cardShadow = isFemale
      ? 'shadow-[0_0_26px_rgba(236,72,153,0.14),0_0_18px_rgba(251,191,36,0.16)]'
      : isMale
        ? 'shadow-[0_0_26px_rgba(59,130,246,0.14),0_0_18px_rgba(251,191,36,0.16)]'
        : 'shadow-[0_0_20px_rgba(251,191,36,0.16)]'
    statusBadge = 'bg-amber-400/20 text-amber-300 border-amber-400/70'
    roleText = 'text-amber-300'
  } else if (isIcon) {
    cardBorder = 'border-slate-300/80'
    cardShadow = isFemale
      ? 'shadow-[0_0_26px_rgba(236,72,153,0.14),0_0_16px_rgba(226,232,240,0.16)]'
      : isMale
        ? 'shadow-[0_0_26px_rgba(59,130,246,0.14),0_0_16px_rgba(226,232,240,0.16)]'
        : 'shadow-[0_0_18px_rgba(226,232,240,0.16)]'
    statusBadge = 'bg-slate-200/15 text-slate-100 border-slate-300/70'
    roleText = 'text-slate-200'
  }

  const playerImage = player.image_url || player.photo_url || ''
  const playerNation = player.nationality || player.nation || 'Global'
  const playerFlag = player.nationality_flag_url || player.nation_flag || null
  const playerPos = player.role || player.positions_short || player.position || '-'

  const playerGoals = player.goals ?? 0
  const playerAssists = (player as any).assists ?? 0
  const goalContributions = playerGoals + playerAssists
  const goalsPerGame = player.apps && player.apps > 0 ? playerGoals / player.apps : 0

  return (
    <Link
      to="/player/$id"
      params={{ id: String(player.id) }}
      className={`relative flex flex-col justify-between p-4 rounded-xl border backdrop-blur-md transition-all duration-200 hover:scale-[1.02] block ${cardBackground} ${cardBorder} ${cardShadow}`}
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
            {displayStatus}
          </span>
        </div>

        <div className="flex items-start gap-3 my-2">
          <Avatar url={playerImage} name={player.name} className="w-24 h-24" />

          <div className="flex flex-col justify-center min-w-0 flex-1">
            {legendClubs.length > 0 ? (
              <p className="text-[11px] font-semibold leading-tight break-words text-amber-300">
                Legend • {legendClubs.join(', ')}
              </p>
            ) : iconClubs.length > 0 ? (
              <p className="text-[11px] font-semibold leading-tight break-words text-slate-200">
                Icon • {iconClubs.join(', ')}
              </p>
            ) : (
              <p className={`text-[11px] font-semibold leading-tight break-words ${roleText}`}>
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

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 mt-3 pt-3 border-t border-slate-800/80 text-center font-mono">
        <div>
          <div className="text-sm font-bold text-white">{player.apps ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase">Apps</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{playerGoals}</div>
          <div className="text-[9px] text-slate-500 uppercase">Gls</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{playerAssists}</div>
          <div className="text-[9px] text-slate-500 uppercase">Ast</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{goalContributions}</div>
          <div className="text-[9px] text-slate-500 uppercase">G+A</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{goalsPerGame.toFixed(2)}</div>
          <div className="text-[9px] text-slate-500 uppercase">G/GM</div>
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
