import React, { useState, useRef, useEffect } from 'react';
import { Movie, Room } from '../types';
import { getTmdbPosterUrl, DEFAULT_POSTER } from '../services/tmdb';
import {
  RotateCcw,
  X,
  Info,
  Heart,
  Star,
  Play,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Users,
  Copy,
  QrCode,
  Check,
  CheckCircle,
  MessageSquare,
  Flame,
  Film,
  Keyboard,
} from 'lucide-react';

interface SwipeDeckProps {
  currentMovie: Movie;
  nextMovie?: Movie;
  thirdMovie?: Movie;
  room: Room;
  onVote: (vote: 'like' | 'pass' | 'super') => void;
  onRewind: () => void;
  onOpenInfo: (movie: Movie) => void;
  onChangePreferences?: () => void;
  onDirectWatchFree?: (movie: Movie) => void;
  onSendVibe?: (emoji: string, text: string) => void;
  onCopyInviteLink?: () => void;
  onOpenQR?: () => void;
  onOpenLetFindTogether?: () => void;
  onOpenMatchesTab?: () => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({
  currentMovie,
  nextMovie,
  thirdMovie,
  room,
  onVote,
  onRewind,
  onOpenInfo,
  onChangePreferences,
  onDirectWatchFree,
  onSendVibe,
  onCopyInviteLink,
  onOpenQR,
  onOpenLetFindTogether,
  onOpenMatchesTab,
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<'like' | 'pass' | 'super' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const startPosRef = useRef({ x: 0, y: 0 });

  // Laptop / Desktop Keyboard Shortcut Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        triggerVote('pass');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        triggerVote('like');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerVote('super');
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        onRewind();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        onOpenInfo(currentMovie);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleStreamCurrentMovie();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMovie, onRewind, onOpenInfo]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (animatingOut) return;
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    const threshold = 90;
    if (dragOffset.x > threshold) {
      triggerVote('like');
    } else if (dragOffset.x < -threshold) {
      triggerVote('pass');
    } else if (dragOffset.y < -120) {
      triggerVote('super');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const triggerVote = (type: 'like' | 'pass' | 'super') => {
    if (animatingOut) return;
    setAnimatingOut(type);
    setTimeout(() => {
      onVote(type);
      setAnimatingOut(null);
      setDragOffset({ x: 0, y: 0 });
    }, 280);
  };

  const handleStreamCurrentMovie = () => {
    if (onDirectWatchFree) {
      onDirectWatchFree(currentMovie);
    } else {
      window.open(
        `https://7reels.cc/search?q=${encodeURIComponent(currentMovie.title)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const handleCopyLink = () => {
    if (onCopyInviteLink) {
      onCopyInviteLink();
    } else {
      const inviteUrl = `${window.location.origin}/?room=${room.code}`;
      navigator.clipboard?.writeText(inviteUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Drag physics & opacity
  const rotateDeg = dragOffset.x * 0.06;
  const likeOpacity = Math.min(1, Math.max(0, (dragOffset.x - 20) / 70));
  const passOpacity = Math.min(1, Math.max(0, (-dragOffset.x - 20) / 70));
  const superOpacity = Math.min(1, Math.max(0, (-dragOffset.y - 40) / 70));

  let transformStyle = '';
  if (animatingOut === 'like') {
    transformStyle = 'translateX(150%) rotate(24deg)';
  } else if (animatingOut === 'pass') {
    transformStyle = 'translateX(-150%) rotate(-24deg)';
  } else if (animatingOut === 'super') {
    transformStyle = 'translateY(-140%) scale(1.05)';
  } else if (isDragging) {
    transformStyle = `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotateDeg}deg)`;
  } else {
    transformStyle = 'translate(0px, 0px) rotate(0deg)';
  }

  const activeCount = room.users.length;
  const otherUsers = room.users.slice(1, 4);

  // Recent matches from room
  const roomHistory = room.matchHistory || [];

  return (
    <div className="w-full max-w-md lg:max-w-6xl xl:max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 select-none pt-1">
      {/* Responsive Grid: Single column on phone, 12-column dual-pane on laptop/desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* =========================================================================
            LEFT COLUMN (Phone: Full Width, Laptop: 7 cols) -> Interactive Cinema Deck
            ========================================================================= */}
        <div className="w-full lg:col-span-7 flex flex-col items-center max-w-md lg:max-w-none mx-auto">
          {/* Session Status Bar */}
          <div className="w-full flex items-center justify-between py-1.5 px-3.5 mb-2.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                Room #{room.code}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-300 font-medium">
                {activeCount} {activeCount === 1 ? 'Person' : 'Friends'} Swiping
              </span>
            </div>

            {/* User Avatars */}
            <div className="flex items-center -space-x-2">
              {otherUsers.map((u) => (
                <img
                  key={u.id}
                  src={u.avatar}
                  alt={u.name}
                  title={u.name}
                  className="w-6 h-6 rounded-full ring-2 ring-black object-cover"
                />
              ))}
              {activeCount > 4 && (
                <div className="w-6 h-6 rounded-full bg-rose-600 ring-2 ring-black flex items-center justify-center text-white text-[10px] font-bold">
                  +{activeCount - 3}
                </div>
              )}
            </div>
          </div>

          {/* Active Movie Filter Indicator Bar */}
          <div className="w-full flex items-center justify-between mb-3 px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-xs shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden text-slate-300">
              <span className="font-semibold text-white truncate">
                {room.filters.genres.length > 0
                  ? room.filters.genres.slice(0, 3).join(', ')
                  : 'All Genres'}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 truncate">
                {room.filters.languages.length > 0
                  ? room.filters.languages.slice(0, 2).join(', ')
                  : 'All Languages'}
              </span>
            </div>
            {onChangePreferences && (
              <button
                onClick={onChangePreferences}
                type="button"
                className="text-[11px] font-semibold text-rose-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <span>Edit</span>
                <SlidersHorizontal className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Central Swipe Deck Container with Touch & Drag Support */}
          <div className="relative w-full aspect-[2/3] max-h-[560px] sm:max-h-[600px] min-h-[460px] flex items-center justify-center touch-none">
            {/* Card 3 (Stack depth) */}
            {thirdMovie && (
              <div className="absolute inset-x-5 top-5 bottom-0 bg-black/60 rounded-3xl scale-[0.90] translate-y-3 opacity-30 shadow-xl pointer-events-none border border-white/5" />
            )}

            {/* Card 2 (Middle layer) */}
            {nextMovie && (
              <div className="absolute inset-x-2.5 top-2.5 bottom-0 bg-gray-900 rounded-3xl scale-[0.95] translate-y-1.5 opacity-80 shadow-2xl pointer-events-none overflow-hidden border border-white/10">
                <img
                  src={getTmdbPosterUrl(nextMovie.poster_path, nextMovie.posterUrl)}
                  alt={nextMovie.title}
                  className="w-full h-full object-cover opacity-35"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                  }}
                />
              </div>
            )}

            {/* Card 1: Top Active Poster Card */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                transform: transformStyle,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] bg-gray-950 cursor-grab active:cursor-grabbing will-change-transform border border-white/15 ring-1 ring-white/10"
            >
              {/* Full-Bleed Movie Poster Backdrop with object-cover and aspect preservation */}
              <img
                src={getTmdbPosterUrl(currentMovie.poster_path, currentMovie.posterUrl)}
                alt={currentMovie.title}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                }}
              />

              {/* Cinematic Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 via-50% to-black/20 pointer-events-none" />

              {/* Top Card Bar: Direct Stream & Match Score */}
              <div className="absolute top-0 inset-x-0 p-3.5 flex items-start justify-between z-10 pointer-events-none">
                {/* Direct Watch Free on 7Reels */}
                <button
                  type="button"
                  onClick={handleStreamCurrentMovie}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="pointer-events-auto flex items-center gap-1.5 bg-[#E50914] hover:bg-rose-600 active:scale-95 text-white px-3 py-1.5 rounded-full shadow-lg shadow-rose-900/50 border border-white/20 text-xs font-bold transition-all cursor-pointer group"
                  title="Watch Free on 7Reels"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch Free 🍿</span>
                  <ExternalLink className="w-3 h-3 opacity-75 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Room Match Score */}
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 text-xs font-bold shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentMovie.matchScorePercent}% Match</span>
                </div>
              </div>

              {/* Drag Overlay Badges */}
              {/* PASS Badge (Right) */}
              <div
                style={{ opacity: isDragging ? passOpacity : animatingOut === 'pass' ? 1 : 0 }}
                className="absolute top-14 right-6 rotate-12 transition-opacity duration-150 z-20 pointer-events-none"
              >
                <div className="px-5 py-1.5 rounded-2xl bg-rose-600/90 backdrop-blur-md text-white text-xl font-black uppercase tracking-wider shadow-2xl border-2 border-white/40">
                  PASS ✖
                </div>
              </div>

              {/* LIKE Badge (Left) */}
              <div
                style={{ opacity: isDragging ? likeOpacity : animatingOut === 'like' ? 1 : 0 }}
                className="absolute top-14 left-6 -rotate-12 transition-opacity duration-150 z-20 pointer-events-none"
              >
                <div className="px-5 py-1.5 rounded-2xl bg-emerald-600/90 backdrop-blur-md text-white text-xl font-black uppercase tracking-wider shadow-2xl border-2 border-white/40">
                  LIKE 💚
                </div>
              </div>

              {/* SUPERLIKE Badge (Center) */}
              <div
                style={{ opacity: isDragging ? superOpacity : animatingOut === 'super' ? 1 : 0 }}
                className="absolute top-10 left-1/2 -translate-x-1/2 transition-opacity duration-150 z-20 pointer-events-none"
              >
                <div className="px-5 py-1.5 rounded-2xl bg-amber-500/95 backdrop-blur-md text-slate-950 text-lg font-black uppercase tracking-wider shadow-2xl border-2 border-white/40">
                  SUPER LIKE ⭐
                </div>
              </div>

              {/* Card Information Layer (Anchored to Bottom) */}
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex flex-col gap-1.5 z-10">
                {/* Title */}
                <h2 className="text-2xl sm:text-3xl text-white font-black font-display tracking-tight leading-tight drop-shadow-md">
                  {currentMovie.title}
                </h2>

                {/* Clean Unboxed Metadata: Year · Runtime · Certificate */}
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <span className="text-white font-semibold">{currentMovie.year}</span>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span>{currentMovie.runtime}</span>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span>{currentMovie.genres.slice(0, 2).join(' / ')}</span>
                  {currentMovie.certificate && (
                    <>
                      <span aria-hidden="true" className="text-slate-500">
                        ·
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {currentMovie.certificate}
                      </span>
                    </>
                  )}
                </div>

                {/* Ratings: IMDb Badge Overlay + Rotten Tomatoes */}
                <div className="flex items-center gap-2.5 my-1">
                  {/* IMDb Badge Overlay */}
                  <div className="flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-400/30 text-amber-300 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span className="text-xs font-black tracking-tight">{currentMovie.imdbRating}</span>
                    <span className="text-[10px] font-bold text-amber-400/80 uppercase">IMDb</span>
                  </div>

                  {/* Rotten Tomatoes */}
                  {currentMovie.tomatoRating > 0 && (
                    <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 text-xs font-semibold">
                      <span className="text-rose-500">🍅</span>
                      <span>{currentMovie.tomatoRating}%</span>
                    </div>
                  )}
                </div>

                {/* Synopsis snippet */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed pt-0.5">
                  {currentMovie.synopsis}
                </p>
              </div>
            </div>
          </div>

          {/* Swipe Direction Helper Guide (with Keyboard Hints on laptop) */}
          <div className="w-full flex items-center justify-between px-3 py-2 text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1">
              <span>← Swipe Left to Pass</span>
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-slate-300">
                ←
              </kbd>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-slate-300">
                →
              </kbd>
              <span>Swipe Right to Match →</span>
            </span>
          </div>

          {/* Floating Action Buttons: Prominent Pass ✖ & Like 💚 with Keyboard Key Hints */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {/* Rewind */}
            <div className="flex flex-col items-center gap-1">
              <button
                aria-label="Rewind Movie"
                onClick={onRewind}
                type="button"
                className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center text-slate-400 hover:text-white shadow-md border border-white/10 backdrop-blur-md cursor-pointer"
                title="Rewind (Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="hidden lg:block text-[9px] font-mono text-slate-500 font-semibold uppercase">
                Z
              </span>
            </div>

            {/* Prominent Floating "Pass ✖" (Red Glow) */}
            <div className="flex flex-col items-center gap-1">
              <button
                aria-label="Pass Movie"
                onClick={() => triggerVote('pass')}
                type="button"
                className="w-16 h-16 rounded-full bg-white/5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 shadow-lg shadow-rose-950/40 hover:shadow-rose-900/60 border border-white/15 hover:border-rose-500/50 hover:scale-105 active:scale-90 transition-all flex items-center justify-center backdrop-blur-md cursor-pointer group"
                title="Pass (← or A)"
              >
                <X className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
              </button>
              <span className="hidden lg:block text-[9px] font-mono text-rose-400/80 font-bold uppercase">
                Pass (←)
              </span>
            </div>

            {/* Details / Trailer Trigger */}
            <div className="flex flex-col items-center gap-1">
              <button
                aria-label="Movie Details"
                onClick={() => onOpenInfo(currentMovie)}
                type="button"
                className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center text-slate-400 hover:text-white shadow-md border border-white/10 backdrop-blur-md cursor-pointer"
                title="Movie Info (I)"
              >
                <Info className="w-4 h-4" />
              </button>
              <span className="hidden lg:block text-[9px] font-mono text-slate-500 font-semibold uppercase">
                I
              </span>
            </div>

            {/* Prominent Floating "Like 💚" (Green Glow) */}
            <div className="flex flex-col items-center gap-1">
              <button
                aria-label="Like Movie"
                onClick={() => triggerVote('like')}
                type="button"
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 hover:from-emerald-500 hover:to-teal-300 text-white shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/70 border border-emerald-300/40 hover:scale-105 active:scale-90 transition-all flex items-center justify-center cursor-pointer group"
                title="Like / Match (→ or D)"
              >
                <Heart className="w-7 h-7 fill-white text-white group-hover:scale-110 transition-transform" />
              </button>
              <span className="hidden lg:block text-[9px] font-mono text-emerald-400/90 font-bold uppercase">
                Like (→)
              </span>
            </div>

            {/* Super Like */}
            <div className="flex flex-col items-center gap-1">
              <button
                aria-label="Super Like Movie"
                onClick={() => triggerVote('super')}
                type="button"
                className="w-11 h-11 rounded-full bg-amber-500/10 hover:bg-amber-500/20 active:scale-90 transition-all flex items-center justify-center text-amber-400 shadow-md border border-amber-500/30 backdrop-blur-md cursor-pointer"
                title="Super Like (↑ or W)"
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
              <span className="hidden lg:block text-[9px] font-mono text-amber-400/80 font-bold uppercase">
                Super (↑)
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (Laptop / Desktop Only: 5 cols) -> Multi-Functional Hub
            ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-4">
          {/* Card 1: Active Party & Live Swiper Sync */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Party Live Sync</h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>#{room.code}</span>
              </div>
            </div>

            {/* Party Members Roster */}
            <div className="space-y-2 pt-1">
              {room.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white leading-tight">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {user.isReady ? 'Swiping live 🍿' : 'In room'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Vibe Reactions */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                Send Party Vibe
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { emoji: '🍿', text: 'Popcorn is ready!' },
                  { emoji: '🚀', text: 'Hyped for movie night!' },
                  { emoji: '🍕', text: 'Pizza ordered!' },
                  { emoji: '😱', text: 'Give us scary chills!' },
                ].map((v) => (
                  <button
                    key={v.emoji}
                    type="button"
                    onClick={() => onSendVibe?.(v.emoji, v.text)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-lg flex items-center justify-center border border-white/10 transition cursor-pointer"
                    title={v.text}
                  >
                    <span>{v.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Share link buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white border border-white/10 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Room Link</span>
                  </>
                )}
              </button>
              {onOpenQR && (
                <button
                  type="button"
                  onClick={onOpenQR}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 transition active:scale-95 cursor-pointer"
                  title="Show Room QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Real-time Matches Drawer / Quick Stream */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Party Consensus Matches</h3>
              </div>
              {onOpenMatchesTab && (
                <button
                  type="button"
                  onClick={onOpenMatchesTab}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  View All ({roomHistory.length}) →
                </button>
              )}
            </div>

            {roomHistory.length > 0 ? (
              <div className="space-y-2.5">
                {roomHistory.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-10 h-14 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block truncate group-hover:text-rose-400 transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.year} · {item.genreText}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle className="w-3 h-3" />
                          <span>100% Agreement</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(
                          `https://7reels.cc/search?q=${encodeURIComponent(item.title)}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-rose-950/50 shrink-0 transition active:scale-95 cursor-pointer"
                      title="Direct Stream on 7reels"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Stream</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-black/30 border border-dashed border-white/10 flex flex-col items-center text-center gap-1.5">
                <Flame className="w-6 h-6 text-rose-500/80 animate-pulse" />
                <span className="text-xs font-bold text-white">Seeking First Unanimous Pick</span>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
                  When everyone in Room #{room.code} swipes right on the same title, it will unlock
                  here for instant streaming!
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Desktop Keyboard Controls Cheat-Sheet */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Laptop & Desktop Hotkeys</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/30 px-2.5">
                <span className="text-slate-400">Swipe Left (Pass)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono font-bold text-[10px]">
                  ← or A
                </kbd>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/30 px-2.5">
                <span className="text-slate-400">Swipe Right (Match)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono font-bold text-[10px]">
                  → or D
                </kbd>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/30 px-2.5">
                <span className="text-slate-400">Super Like</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono font-bold text-[10px]">
                  ↑ or W
                </kbd>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/30 px-2.5">
                <span className="text-slate-400">Watch Free</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono font-bold text-[10px]">
                  P
                </kbd>
              </div>
            </div>

            {/* Smart Pick AI Trigger */}
            {onOpenLetFindTogether && (
              <button
                type="button"
                onClick={onOpenLetFindTogether}
                className="mt-1 p-2.5 rounded-xl bg-gradient-to-r from-white/5 to-amber-500/10 hover:from-white/10 hover:to-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between transition cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Can't agree? Open AI Concierge</span>
                </div>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
