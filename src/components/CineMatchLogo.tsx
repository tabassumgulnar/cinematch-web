import React from 'react';

interface CineMatchLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const CineMatchLogo: React.FC<CineMatchLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Cinematic Film Reel + Play & Heart Glow */}
      <div
        className={`${iconDimensions} relative rounded-xl bg-gradient-to-tr from-[#990000] via-[#E50914] to-[#ff2a3a] p-[1.5px] shadow-lg shadow-rose-950/60 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}
      >
        <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-gray-950/90 via-black to-gray-950 flex items-center justify-center overflow-hidden relative">
          {/* Subtle neon internal glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/30 to-amber-500/10 pointer-events-none" />

          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5/6 h-5/6 text-white drop-shadow-[0_2px_8px_rgba(229,9,20,0.8)]"
          >
            <defs>
              <linearGradient id="cineGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF334B" />
                <stop offset="0.5" stopColor="#E50914" />
                <stop offset="1" stopColor="#990000" />
              </linearGradient>
              <linearGradient id="goldGrad" x1="12" y1="10" x2="26" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF" />
                <stop offset="1" stopColor="#FED7AA" />
              </linearGradient>
            </defs>

            {/* Film Ticket / Clapperboard Silhouette */}
            <rect
              x="5"
              y="6"
              width="26"
              height="24"
              rx="5"
              fill="url(#cineGrad)"
              className="drop-shadow-sm"
            />

            {/* Sprocket Holes at top and bottom */}
            <rect x="8" y="8" width="3" height="3" rx="1" fill="#0A0A0A" />
            <rect x="14" y="8" width="3" height="3" rx="1" fill="#0A0A0A" />
            <rect x="20" y="8" width="3" height="3" rx="1" fill="#0A0A0A" />
            <rect x="26" y="8" width="3" height="3" rx="1" fill="#0A0A0A" />

            <rect x="8" y="25" width="3" height="3" rx="1" fill="#0A0A0A" />
            <rect x="14" y="25" width="3" height="3" rx="1" fill="#0A0A0A" />
            <rect x="20" y="25" width="3" height="3" rx="1" fill="#0A0A0A" />
            <rect x="26" y="25" width="3" height="3" rx="1" fill="#0A0A0A" />

            {/* Center Dynamic Play + Cine Arrow */}
            <path
              d="M15 13.5L24 18L15 22.5V13.5Z"
              fill="url(#goldGrad)"
              className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
            />
          </svg>
        </div>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`${textSizes} font-black tracking-tight font-display text-white flex items-center`}
            >
              <span>Cine</span>
              <span className="text-[#E50914] drop-shadow-[0_0_12px_rgba(229,9,20,0.6)]">Match</span>
            </span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30 tracking-wider">
              Sync
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5 hidden xs:block">
            Movie Night Together
          </span>
        </div>
      )}
    </div>
  );
};
