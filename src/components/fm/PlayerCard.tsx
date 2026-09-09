import React from 'react';
import { useExtractColors, getStatusBorderColor, getGenderBorderColor } from '@/lib/color-extract';
import { getAttributeColorClass } from '@/lib/fm-attributes';
import { cn } from '@/lib/utils';

export interface PlayerProps {
  id: string;
  name: string;
  position?: string;
  rating?: number;
  clubLogoUrl?: string;
  flagUrl?: string;
  photoUrl?: string;
  status?: 'Legend' | 'Icon' | 'Active' | 'Retired';
  gender?: 'Male' | 'Female';
  attributes?: Record<string, number>;
}

export function Avatar({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <img
      src={src || '/placeholder-avatar.png'}
      alt={alt}
      className={cn('h-10 w-10 rounded-full object-cover border border-slate-700/50 bg-slate-900', className)}
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/placeholder-avatar.png';
      }}
    />
  );
}

export function Flag({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return (
    <img
      src={src || '/placeholder-flag.png'}
      alt={alt}
      className={cn('h-4 w-6 rounded-sm object-cover border border-slate-700/30', className)}
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/placeholder-flag.png';
      }}
    />
  );
}

export function PlayerCard({ player }: { player: PlayerProps }) {
  const { clubColor, flagColor } = useExtractColors(player.clubLogoUrl, player.flagUrl);
  const statusBorderClass = getStatusBorderColor(player.status);
  const genderBorderClass = getGenderBorderColor(player.gender);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-slate-950 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        statusBorderClass || genderBorderClass || 'border-slate-800'
      )}
      style={{
        background: `radial-gradient(circle at 50% 0%, ${clubColor}22 0%, ${flagColor}11 50%, #020617 100%)`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={player.photoUrl} alt={player.name} className="h-12 w-12" />
          <div>
            <h3 className="font-bold text-slate-100">{player.name}</h3>
            <p className="text-xs font-medium text-slate-400">{player.position || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {player.flagUrl && <Flag src={player.flagUrl} alt="Country Flag" />}
          {player.clubLogoUrl && (
            <img src={player.clubLogoUrl} alt="Club Logo" className="h-6 w-6 object-contain" />
          )}
        </div>
      </div>

      {player.attributes && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-3">
          {Object.entries(player.attributes).slice(0, 6).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between rounded bg-slate-900/60 px-2 py-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{key}</span>
              <span className={cn('rounded px-1.5 py-0.5 text-xs font-mono font-bold border', getAttributeColorClass(val))}>
                {val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayerCard;
