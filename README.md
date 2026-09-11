# FM Squad Archive

FM Squad Archive is a Football Manager-inspired football intelligence archive built with TanStack Start, React, Tailwind CSS, Supabase, and Cloudflare R2.

## Current architecture

- **Supabase PostgreSQL** — player, career, honours, club, and nation data.
- **Cloudflare R2** — player portraits, flags, and club logos.
- **Vercel** — application deployment.
- **TanStack Start + React + Tailwind CSS** — application framework and UI.

## Development

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
```

## Main routes

- `/` — Squad Directory
- `/hall-of-fame` — Hall of Fame
- `/leaderboards` — Records
- `/compare` — Player Comparison
- `/player/[id]` — Player Dossier
- `/club/[club]` — Club Dossier
- `/nation/[nation]` — Nation Dossier
