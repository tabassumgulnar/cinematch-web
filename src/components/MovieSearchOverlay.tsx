import React, { useEffect } from 'react';
import { Movie } from '../types';
import { getTmdbPosterUrl, DEFAULT_POSTER } from '../services/tmdb';
import { Search, X, Play, Plus, Star, ExternalLink, Film } from 'lucide-react';

interface MovieSearchOverlayProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  searchResults: Movie[];
  onSwipeThisMovie: (movie: Movie) => void;
  onDirectStream7Reels: (movie: Movie) => void;
  selectedGenres?: string[];
  selectedLanguages?: string[];
  onApplyCategoryFilter?: (genre?: string, lang?: string) => void;
}

export const MovieSearchOverlay: React.FC<MovieSearchOverlayProps> = ({
  searchQuery,
  onSearchChange,
  onClose,
  searchResults,
  onSwipeThisMovie,
  onDirectStream7Reels,
  selectedGenres = [],
  selectedLanguages = [],
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col pt-16 animate-in fade-in duration-200">
      {/* Search Header Bar */}
      <div className="w-full max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 border-b border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              if (searchResults.length > 0) {
                onDirectStream7Reels(searchResults[0]);
              } else {
                window.open(
                  `https://7reels.cc/search?q=${encodeURIComponent(searchQuery.trim())}`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }
            }
          }}
          className="relative flex-1 group"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-400 transition-colors" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 Search movies, series, or actors..."
            className="w-full h-12 pl-10 pr-24 bg-white/5 border border-white/10 focus:border-rose-500/50 focus:bg-white/10 focus:ring-2 focus:ring-rose-500/20 rounded-2xl text-white text-sm outline-none shadow-inner placeholder:text-slate-400 transition-all duration-200"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                type="button"
                className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {searchQuery.trim() && (
              <button
                type="submit"
                className="h-8 px-3 rounded-xl bg-[#E50914] hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/60 cursor-pointer transition active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Go</span>
              </button>
            )}
          </div>
        </form>

        <button
          onClick={onClose}
          type="button"
          className="h-12 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer active:scale-95"
        >
          <span>Close</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">(Esc)</span>
        </button>
      </div>

      {/* Quick Filter Tag Bar */}
      <div className="w-full max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Filter:</span>

        {selectedGenres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onSearchChange(g)}
            className="px-2.5 py-1 rounded-full bg-rose-600/15 border border-rose-500/30 text-rose-300 text-xs font-medium whitespace-nowrap transition active:scale-95 cursor-pointer"
          >
            🎬 {g}
          </button>
        ))}

        {selectedLanguages.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onSearchChange(l)}
            className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium whitespace-nowrap transition active:scale-95 cursor-pointer"
          >
            🌐 {l}
          </button>
        ))}

        {['Action', 'Comedy', 'Horror', 'Sci-Fi', 'Hindi', 'English'].map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => onSearchChange(quick)}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium whitespace-nowrap transition cursor-pointer"
          >
            {quick}
          </button>
        ))}
      </div>

      {/* Results Container with Clear Posters and Direct Play / Add to Swipe Buttons */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
          <span>
            {searchResults.length} {searchResults.length === 1 ? 'movie' : 'movies'} found
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Direct streaming powered by 7reels.cc & synchronized deck priority
          </span>
        </div>

        {searchResults.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shadow-md">
              <Search className="w-7 h-7 text-rose-500" />
            </div>
            <p className="text-base font-bold text-white">No direct match found for "{searchQuery}"</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Directly stream this title or search across the entire 7reels streaming engine:
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  window.open(
                    `https://7reels.cc/search?q=${encodeURIComponent(searchQuery.trim())}`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/60 cursor-pointer transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Direct Play "{searchQuery}" on 7reels 🚀</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-24">
            {searchResults.map((movie) => (
              <div
                key={movie.id}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 hover:border-white/20 transition-all flex gap-3 shadow-lg group hover:bg-white/[0.08]"
              >
                {/* Clear Poster Thumbnail: Preserves Aspect Ratio [2/3] */}
                <div className="w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-black shrink-0 relative shadow-md">
                  <img
                    src={getTmdbPosterUrl(movie.poster_path, movie.posterUrl)}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                    }}
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-300 flex items-center gap-0.5 shadow-sm">
                    <Star className="w-3 h-3 fill-current text-amber-400" />
                    <span>{movie.imdbRating}</span>
                  </div>
                </div>

                {/* Details & Actions */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate leading-tight group-hover:text-rose-400 transition-colors">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 flex-wrap">
                      <span>{movie.year}</span>
                      <span>·</span>
                      <span className="truncate">{movie.genres.slice(0, 2).join(', ')}</span>
                      <span>·</span>
                      <span>{movie.languages.slice(0, 1).join(', ')}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {movie.synopsis}
                    </p>
                  </div>

                  {/* Instant Action buttons: "Direct Play" & "Add to Swipe" */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onSwipeThisMovie(movie)}
                      className="flex-1 h-8.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-white/10 shadow-sm"
                      title="Add to front of swipe deck"
                    >
                      <Plus className="w-3.5 h-3.5 text-rose-400" />
                      <span>Add to Swipe</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDirectStream7Reels(movie)}
                      className="flex-1 h-8.5 px-2.5 rounded-xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-rose-950/60"
                      title="Direct Play on 7reels.cc"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Direct Play</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
