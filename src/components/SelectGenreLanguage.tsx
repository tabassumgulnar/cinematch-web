import React, { useState } from 'react';
import { RoomFilters } from '../types';
import { INITIAL_MOVIES } from '../data/movies';
import { Sparkles, ArrowRight, Check, Film, Globe, Users, Play, SlidersHorizontal } from 'lucide-react';

interface SelectGenreLanguageProps {
  roomCode: string;
  filters: RoomFilters;
  onUpdateFilters: (filters: Partial<RoomFilters>) => void;
  onStartSwiping: () => void;
  onOpenLetFindTogether?: () => void;
}

interface GenreOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  isPrimary?: boolean;
}

interface LanguageOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  isPrimary?: boolean;
}

const GENRE_OPTIONS: GenreOption[] = [
  { id: 'Comedy', name: 'Comedy', emoji: '😂', description: 'Laugh riot & feel-good vibes', isPrimary: true },
  { id: 'Action', name: 'Action', emoji: '💥', description: 'High-octane stunts & thrills', isPrimary: true },
  { id: 'Horror', name: 'Horror', emoji: '👻', description: 'Spooky chills & tension', isPrimary: true },
  { id: 'Sci-Fi', name: 'Sci-Fi', emoji: '🚀', description: 'Mind-bending & futuristic' },
  { id: 'Thriller', name: 'Thriller', emoji: '🔪', description: 'Edge-of-seat crime mystery' },
  { id: 'Adventure', name: 'Adventure', emoji: '🗺️', description: 'Grand journeys & quests' },
  { id: 'Drama', name: 'Drama', emoji: '🎭', description: 'Deep emotional stories' },
  { id: 'Romance', name: 'Romance', emoji: '💕', description: 'Love stories & warm chemistry' },
];

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'Hindi', name: 'Hindi', badge: '🇮🇳', description: 'Bollywood & Hindi dubbed releases', isPrimary: true },
  { id: 'English', name: 'English', badge: '🇺🇸', description: 'Hollywood & international hits', isPrimary: true },
  { id: 'South Indian (Telugu/Tamil)', name: 'South Indian', badge: '🐘', description: 'Blockbuster Telugu, Tamil & Malayalam' },
  { id: 'Japanese', name: 'Japanese', badge: '🎌', description: 'Anime & cinema masterpieces' },
  { id: 'Korean', name: 'Korean', badge: '🇰🇷', description: 'K-thrillers & drama hits' },
  { id: 'Spanish', name: 'Spanish', badge: '🇪🇸', description: 'Acclaimed global releases' },
];

export const SelectGenreLanguage: React.FC<SelectGenreLanguageProps> = ({
  roomCode,
  filters,
  onUpdateFilters,
  onStartSwiping,
  onOpenLetFindTogether,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (filters.genres && filters.genres.length > 0) {
      return filters.genres;
    }
    return ['Comedy', 'Action', 'Horror'];
  });

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    if (filters.languages && filters.languages.length > 0) {
      return filters.languages;
    }
    return ['Hindi', 'English'];
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const toggleGenre = (genreId: string) => {
    setValidationError(null);
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const toggleLanguage = (langId: string) => {
    setValidationError(null);
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  };

  const handleApplyPreset = (genres: string[], languages: string[]) => {
    setValidationError(null);
    setSelectedGenres(genres);
    setSelectedLanguages(languages);
  };

  const matchingMoviesCount = INITIAL_MOVIES.filter((m) => {
    const matchesGenre =
      selectedGenres.length === 0 || m.genres.some((g) => selectedGenres.includes(g));
    const matchesLang =
      selectedLanguages.length === 0 ||
      m.languages.some((l) =>
        selectedLanguages.some(
          (sl) => l.toLowerCase().includes(sl.toLowerCase()) || sl.toLowerCase().includes(l.toLowerCase())
        )
      );
    return matchesGenre && matchesLang;
  }).length;

  const handleStartSwiping = () => {
    if (selectedGenres.length === 0) {
      setValidationError('Please select at least 1 movie genre (e.g. Comedy, Action, or Horror)');
      return;
    }
    if (selectedLanguages.length === 0) {
      setValidationError('Please select at least 1 language (e.g. Hindi or English)');
      return;
    }

    setValidationError(null);
    setIsLaunching(true);

    onUpdateFilters({
      genres: selectedGenres,
      languages: selectedLanguages,
    });

    setTimeout(() => {
      setIsLaunching(false);
      onStartSwiping();
    }, 300);
  };

  return (
    <div className="w-full max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/10 border border-rose-500/25 text-rose-400 text-[11px] font-bold tracking-wide uppercase mb-2">
          <span>Step 1 of 2 · Room Setup</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight">
          Select Genre & Language
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mt-1.5 leading-relaxed">
          Choose what you and your party want to stream tonight. The synchronized swipe deck will adapt to these filters.
        </p>
      </div>

      {/* Responsive 12-Column Grid: Single-column on mobile, split-layout on laptop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* =========================================================================
            LEFT COLUMN (Phone: Full, Laptop: 8 cols) -> Filters & Presets
            ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Quick Mix Presets Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap pl-0.5">
              Quick Mix:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset(['Comedy', 'Action', 'Horror'], ['Hindi', 'English'])}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 whitespace-nowrap transition cursor-pointer active:scale-95"
            >
              🔥 Top Trio (Comedy, Action, Horror)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(['Comedy'], ['Hindi', 'English'])}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 whitespace-nowrap transition cursor-pointer active:scale-95"
            >
              😂 Just Laughs
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(['Horror'], ['Hindi', 'English'])}
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 whitespace-nowrap transition cursor-pointer active:scale-95"
            >
              👻 Spooky Chills
            </button>
          </div>

          {/* SECTION 1: GENRES */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Movie Genres</span>
                    <span className="text-xs text-slate-400 font-normal">(Required)</span>
                  </h2>
                  <p className="text-xs text-slate-400">Select one or more genres to swipe</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 text-emerald-400 border border-white/10">
                {selectedGenres.length} selected
              </span>
            </div>

            {/* Primary Genre Cards: 1 col on mobile, 3 cols on sm/laptop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {GENRE_OPTIONS.filter((g) => g.isPrimary).map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    className={`relative flex flex-col p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600/15 border-2 border-[#E50914] shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/20'
                        : 'bg-white/5 hover:bg-white/[0.09] border border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-2xl">{genre.emoji}</span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-[#E50914] text-white shadow-sm' : 'border border-white/25'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white">{genre.name}</span>
                    <span className="text-[11px] text-slate-400 leading-tight line-clamp-1 mt-0.5">
                      {genre.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* More Genres Pill Tags */}
            <div className="pt-3.5 border-t border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2.5">
                More Popular Genres
              </span>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.filter((g) => !g.isPrimary).map((genre) => {
                  const isSelected = selectedGenres.includes(genre.id);
                  return (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#E50914] text-white border border-rose-400 shadow-md shadow-rose-900/40 ring-2 ring-rose-500/20'
                          : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                      }`}
                    >
                      <span>{genre.emoji}</span>
                      <span>{genre.name}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: LANGUAGES */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Audio Languages</span>
                    <span className="text-xs text-slate-400 font-normal">(Required)</span>
                  </h2>
                  <p className="text-xs text-slate-400">Choose movie soundtrack languages</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 text-emerald-400 border border-white/10">
                {selectedLanguages.length} selected
              </span>
            </div>

            {/* Primary Language Cards: 1 col on mobile, 2 cols on sm/laptop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {LANGUAGE_OPTIONS.filter((l) => l.isPrimary).map((lang) => {
                const isSelected = selectedLanguages.includes(lang.id);
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => toggleLanguage(lang.id)}
                    className={`relative flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600/15 border-2 border-[#E50914] shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/20'
                        : 'bg-white/5 hover:bg-white/[0.09] border border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-1 bg-black/40 rounded-lg border border-white/10">
                        {lang.badge}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-white block">{lang.name}</span>
                        <span className="text-[11px] text-slate-400 leading-tight block">
                          {lang.description}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#E50914] text-white shadow-sm' : 'border border-white/25'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* More Languages Pill Tags */}
            <div className="pt-3.5 border-t border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2.5">
                More Regional & International Languages
              </span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.filter((l) => !l.isPrimary).map((lang) => {
                  const isSelected = selectedLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLanguage(lang.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#E50914] text-white border border-rose-400 shadow-md shadow-rose-900/40 ring-2 ring-rose-500/20'
                          : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                      }`}
                    >
                      <span>{lang.badge}</span>
                      <span>{lang.name}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation Error banner if triggered */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Mobile Bottom Launch Button (Hidden on laptop since sidebar has persistent CTA) */}
          <div className="lg:hidden w-full pt-1 pb-8 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleStartSwiping}
              disabled={isLaunching}
              className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-base font-black tracking-wide shadow-xl transition-all duration-200 cursor-pointer ${
                selectedGenres.length > 0 && selectedLanguages.length > 0
                  ? 'bg-gradient-to-r from-[#E50914] via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/50 hover:shadow-rose-700/60 active:scale-[0.98]'
                  : 'bg-white/10 text-slate-400 border border-white/10 cursor-not-allowed'
              }`}
            >
              {isLaunching ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading Swipe Deck...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Start Swiping 🎬</span>
                </span>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Preferences apply to your entire synchronized room party.
            </p>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (Laptop / Desktop Only: 4 cols) -> Sticky Readiness Hub
            ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 sticky top-24">
          {/* Main Action Card */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Watch Readiness
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Ready to Swipe
              </span>
            </div>

            {/* Big Launch Button */}
            <button
              type="button"
              onClick={handleStartSwiping}
              disabled={isLaunching}
              className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-base font-black tracking-wide shadow-xl transition-all duration-200 cursor-pointer ${
                selectedGenres.length > 0 && selectedLanguages.length > 0
                  ? 'bg-gradient-to-r from-[#E50914] via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/50 hover:shadow-rose-700/60 active:scale-[0.98]'
                  : 'bg-white/10 text-slate-400 border border-white/10 cursor-not-allowed'
              }`}
            >
              {isLaunching ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading Swipe Deck...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Start Swiping 🎬</span>
                </span>
              )}
            </button>

            {/* Catalog Match Metrics */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-lg shrink-0">
                🎬
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {matchingMoviesCount > 0 ? `${matchingMoviesCount}+ Curated Movies` : 'Expanding catalog...'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Filtered by {selectedGenres.length} genres and {selectedLanguages.length} audio tracks
                </div>
              </div>
            </div>

            {/* Room sync indicator */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
              <span className="text-slate-400">Synchronized Room</span>
              <span className="font-mono font-bold text-white">#{roomCode}</span>
            </div>
          </div>

          {/* AI Concierge Card */}
          {onOpenLetFindTogether && (
            <button
              type="button"
              onClick={onOpenLetFindTogether}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-amber-500/40 shadow-lg flex items-center justify-between text-left transition group active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E50914] to-amber-500 flex items-center justify-center shadow-md shadow-rose-950/40 shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">LET FIND TOGETHER AI</span>
                  </div>
                  <span className="text-[11px] text-slate-300">
                    Can't pick genres? Let AI auto-curate the room
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
