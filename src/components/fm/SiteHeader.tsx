import { Link } from '@tanstack/react-router'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#07101d]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-sky-400/40 bg-sky-400/10 font-display text-lg font-black text-sky-300 transition-colors group-hover:border-sky-300/70 group-hover:text-sky-200">
            FM
          </span>
          <span className="truncate font-display text-lg font-bold uppercase tracking-[0.15em] text-white sm:text-xl">
            Squad Archive
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 overflow-x-auto text-[10px] sm:text-xs">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'bg-white/[0.06] text-white' }}
            className="whitespace-nowrap px-3 py-2 font-display uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-100"
          >
            Directory
          </Link>
          <Link
            to="/leaderboards"
            activeProps={{ className: 'bg-sky-400/10 text-sky-300' }}
            className="whitespace-nowrap px-3 py-2 font-display uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-100"
          >
            Records
          </Link>
          <Link
            to="/compare"
            activeProps={{ className: 'bg-white/[0.06] text-white' }}
            className="whitespace-nowrap px-3 py-2 font-display uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-100"
          >
            Compare
          </Link>
        </nav>
      </div>
    </header>
  )
}
