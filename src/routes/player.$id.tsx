import React from 'react';
import { formatIntegerMetric, getGoalContributions, getPerGameMetric } from '../../lib/fm';

export interface PlayerProfileProps {
  player: {
    id: string;
    name: string;
    nationality?: string | null;
    nationality_flag_url?: string | null;
    image_url?: string | null;
    role?: string | null;
    biography?: string | null;
    apps?: number | null;
    goals?: number | null;
    assists?: number | null;
    trophies?: number | null;
    awards?: number | null;
    international_apps?: number | null;
    international_goals?: number | null;
  };
}

export const PlayerProfileRoute: React.FC<PlayerProfileProps> = ({ player }) => {
  const gPlusA = getGoalContributions(player);
  const gpg = getPerGameMetric(player.goals, player.apps);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-32 w-32 rounded-2xl bg-slate-800 overflow-hidden border-2 border-slate-700 shrink-0">
            {player.image_url ? (
              <img
                src={player.image_url}
                alt={player.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-600">
                {player.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl font-extrabold text-white">{player.name}</h1>
              {player.nationality_flag_url && (
                <img
                  src={player.nationality_flag_url}
                  alt={player.nationality || 'Country'}
                  className="h-5 w-8 object-cover rounded shadow-sm"
                />
              )}
            </div>
            <p className="text-slate-400 font-medium">{player.role || 'Unspecified Role'}</p>
          </div>
        </div>

        {/* Profile Hero Summary Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-white font-mono">{player.goals ?? 0}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">GLS</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-white font-mono">
              {formatIntegerMetric(player.assists)}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">AST</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-white font-mono">
              {formatIntegerMetric(gPlusA)}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">G+A</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-white font-mono">{gpg}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">GPG</div>
          </div>
        </div>
      </div>

      {/* Secondary Information */}
      {player.biography && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-bold text-white mb-2">Biography</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{player.biography}</p>
        </div>
      )}
    </div>
  );
};

export default PlayerProfileRoute;
