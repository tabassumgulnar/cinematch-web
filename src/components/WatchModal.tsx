import React from 'react';
import { Movie } from '../types';
import { getTmdbPosterUrl, DEFAULT_POSTER } from '../services/tmdb';
import { Play, ExternalLink, X, Film } from 'lucide-react';

interface WatchModalProps {
  movie: Movie | null;
  onClose: () => void;
  onDirectWatchFree?: (movie: Movie) => void;
}

export const WatchModal: React.FC<WatchModalProps> = ({
  movie,
  onClose,
  onDirectWatchFree,
}) => {
  if (!movie) return null;

  const handleWatchFree = () => {
    if (onDirectWatchFree) {
      onDirectWatchFree(movie);
    } else {
      window.open(
        `https://7reels.cc/search?q=${encodeURIComponent(movie.title)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-gray-950/90 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/15 p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden border border-white/15 bg-black shrink-0 shadow-md">
              <img
                src={getTmdbPosterUrl(movie.poster_path, movie.posterUrl)}
                alt={movie.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                }}
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">{movie.title}</h3>
              <p className="text-xs text-slate-400">
                {movie.year} • {movie.genres?.[0] || 'Feature Film'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Primary Featured 7Reels Watch Free Button */}
          <button
            id="watch-modal-7reels-direct"
            type="button"
            onClick={handleWatchFree}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white shadow-xl shadow-rose-900/40 transition-all group no-underline text-left cursor-pointer w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-sm">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Watch Free on 7Reels</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 text-white font-extrabold uppercase">
                    Instant
                  </span>
                </span>
                <span className="text-xs text-rose-100">
                  Direct search & stream on 7reels.cc
                </span>
              </div>
            </div>

            <ExternalLink className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
          </button>

          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider pt-2">
            Available Platforms & Aggregators
          </span>

          {movie.watchLinks
            .filter((link) => !link.url.includes('7reels.cc'))
            .map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-rose-400 group-hover:text-white group-hover:bg-[#E50914] transition-colors border border-white/10">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      {link.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {link.platform === 'free'
                        ? 'Ad-Supported Free Stream'
                        : link.platform === 'search'
                        ? 'Search Availability'
                        : 'Subscription / Rent'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {link.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {link.badge}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            ))}
        </div>
      </div>
    </div>
  );
};
