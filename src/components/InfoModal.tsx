import React from 'react';
import { Movie } from '../types';
import { getTmdbPosterUrl, getTmdbBackdropUrl, DEFAULT_POSTER } from '../services/tmdb';
import { Star, Play, X, Film, ExternalLink } from 'lucide-react';

interface InfoModalProps {
  movie: Movie | null;
  onClose: () => void;
  onOpenWatch: (movie: Movie) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ movie, onClose, onOpenWatch }) => {
  if (!movie) return null;

  const trailerQuery = encodeURIComponent(`${movie.title} ${movie.year} official trailer`);
  const posterSrc = getTmdbPosterUrl(movie.poster_path, movie.posterUrl);
  const backdropSrc = getTmdbBackdropUrl(movie.backdrop_path, movie.backdropUrl || posterSrc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Backdrop Banner with integrated official poster thumbnail */}
        <div className="relative w-full h-52 bg-black overflow-hidden">
          <img
            src={backdropSrc}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = posterSrc;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Bottom Title Area with Poster Badge */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
            <div className="w-14 aspect-[2/3] rounded-lg overflow-hidden border border-white/20 shadow-lg bg-black flex-shrink-0">
              <img
                src={posterSrc}
                alt={movie.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black text-white font-display drop-shadow truncate">
                {movie.title}
              </h2>
              <p className="text-xs text-slate-300">
                {movie.year} • Directed by <span className="text-white font-semibold">{movie.director}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {/* Metadata badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white/5 text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-amber-400" />
              {movie.imdbRating} IMDb
            </span>
            {movie.tomatoRating > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-rose-300 text-xs font-bold border border-rose-500/30">
                🍅 {movie.tomatoRating}%
              </span>
            )}
            {movie.certificate && (
              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 text-xs font-semibold border border-white/10">
                {movie.certificate}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/10">
              {movie.runtime}
            </span>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Genres & Themes
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-200 text-xs border border-white/10"
                >
                  {g}
                </span>
              ))}
              {movie.tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs border border-white/5"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
              Synopsis
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {movie.synopsis}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <a
              href={`https://7reels.cc/search?q=${encodeURIComponent(movie.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer no-underline"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Free on 7Reels 🍿</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <div className="flex gap-2">
              <a
                href={`https://www.youtube.com/results?search_query=${trailerQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-white/10"
              >
                <span>Trailer (YouTube)</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <button
                onClick={() => {
                  onClose();
                  onOpenWatch(movie);
                }}
                type="button"
                className="flex-1 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-white/10 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-slate-400" />
                <span>All Providers</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
