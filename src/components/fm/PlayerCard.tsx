import React from 'react';
import { formatIntegerMetric, getGoalContributions, getPerGameMetric } from '../../lib/fm';

export interface FlagProps {
  url?: string | null;
  nationality?: string | null;
  className?: string;
}

export const Flag: React.FC<FlagProps> = ({ url, nationality, className = 'h-3.5 w-5 object-cover rounded-sm' }) => {
  if (!url) return null;
  return <img src={url} alt={nationality || 'Flag'} className={className} />;
};

export interface PlayerCardProps {
  player: {
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
  };
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick }) => {
  const gPlusA = getGoalContributions(player);
  const gpg = getPerGameMetric(player.goals, player.apps);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 p-4 transition-all duration-200 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-slate-700/50">
          {player.image_url ? (
            <img
              src={player.image_url}
              alt={player.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500 font-bold text-xl">
              {player.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {player.name}
            </h3>
            <Flag url={player.nationality_flag_url} nationality={player.nationality} />
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">{player.role || 'Unknown Role'}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-slate-800/80 text-center font-mono">
        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
          <div className="text-sm font-bold text-white">{player.goals ?? 0}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans mt-0.5">GLS</div>
        </div>
        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
          <div className="text-sm font-bold text-white">{formatIntegerMetric(player.assists)}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans mt-0.5">AST</div>
        </div>
        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
          <div className="text-sm font-bold text-white">{formatIntegerMetric(gPlusA)}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans mt-0.5">G+A</div>
        </div>
        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
          <div className="text-sm font-bold text-white">{gpg}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-sans mt-0.5">GPG</div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
