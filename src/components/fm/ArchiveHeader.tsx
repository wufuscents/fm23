import { Link } from '@tanstack/react-router'

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

export function ArchiveHeader({ active }: { active: ArchiveSection }) {
  const config = sectionConfig[active]

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800/90 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <Link to="/" className="min-w-0 group">
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
          const itemConfig = sectionConfig[item.key]
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
