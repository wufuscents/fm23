import { Link, useRouter } from '@tanstack/react-router'
import { useRef, type MouseEvent } from 'react'
import { clearArchiveSession } from '../../lib/archive-auth'

type ArchiveSection = 'directory' | 'hall' | 'records' | 'compare'

const sectionConfig: Record<ArchiveSection, {
  label: string
  subtitle: string
  dot: string
  active: string
  underline: string
  tint: string
}> = {
  directory: {
    label: 'DIRECTORY',
    subtitle: 'Scouting index • player database',
    dot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]',
    active: 'text-red-400',
    underline: 'bg-red-400',
    tint: 'bg-red-400/10',
  },
  hall: {
    label: 'HALL OF FAME',
    subtitle: 'Football museum • legacy collection',
    dot: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.45)]',
    active: 'text-yellow-300',
    underline: 'bg-yellow-300',
    tint: 'bg-yellow-400/10',
  },
  records: {
    label: 'RECORDS',
    subtitle: 'All-time statistics • record room',
    dot: 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.45)]',
    active: 'text-blue-400',
    underline: 'bg-blue-400',
    tint: 'bg-blue-400/10',
  },
  compare: {
    label: 'COMPARE',
    subtitle: 'Head-to-head • player analysis',
    dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]',
    active: 'text-emerald-400',
    underline: 'bg-emerald-400',
    tint: 'bg-emerald-400/10',
  },
}

const links: Array<{ key: ArchiveSection; label: string; to: '/' | '/hall-of-fame' | '/leaderboards' | '/compare' }> = [
  { key: 'directory', label: 'DIRECTORY', to: '/' },
  { key: 'hall', label: 'HALL OF FAME', to: '/hall-of-fame' },
  { key: 'records', label: 'RECORDS', to: '/leaderboards' },
  { key: 'compare', label: 'COMPARE', to: '/compare' },
]

const HIDDEN_LOGOUT_CLICK_WINDOW_MS = 2000
const HIDDEN_LOGOUT_REQUIRED_CLICKS = 5

// Module-level so the click sequence survives route changes caused by the header link.
let hiddenLogoutClicks = 0
let hiddenLogoutLastClickAt = 0

type DirectoryGender = 'male' | 'female' | 'both'

const directoryGenderConfig: Record<DirectoryGender, Pick<typeof sectionConfig.directory, 'dot' | 'active' | 'underline' | 'tint'>> = {
  male: {
    dot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]',
    active: 'text-red-400',
    underline: 'bg-red-400',
    tint: 'bg-red-400/10',
  },
  female: {
    dot: 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.45)]',
    active: 'text-pink-400',
    underline: 'bg-pink-400',
    tint: 'bg-pink-400/10',
  },
  both: {
    dot: 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.45)]',
    active: 'text-violet-400',
    underline: 'bg-violet-400',
    tint: 'bg-violet-400/10',
  },
}

export function ArchiveHeader({
  active,
  directoryGender = 'male',
}: {
  active: ArchiveSection
  directoryGender?: DirectoryGender
}) {
  const router = useRouter()
  const logoutResetTimer = useRef<number | null>(null)

  const handleHiddenLogoutClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now()

    if (now - hiddenLogoutLastClickAt > HIDDEN_LOGOUT_CLICK_WINDOW_MS) {
      hiddenLogoutClicks = 0
    }

    hiddenLogoutLastClickAt = now
    hiddenLogoutClicks += 1

    if (logoutResetTimer.current !== null) {
      window.clearTimeout(logoutResetTimer.current)
    }

    logoutResetTimer.current = window.setTimeout(() => {
      hiddenLogoutClicks = 0
      hiddenLogoutLastClickAt = 0
    }, HIDDEN_LOGOUT_CLICK_WINDOW_MS)

    if (hiddenLogoutClicks >= HIDDEN_LOGOUT_REQUIRED_CLICKS) {
      event.preventDefault()
      hiddenLogoutClicks = 0
      hiddenLogoutLastClickAt = 0
      clearArchiveSession()
      router.navigate({ to: '/login', replace: true })
    }
  }

  const baseConfig = sectionConfig[active]
  const config = active === 'directory'
    ? { ...baseConfig, ...directoryGenderConfig[directoryGender] }
    : baseConfig

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800/90 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <Link
        to="/"
        className="min-w-0 group"
        onClick={handleHiddenLogoutClick}
        aria-label="FM Squad Archive"
      >
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 shrink-0 rounded-full animate-pulse ${config.dot}`} />
          <span className="font-heading text-xl font-extrabold tracking-[0.12em] text-white transition-colors group-hover:text-slate-100">
            FM SQUAD ARCHIVE
          </span>
        </div>
        <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.26em] text-slate-500">
          {config.subtitle}
        </p>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        {links.map((item) => {
          const itemConfig = item.key === 'directory' && active === 'directory'
            ? config
            : sectionConfig[item.key]
          const isActive = item.key === active

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`group relative whitespace-nowrap border-b-2 border-transparent pb-2 transition-colors hover:text-white ${
                isActive ? `${itemConfig.active} font-bold` : ''
              }`}
            >
              <span className="relative inline-block">
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 -bottom-[9px] h-0.5 ${itemConfig.underline}`}
                  />
                )}
              </span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
