# FMDB Legends

"Build a dark-mode Football Manager 2023 (FM23) themed web application using Next.js, Tailwind CSS, and Supabase (@supabase/supabase-js).

CRITICAL DATA RULE:
Do NOT create any dummy, mock, or hardcoded player data in the code. Fetch ALL data dynamically from my existing Supabase PostgreSQL database tables: players, player_career_history, coach_career_history, and awards_and_trophies.

Page 1: Squad Directory & Multi-Filter Hub (/)

Fetch all records from players.

Search Bar: Real-time search by player name or club name.

Filters: Dropdown filters for Status (Legends, Icons, Retired, Head Coaches), Club, and Nationality.

Sorting Options: Sort players by Most Trophies Won, Most Individual Awards Won, Most Caps, or Most Career Goals.

Player Cards Grid: Display player photo (image_url), name, nationality flag (nationality_flag_url), primary role, total goals/apps, club legend badges (legend_at_clubs), and trophy counts. Clicking a card links to /player/[id].

Page 2: Hall of Fame & Leaderboards (/leaderboards)

Leaderboards ranking players top-to-bottom (#1, #2, #3...) using live Supabase queries:

Top Goalscorers (ranked by goals)

Most Appearances (ranked by apps)

Most Decorated - Trophies (ranked by player_trophy count)

Most Individual Awards (ranked by player_award count)

Each row shows rank number, player avatar, name, nationality flag, and count.

Page 3: Dynamic Player Detail View (/player/[id])

Fetch single player data by id joining players, player_career_history, coach_career_history, and awards_and_trophies.

Header: Player photo (image_url), name, role, nationality flag (nationality_flag_url), caps/goals, and legend/icon badges (legend_at_clubs, icon_at_clubs).

Milestones Grid: Display Personal (1st, 2nd, 3rd) and Team milestone medal counts.

Career History: Render tables for Player Career (club_logo_url, team name, country, apps, goals) and Coaching Career (if is_head_coach is true).

Trophies & Awards Tabs: Tabbed layout separating Team Trophies (player_trophy) and Individual Awards (player_award) showing win counts and details.

Biography: Full biography text block."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fm23.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/524840ae-a39e-40a9-8416-28a1ac6b105d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
