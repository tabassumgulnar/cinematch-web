import React, { useState, useEffect, useRef } from 'react';
import { Movie } from '../types';
import { searchTmdbMovies, getTmdbPosterUrl, DEFAULT_POSTER } from '../services/tmdb';
import { Search, Loader2, Plus, Play, Star, X, Film, Sparkles } from 'lucide-react';

interface SearchBarAutocompleteProps {
  onAddToSwipeDeck: (movie: Movie) => void;
  onWatchOn7Reels: (movie: Movie) => void;
  onOpenFullSearchOverlay?: () => void;
}

export const SearchBarAutocomplete: React.FC<SearchBarAutocompleteProps> = ({
  onAddToSwipeDeck,
  onWatchOn7Reels,
  onOpenFullSearchOverlay,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl + K / Cmd + K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced TMDB Live Search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const fetched = await searchTmdbMovies(trimmed, 8);
        setResults(fetched);
      } catch (err) {
        console.warn('TMDB auto-complete search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    searchInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (results.length > 0) {
      onWatchOn7Reels(results[0]);
    } else {
      window.open(
        `https://7reels.cc/search?q=${encodeURIComponent(trimmed)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
    setIsOpen(false);
  };

  const handleSelectAdd = (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToSwipeDeck(movie);
    setIsOpen(false);
  };

  const handleSelectWatch = (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation();
    onWatchOn7Reels(movie);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input with high-end streaming app styling */}
      <form onSubmit={handleSubmit} className="relative flex items-center w-full group">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="🔍 Search movies, series, or actors..."
          className="w-full h-10 pl-4 pr-24 sm:pr-28 bg-white/5 hover:bg-white/10 hover:border-white/20 focus:border-rose-500/50 focus:bg-white/10 focus:ring-2 focus:ring-rose-500/20 border border-white/10 rounded-2xl text-xs text-white placeholder:text-slate-400 outline-none transition-all duration-200 shadow-inner backdrop-blur-md"
        />

        {/* Action Controls & Keyboard Shortcut Badge */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin mr-0.5" />
          )}

          {query ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                title="Search and stream on 7reels"
                className="px-2.5 py-1 rounded-xl bg-[#E50914] hover:bg-rose-600 text-[11px] font-bold text-white transition cursor-pointer flex items-center gap-1 shadow-md shadow-rose-950/50 active:scale-95"
              >
                <span>Go</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {/* Keyboard Shortcut Badge inside search input: Ctrl + K */}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[10px] font-mono font-semibold text-slate-300 shadow-sm select-none">
                <span className="text-[9px]">Ctrl</span>
                <span>+</span>
                <span>K</span>
              </kbd>
              {onOpenFullSearchOverlay && (
                <button
                  type="button"
                  onClick={onOpenFullSearchOverlay}
                  className="sm:hidden p-1 text-slate-400 hover:text-white transition"
                  title="Expand search"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </form>

      {/* High-End Search Dropdown Overlay with backdrop-blur-xl bg-black/90 */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full mt-2.5 left-0 right-0 z-50 bg-black/90 border border-white/15 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[82vh] sm:max-h-[460px] flex flex-col">
          {/* Dropdown Header */}
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-rose-500" />
              <span>Catalog Results</span>
              {results.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({results.length} found)
                </span>
              )}
            </span>
            {onOpenFullSearchOverlay && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullSearchOverlay();
                }}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer flex items-center gap-1"
              >
                <span>Full Screen</span>
                <span className="text-xs">↗</span>
              </button>
            )}
          </div>

          {/* Results List with Clear Poster Thumbnails & Direct Play / Add to Swipe */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 no-scrollbar">
            {isLoading && results.length === 0 && (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-xs text-slate-300 font-medium">Searching live streaming catalog...</span>
              </div>
            )}

            {!isLoading && results.length === 0 && (
              <div className="p-5 text-center flex flex-col items-center gap-2">
                <p className="text-xs text-slate-300 font-semibold">No direct catalog match for "{query}"</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Stream it directly via 7reels.cc free movie engine:
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-1 px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold shadow-lg shadow-rose-950/60 hover:bg-rose-600 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Direct Play "{query}" on 7reels 🚀</span>
                </button>
              </div>
            )}

            {results.map((movie) => (
              <div
                key={movie.id}
                className="p-3 hover:bg-white/[0.07] transition-colors flex items-center justify-between gap-3 group"
              >
                {/* Poster Thumbnail & Meta: Strict aspect-[2/3] */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden bg-black shrink-0 border border-white/15 relative shadow-md">
                    <img
                      src={getTmdbPosterUrl(movie.poster_path, movie.posterUrl)}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-white truncate leading-tight group-hover:text-rose-400 transition-colors">
                      {movie.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span>{movie.year}</span>
                      <span>·</span>
                      <span className="truncate">{movie.genres.slice(0, 2).join(', ')}</span>
                      {movie.imdbRating > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {movie.imdbRating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instant Action buttons: "Direct Play" and "Add to Swipe" */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleSelectAdd(movie, e)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                    title="Add to front of swipe deck"
                  >
                    <Plus className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Add to Swipe</span>
                    <span className="sm:hidden">Swipe</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSelectWatch(movie, e)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/50 transition active:scale-95 cursor-pointer"
                    title="Direct play on 7reels.cc"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Direct Play</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Bar */}
          {results.length > 0 && (
            <div className="px-4 py-2.5 bg-white/5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span className="hidden sm:inline">
                Press <strong className="text-white">Enter</strong> for instant stream
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition flex items-center gap-1"
              >
                <span>Search all titles on 7reels</span>
                <span>🚀</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
