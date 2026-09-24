import React, { useState } from 'react';
import { RoomFilters } from '../types';
import { SlidersHorizontal, Check, Star, Clock, Play } from 'lucide-react';

interface GenreFiltersProps {
  roomCode: string;
  filters: RoomFilters;
  onUpdateFilters: (filters: Partial<RoomFilters>) => void;
  onStartSession: () => void;
}

const AVAILABLE_GENRES = [
  { name: 'Action', emoji: '💥' },
  { name: 'Comedy', emoji: '😂' },
  { name: 'Horror', emoji: '👻' },
  { name: 'Sci-Fi', emoji: '🚀' },
  { name: 'Romance', emoji: '💕' },
  { name: 'Documentary', emoji: '📽️' },
  { name: 'Thriller', emoji: '🔪' },
  { name: 'Animation', emoji: '🎨' },
];

const AVAILABLE_LANGUAGES = [
  'Hindi',
  'English',
  'South Indian (Telugu/Tamil)',
  'Spanish',
  'Japanese',
  'Korean',
];

const RUNTIME_OPTIONS = [
  { range: '< 90m', label: 'Quick Watch' },
  { range: '90 - 120m', label: 'Sweet Spot' },
  { range: '120 - 150m', label: 'Epic Night' },
];

export const GenreFilters: React.FC<GenreFiltersProps> = ({
  roomCode,
  filters,
  onUpdateFilters,
  onStartSession,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(filters.genres);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(filters.languages);
  const [minRating, setMinRating] = useState<number>(filters.minRating);
  const [selectedRuntime, setSelectedRuntime] = useState<string>(filters.runtimeRange);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGenre = (genre: string) => {
    const updated = selectedGenres.includes(genre)
      ? selectedGenres.filter((g) => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(updated);
    onUpdateFilters({ genres: updated });
  };

  const toggleLanguage = (lang: string) => {
    const updated = selectedLanguages.includes(lang)
      ? selectedLanguages.filter((l) => l !== lang)
      : [...selectedLanguages, lang];
    setSelectedLanguages(updated);
    onUpdateFilters({ languages: updated });
  };

  const handleRatingChange = (val: number) => {
    setMinRating(val);
    onUpdateFilters({ minRating: val });
  };

  const handleRuntimeChange = (runtime: string) => {
    setSelectedRuntime(runtime);
    onUpdateFilters({ runtimeRange: runtime });
  };

  const handleSaveAndLaunch = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onStartSession();
    }, 400);
  };

  return (
    <div className="flex flex-col w-full max-w-xl lg:max-w-4xl mx-auto px-4 pb-28 pt-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-5 text-center items-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/15 border border-rose-500/25 text-rose-400 text-[11px] font-bold tracking-wide uppercase mb-1">
          <SlidersHorizontal className="w-3 h-3" />
          <span>Room #{roomCode} Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white font-black font-display tracking-tight">
          Fine-Tune Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
          Adjust genres, languages, and minimum IMDb threshold for your group deck.
        </p>
      </div>

      {/* Responsive Grid on Laptop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* SECTION 1: GENRES */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Target Genres</h2>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {selectedGenres.length} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_GENRES.map((g) => {
              const isSelected = selectedGenres.includes(g.name);
              return (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => toggleGenre(g.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#E50914] text-white border border-rose-400 shadow-md shadow-rose-900/40 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span>{g.name}</span>
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: LANGUAGES */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Audio Languages</h2>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {selectedLanguages.length} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#E50914] text-white border border-rose-400 shadow-md shadow-rose-900/40 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <span>{lang}</span>
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: MINIMUM RATING & RUNTIME */}
      <div className="mb-6 bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col gap-4">
        {/* Rating */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Minimum IMDb Rating</span>
            </h2>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {minRating}+ Stars
            </span>
          </div>
          <input
            type="range"
            min="5.0"
            max="8.5"
            step="0.5"
            value={minRating}
            onChange={(e) => handleRatingChange(parseFloat(e.target.value))}
            className="w-full accent-rose-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>5.0 (All Movies)</span>
            <span>7.0 (Certified Great)</span>
            <span>8.0+ (Masterpieces)</span>
          </div>
        </div>

        {/* Runtime */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Runtime Sweetspot</span>
            </h2>
            <span className="text-xs text-slate-300 font-semibold">{selectedRuntime}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RUNTIME_OPTIONS.map((opt) => (
              <button
                key={opt.range}
                type="button"
                onClick={() => handleRuntimeChange(opt.range)}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  selectedRuntime === opt.range
                    ? 'bg-rose-600/20 border-rose-500 text-white font-bold shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">{opt.range}</div>
                <div className="text-[10px] opacity-80">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA: Launch */}
      <button
        type="button"
        onClick={handleSaveAndLaunch}
        disabled={isSubmitting}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-rose-900/50 hover:shadow-rose-700/60 active:scale-[0.98] transition cursor-pointer"
      >
        <Play className="w-4 h-4 fill-current" />
        <span>Save & Resume Swiping 🎬</span>
      </button>
    </div>
  );
};
