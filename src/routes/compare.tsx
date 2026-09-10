import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { formatIntegerMetric, getGoalContributions, getPerGameMetric } from '../lib/fm';
import { supabase } from '../lib/supabase'; // Adjust path if needed

export interface ComparePlayer {
  id: string;
  name: string;
  image_url?: string | null;
  apps?: number | null;
  goals?: number | null;
  assists?: number | null;
  trophies?: number | null;
  awards?: number | null;
}

interface ComparisonRowProps {
  label: string;
  val1: number | null | undefined;
  val2: number | null | undefined;
  isPerGame?: boolean;
  apps1?: number | null;
  apps2?: number | null;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  val1,
  val2,
  isPerGame = false,
  apps1,
  apps2,
}) => {
  const num1 = isPerGame ? (val1 != null && apps1 ? val1 / apps1 : null) : val1 ?? null;
  const num2 = isPerGame ? (val2 != null && apps2 ? val2 / apps2 : null) : val2 ?? null;

  const display1 = isPerGame ? getPerGameMetric(val1, apps1) : formatIntegerMetric(val1);
  const display2 = isPerGame ? getPerGameMetric(val2, apps2) : formatIntegerMetric(val2);

  const p1Wins = num1 !== null && num2 !== null && num1 > num2;
  const p2Wins = num1 !== null && num2 !== null && num2 > num1;

  return (
    <div className="grid grid-cols-3 py-3 border-b border-slate-800/60 text-center text-sm items-center hover:bg-slate-800/20">
      <div className={`font-mono text-base ${p1Wins ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
        {display1}
      </div>
      <div className="text-slate-400 font-medium uppercase text-xs tracking-wider">{label}</div>
      <div className={`font-mono text-base ${p2Wins ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
        {display2}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/compare')({
  loader: async () => {
    const { data, error } = await supabase.from('players').select('*');
    if (error) throw error;
    return { players: (data || []) as ComparePlayer[] };
  },
  component: ComparePage,
});

function ComparePage() {
  const { players } = Route.useLoaderData();
  const [selectedP1, setSelectedP1] = useState<string>(players[0]?.id || '');
  const [selectedP2, setSelectedP2] = useState<string>(players[1]?.id || '');

  const p1 = players.find((p) => p.id === selectedP1);
  const p2 = players.find((p) => p.id === selectedP2);

  const p1GPlusA = p1 ? getGoalContributions(p1) : null;
  const p2GPlusA = p2 ? getGoalContributions(p2) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white text-center">Player Comparison</h1>

      <div className="grid grid-cols-2 gap-4">
        <select
          value={selectedP1}
          onChange={(e) => setSelectedP1(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedP2}
          onChange={(e) => setSelectedP2(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {p1 && p2 ? (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 md:p-6">
          <div className="grid grid-cols-3 pb-4 mb-2 border-b border-slate-800 text-center items-center">
            <div className="font-bold text-white">{p1.name}</div>
            <div className="text-xs text-slate-500 font-semibold uppercase">VS</div>
            <div className="font-bold text-white">{p2.name}</div>
          </div>

          <ComparisonRow label="Apps" val1={p1.apps} val2={p2.apps} />
          <ComparisonRow label="Goals" val1={p1.goals} val2={p2.goals} />
          <ComparisonRow label="Assists" val1={p1.assists} val2={p2.assists} />
          <ComparisonRow label="G+A" val1={p1GPlusA} val2={p2GPlusA} />
          <ComparisonRow
            label="GPG"
            val1={p1.goals}
            val2={p2.goals}
            isPerGame
            apps1={p1.apps}
            apps2={p2.apps}
          />
          <ComparisonRow
            label="G+A / Game"
            val1={p1GPlusA}
            val2={p2GPlusA}
            isPerGame
            apps1={p1.apps}
            apps2={p2.apps}
          />
        </div>
      ) : (
        <div className="text-center text-slate-500 py-12">
          Select two players above to view their comparison stats.
        </div>
      )}
    </div>
  );
}
