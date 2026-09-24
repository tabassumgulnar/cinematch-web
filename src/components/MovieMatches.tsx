import React from 'react';
import { Movie, Room } from '../types';
import { getTmdbPosterUrl, DEFAULT_POSTER } from '../services/tmdb';
import { Play, Sparkles, Share2, Check, Star, CheckCircle, Flame, Film, ExternalLink } from 'lucide-react';

interface MovieMatchesProps {
  room: Room;
  matchedMovie: Movie;
  onOpenWatch: (movie: Movie) => void;
  onKeepSwiping: () => void;
  onToggleWatched: (historyId: string) => void;
  onDirectWatchFree?: (movie: Movie) => void;
  onCopyInviteLink?: () => void;
}

export const MovieMatches: React.FC<MovieMatchesProps> = ({
  room,
  matchedMovie,
  onOpenWatch,
  onKeepSwiping,
  onToggleWatched,
  onDirectWatchFree,
  onCopyInviteLink,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleShareLink = () => {
    if (onCopyInviteLink) {
      onCopyInviteLink();
    } else {
      const inviteUrl = `${window.location.origin}/?room=${room.code}`;
      navigator.clipboard?.writeText(inviteUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWatchMovieNow = () => {
    if (onDirectWatchFree) {
      onDirectWatchFree(matchedMovie);
    } else {
      window.open(
        `https://7reels.cc/search?q=${encodeURIComponent(matchedMovie.title)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <div className="w-full max-w-lg lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-28 pt-2 flex flex-col gap-8 relative overflow-hidden animate-in fade-in duration-300">
      {/* Background ambient lighting */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-rose-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-60 -right-20 w-80 h-80 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Featured Celebration Showcase (Single card on mobile, 2-column split on laptop) */}
      <div className="relative w-full rounded-3xl bg-white/5 backdrop-blur-xl p-5 sm:p-7 lg:p-8 flex flex-col overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-400" />

        {/* Laptop Split Grid: Left = Poster Showcase, Right = Details & Streaming CTAs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column (Laptop: 5 cols): Poster Showcase */}
          <div className="lg:col-span-5 w-full flex flex-col items-center">
            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-none aspect-[2/3] max-h-[420px] rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl group">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src={getTmdbPosterUrl(matchedMovie.poster_path, matchedMovie.posterUrl)}
                alt={matchedMovie.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              {/* IMDb Rating Badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md flex items-center gap-1.5 border border-amber-400/30 shadow-lg">
                <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span className="text-xs text-white font-black">{matchedMovie.imdbRating}</span>
                <span className="text-[10px] text-amber-400 font-bold uppercase">IMDb</span>
              </div>

              {/* Direct Play Floating Button on Hover */}
              <button
                type="button"
                onClick={handleWatchMovieNow}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl opacity-90 hover:opacity-100 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Direct Stream on 7reels"
              >
                <Play className="w-7 h-7 fill-current translate-x-0.5" />
              </button>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-white">{matchedMovie.year}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 bg-black/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3" />
                  <span>100% Agreement</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Laptop: 7 cols): Title, Consensus & Actions */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Consensus Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-sm mb-3">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                Unanimous Room Consensus
              </span>
            </div>

            {/* Celebration Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight">
              🎉 IT'S A <span className="text-[#E50914] drop-shadow-[0_0_24px_rgba(229,9,20,0.65)]">MATCH!</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Everyone in <span className="text-white font-bold font-mono">Room #{room.code}</span> agreed on{' '}
              <strong className="text-white">{matchedMovie.title}</strong> for movie night!
            </p>

            {/* Avatar Cluster with 100% Agreement */}
            <div className="flex items-center gap-2 my-3.5">
              <div className="flex items-center -space-x-2">
                {room.users.map((user) => (
                  <div key={user.id} className="relative">
                    <img
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-black shadow-md"
                      src={user.avatar}
                      alt={user.name}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow text-[8px] font-black">
                      ✓
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-emerald-400 pl-1">
                {room.users.length} of {room.users.length} Voted Yes
              </span>
            </div>

            {/* Movie Metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium flex-wrap my-1">
              <span className="font-semibold text-white">{matchedMovie.genres.join(' · ')}</span>
              <span className="text-slate-500">·</span>
              <span>{matchedMovie.runtime}</span>
              <span className="text-slate-500">·</span>
              <span>{matchedMovie.languages.join(', ')}</span>
              {matchedMovie.certificate && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono text-[10px]">
                    {matchedMovie.certificate}
                  </span>
                </>
              )}
            </div>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed mt-1 mb-4">
              {matchedMovie.synopsis}
            </p>

            {/* Primary Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-3 items-stretch">
              {/* Watch Movie Now on 7reels */}
              <button
                type="button"
                onClick={handleWatchMovieNow}
                className="flex-1 h-13 px-6 rounded-2xl bg-gradient-to-r from-[#E50914] via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-rose-900/50 hover:shadow-rose-700/60 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Watch Movie Now 🚀</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              {/* Keep Swiping Button */}
              <button
                onClick={onKeepSwiping}
                type="button"
                className="h-13 px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Keep Swiping</span>
              </button>
            </div>

            {/* Share Room Link */}
            <div className="w-full flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleShareLink}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 border border-amber-400/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{copiedLink ? 'Invite Link Copied!' : 'Invite Friends to Stream'}</span>
              </button>
              <button
                onClick={() => onOpenWatch(matchedMovie)}
                type="button"
                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-slate-400" />
                <span>Other Providers</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Group Matches History (Expands into responsive 3-column grid on laptop) */}
      {room.matchHistory && room.matchHistory.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                Room Match History ({room.matchHistory.length})
              </h3>
              <p className="text-xs text-slate-400">All unanimous titles agreed on by Room #{room.code}</p>
            </div>
          </div>

          {/* Responsive Grid: 1 col on mobile, 2 cols on tablet, 3 cols on laptop/desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {room.matchHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/5 backdrop-blur-md p-3 flex items-center justify-between gap-3 shadow-md hover:bg-white/[0.08] border border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-14 aspect-[2/3] rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      src={getTmdbPosterUrl(item.posterUrl, item.posterUrl)}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        {item.rating}
                      </span>
                      <span>·</span>
                      <span className="text-[10px]">{item.matchedAt}</span>
                    </div>
                    <h4 className="text-sm text-white truncate font-bold mt-0.5 group-hover:text-rose-400 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-xs text-slate-400 truncate mt-0.5">{item.genreText}</span>
                  </div>
                </div>

                {/* Direct Actions & Watched Toggle */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDirectWatchFree) {
                        onDirectWatchFree(item as unknown as Movie);
                      } else {
                        window.open(
                          `https://7reels.cc/search?q=${encodeURIComponent(item.title)}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }
                    }}
                    title="Direct Stream on 7reels"
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#E50914] hover:bg-rose-600 text-white shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => onToggleWatched(item.id)}
                    type="button"
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer ${
                      item.watched
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                    }`}
                    title={item.watched ? 'Marked as watched' : 'Mark as watched'}
                  >
                    <Check className={`w-3.5 h-3.5 ${item.watched ? 'stroke-[3]' : 'opacity-40'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
