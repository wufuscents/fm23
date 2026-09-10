import React, { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import PlayerCard from '../components/fm/PlayerCard';
import { getGoalContributions } from '../lib/fm';
import { supabase } from '../lib/supabase'; // Adjust import if your supabase client path differs

export interface DirectoryPlayer {
  id: string;
  name: string;
  nationality?: string | null;
  nationality_flag_url?: string | null;
  image_url?: string | null;
  role?: string | null;
  apps?: number | null;
  goals?: number | null;
  assists?: number | null;
  trophies?: number | null;
  awards?: number | null;
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const { data, error } = await supabase.from('players').select('*');
    if (error) throw error;
    return { players: (data || []) as DirectoryPlayer[] };
  },
  component: IndexPage,
});

function IndexPage() {
  const { players } = Route.useLoaderData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('g_plus_a_per_game');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedPlayers = useMemo(() => {
    let list = (players || []).filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    return list.sort((a, b) => {
      const getValue = (player: DirectoryPlayer, key: string): number | null => {
        const apps = player.apps ?? 0;
        const goals = player.goals ?? 0;
        const assists = player.assists ?? null;
        const gPlusA = getGoalContributions(player);

        switch (key) {
          case 'name':
            return null;
          case 'goals':
            return goals;
          case 'assists':
            return assists;
          case 'g_plus_a':
            return gPlusA;
          case 'gpg':
            return apps > 0 ? goals / apps : null;
          case 'apg':
            return assists !== null && apps > 0 ? assists / apps : null;
          case 'g_plus_a_per_game':
            return gPlusA !== null && apps > 0 ? gPlusA / apps : null;
          case 'apps':
            return apps;
          case 'trophies':
            return player.trophies ?? 0;
          case 'awards':
            return player.awards ?? 0;
          default:
            return null;
        }
      };

      if (sortKey === 'name') {
        const comp = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? comp : -comp;
      }

      const valA = getValue(a, sortKey);
      const valB = getValue(b, sortKey);

      // Place null/legacy values at the bottom
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });
  }, [players, search, sortKey, sortDirection]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Sort By:
          </label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 w-full md:w-auto"
          >
            <option value="goals">Goals</option>
            <option value="assists">Assists (AST)</option>
            <option value="g_plus_a">Goal Contributions (G+A)</option>
            <option value="gpg">Goals / Game (GPG)</option>
            <option value="apg">Assists / Game (APG)</option>
            <option value="g_plus_a_per_game">G+A / Game</option>
            <option value="apps">Apps</option>
            <option value="trophies">Trophies</option>
            <option value="awards">Awards</option>
            <option value="name">Name</option>
          </select>

          <button
            onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono hover:bg-slate-800"
          >
            {sortDirection.toUpperCase()}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAndSortedPlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            onClick={() => navigate({ to: '/player/$id', params: { id: player.id } })}
          />
        ))}
      </div>
    </div>
  );
}
