import React, { useEffect, useState } from 'react';
import { getDominantColor, getStatusBorderClass, getGenderBorderClass } from '@/lib/color-extract';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    display_name?: string;
    status?: 'Legend' | 'Icon' | string;
    gender?: 'Male' | 'Female' | string;
    photo_url?: string;
    club_logo_url?: string;
    nation_flag_url?: string;
    position?: string;
    rating?: number;
  };
}

export function PlayerCard({ player }: PlayerCardProps) {
  const [clubColor, setClubColor] = useState('#1e293b');
  const [nationColor, setNationColor] = useState('#0f172a');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDominantColor(player.club_logo_url, '#1e293b'),
      getDominantColor(player.nation_flag_url, '#0f172a'),
    ]).then(([clubHex, nationHex]) => {
      if (isMounted) {
        setClubColor(clubHex);
        setNationColor(nationHex);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [player.club_logo_url, player.nation_flag_url]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-slate-900/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
        getStatusBorderClass(player.status),
        getGenderBorderClass(player.gender)
      )}
    >
      {/* Ambient Gradient Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 transition-opacity duration-500 group-hover:opacity-40"
        style={{
          background: `radial-gradient(circle at 10% 20%, ${clubColor} 0%, transparent 60%), radial-gradient(circle at 90% 80%, ${nationColor} 0%, transparent 60%)`,
        }}
      />

      {/* Card Content Header */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {player.nation_flag_url && (
            <img src={player.nation_flag_url} alt="Nation" className="h-4 w-6 rounded-sm object-cover shadow-sm" />
          )}
          {player.club_logo_url && (
            <img src={player.club_logo_url} alt="Club" className="h-6 w-6 object-contain filter drop-shadow" />
          )}
        </div>
        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-xs font-mono font-bold text-amber-400 border border-slate-700">
          {player.position || 'ST'}
        </span>
      </div>

      {/* Portrait & Player Details */}
      <div className="relative z-10 mt-3 flex items-center gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-slate-700/60">
          <img
            src={player.photo_url || '/placeholder-player.png'}
            alt={player.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col min-w-0">
          <h3 className="truncate text-base font-bold text-slate-100">
            {player.display_name || player.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              player.status?.toLowerCase() === 'legend' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            )}>
              {player.status || 'Squad'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
