import React, { useState, useEffect, useRef } from 'react';
import { Movie, Room, User } from '../types';
import { getMovieTmdbId, fetchMovieCredits, CastMember } from '../services/tmdb';
import { RoomChat } from './RoomChat';
import {
  Maximize,
  Minimize,
  X,
  ArrowLeft,
  Tv,
  Star,
  Film,
  Users,
  MessageSquare,
  Sparkles,
  Info,
  RefreshCw,
  Server,
  Layers,
  CheckCircle2,
  Radio,
} from 'lucide-react';

interface InAppMoviePlayerProps {
  movie: Movie;
  room: Room;
  currentUser: User;
  mode: 'normal' | 'watch-party';
  onClose: () => void;
  onBackToSwiping: () => void;
  onSwitchMode?: (mode: 'normal' | 'watch-party') => void;
  onSendVibe?: (emoji: string, text: string) => void;
}

const STREAM_SERVERS = [
  {
    id: 'vidsrc-to',
    name: 'VidSrc TO (Default)',
    getUrl: (tmdbId: string | number) => `https://vidsrc.to/embed/movie/${tmdbId}`,
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc ME',
    getUrl: (tmdbId: string | number) => `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
  },
  {
    id: 'embed-su',
    name: 'Embed SU',
    getUrl: (tmdbId: string | number) => `https://embed.su/embed/movie/${tmdbId}`,
  },
  {
    id: 'superembed',
    name: 'SuperEmbed VIP',
    getUrl: (tmdbId: string | number) => `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  },
];

export const InAppMoviePlayer: React.FC<InAppMoviePlayerProps> = ({
  movie,
  room,
  currentUser,
  mode,
  onClose,
  onBackToSwiping,
  onSwitchMode,
  onSendVibe,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerFrameRef = useRef<HTMLIFrameElement>(null);

  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [isLoadingCast, setIsLoadingCast] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [iframeKey, setIframeKey] = useState(0);

  const tmdbId = getMovieTmdbId(movie);
  const currentServer = STREAM_SERVERS[selectedServerIndex];
  const streamEmbedUrl = currentServer.getUrl(tmdbId);

  // Fetch real cast for this movie
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCast(true);
    fetchMovieCredits(tmdbId)
      .then((members) => {
        if (isMounted) {
          setCast(members);
        }
      })
      .catch((err) => {
        console.warn('Cast fetch error:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCast(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tmdbId]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleReloadStream = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0c10]/95 backdrop-blur-2xl flex flex-col overflow-y-auto animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-[#12141a]/95 border-b border-[#252832] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        {/* Left: Back to Swiping & Movie Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBackToSwiping}
            type="button"
            className="h-9 px-3 rounded-xl bg-[#1e2028] hover:bg-[#282a34] text-gray-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-white/5 cursor-pointer shrink-0"
            title="Back to Swiping Deck"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Back to Swiping</span>
            <span className="sm:hidden">Swipe</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#e50914] text-xl shrink-0">
              movie
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-1.5">
                <span>{movie.title}</span>
                <span className="text-xs text-gray-400 font-normal">({movie.year})</span>
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-500/20 text-red-400 font-extrabold uppercase">
                  TMDB ID: {tmdbId}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">In-App Player</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mode Switch, Server Selector, Fullscreen, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mode Switcher */}
          {onSwitchMode && (
            <button
              onClick={() => onSwitchMode(mode === 'normal' ? 'watch-party' : 'normal')}
              type="button"
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                mode === 'watch-party'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-500/30 shadow-md shadow-red-950/40'
                  : 'bg-[#1e2028] hover:bg-[#282a34] text-gray-300 border-white/5'
              }`}
              title={mode === 'normal' ? 'Switch to Synced Watch Party' : 'Switch to Solo Player'}
            >
              {mode === 'watch-party' ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span className="hidden xs:inline">Watch Party Mode</span>
                  <span className="xs:hidden">Party</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="hidden xs:inline">Start Watch Party</span>
                  <span className="xs:hidden">Sync</span>
                </>
              )}
            </button>
          )}

          {/* Server Switcher Dropdown */}
          <div className="relative hidden md:flex items-center">
            <select
              value={selectedServerIndex}
              onChange={(e) => {
                setSelectedServerIndex(Number(e.target.value));
                setIframeKey((prev) => prev + 1);
              }}
              className="h-8 sm:h-9 px-2.5 pr-6 bg-[#181a22] hover:bg-[#20222c] border border-[#2d303a] rounded-xl text-xs text-gray-200 font-medium outline-none cursor-pointer"
              title="Switch video source server"
            >
              {STREAM_SERVERS.map((server, idx) => (
                <option key={server.id} value={idx}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reload Stream Button */}
          <button
            onClick={handleReloadStream}
            type="button"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1e2028] hover:bg-[#282a34] text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95 border border-white/5 cursor-pointer"
            title="Reload video player stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            type="button"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1e2028] hover:bg-[#282a34] text-gray-300 hover:text-white flex items-center justify-center transition active:scale-95 border border-white/5 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5" />
            ) : (
              <Maximize className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Player Action */}
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2a1719] hover:bg-[#3a1d20] text-red-400 hover:text-red-300 flex items-center justify-center transition active:scale-95 border border-red-500/20 cursor-pointer"
            title="Close Movie Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Cinema Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-6 py-4 flex flex-col gap-5">
        {/* Watch Party Synchronized Notice Banner */}
        {mode === 'watch-party' && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950/70 via-[#1e1724] to-amber-950/60 border border-red-500/30 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Synced Watch Party Active</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 text-[10px] font-bold">
                    Room #{room.code}
                  </span>
                </h4>
                <p className="text-[11px] text-gray-300">
                  {room.users.length} members connected • Group chat is synced live below
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Sync Ready
              </span>
            </div>
          </div>
        )}

        {/* Video Player Cinema Frame Container */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-[#2d303a] shadow-2xl group"
        >
          {/* Embedded Video Iframe */}
          <iframe
            key={iframeKey}
            ref={playerFrameRef}
            src={streamEmbedUrl}
            title={`${movie.title} In-App Stream`}
            className="w-full h-full border-0 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />

          {/* Quick Floating Overlay Server Pills (when hovered or mobile tap) */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
            <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
              <Server className="w-3 h-3 text-red-500" />
              Server:
            </span>
            {STREAM_SERVERS.map((srv, idx) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => {
                  setSelectedServerIndex(idx);
                  setIframeKey((k) => k + 1);
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                  selectedServerIndex === idx
                    ? 'bg-red-600 text-white'
                    : 'bg-[#222530] text-gray-300 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile View Toggle Bar: Details vs Group Chat */}
        <div className="flex lg:hidden items-center justify-center p-1 bg-[#14161f] rounded-xl border border-[#252834]">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'details'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Movie Details & Cast</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'chat'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Synced Group Chat</span>
          </button>
        </div>

        {/* Below Player Layout: Two Columns on Desktop (Details + Chat), Tabbed on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-16">
          {/* Left Column (7 cols): Movie Details, Ratings & TMDB Cast */}
          <div
            className={`lg:col-span-7 flex flex-col gap-4 ${
              activeTab === 'details' ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Title & Metadata Card */}
            <div className="bg-[#14161e] border border-[#252832] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252832] pb-3">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{movie.year}</span>
                    <span>•</span>
                    <span>{movie.runtime}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#252832] text-gray-300 font-semibold text-[10px]">
                      {movie.certificate}
                    </span>
                    <span>•</span>
                    <span className="text-gray-300">Dir. {movie.director}</span>
                  </div>
                </div>

                {/* Score Badges */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-sm shadow-sm">
                    <Star className="w-4 h-4 fill-current text-amber-400" />
                    <span>{movie.imdbRating}</span>
                    <span className="text-[10px] text-amber-400/70">TMDB</span>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs">
                    <span>🍅 {movie.tomatoRating}%</span>
                  </div>
                </div>
              </div>

              {/* Genre Chips */}
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded-lg bg-[#1f222c] border border-[#2d303c] text-xs font-semibold text-gray-300"
                  >
                    {g}
                  </span>
                ))}
                {movie.languages.map((l) => (
                  <span
                    key={l}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-300"
                  >
                    🌐 {l}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Synopsis
                </h4>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                  {movie.synopsis}
                </p>
              </div>
            </div>

            {/* TMDB Cast Members Carousel */}
            <div className="bg-[#14161e] border border-[#252832] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-red-500" />
                  <span>Starring Cast</span>
                </h4>
                <span className="text-[11px] text-gray-400">
                  {isLoadingCast ? 'Loading TMDB credits...' : `${cast.length} Actors`}
                </span>
              </div>

              {/* Horizontal Scrollable Cast Cards */}
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {isLoadingCast ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-24 sm:w-28 shrink-0 flex flex-col items-center gap-2 p-2 rounded-xl bg-[#1b1e26] animate-pulse"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#272a34]" />
                      <div className="w-16 h-3 rounded bg-[#272a34]" />
                      <div className="w-12 h-2 rounded bg-[#272a34]" />
                    </div>
                  ))
                ) : cast.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3">No cast details found.</p>
                ) : (
                  cast.map((actor) => (
                    <div
                      key={actor.id}
                      className="w-24 sm:w-28 shrink-0 flex flex-col items-center text-center p-2 rounded-xl bg-[#181a22] hover:bg-[#1f222c] border border-[#262832] transition group"
                    >
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden bg-black shrink-0 border border-white/10 shadow-md">
                        {actor.profile_path ? (
                          <img
                            src={actor.profile_path}
                            alt={actor.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#252834] text-gray-400 font-bold text-base">
                            {actor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white truncate max-w-full mt-2 leading-tight">
                        {actor.name}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate max-w-full mt-0.5">
                        {actor.character}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Synced Group Chat Overlay */}
          <div
            className={`lg:col-span-5 flex flex-col h-[520px] bg-[#14161e] border border-[#252832] rounded-2xl overflow-hidden shadow-lg ${
              activeTab === 'chat' ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Chat Header */}
            <div className="p-3.5 bg-[#1a1c24] border-b border-[#252832] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" />
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Synced Group Chat</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-extrabold text-[9px]">
                      Live
                    </span>
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Room #{room.code} • React & chat in real-time
                  </p>
                </div>
              </div>

              {/* Connected Users Avatars */}
              <div className="flex items-center -space-x-1.5">
                {room.users.slice(0, 4).map((u) => (
                  <img
                    key={u.id}
                    src={u.avatar}
                    alt={u.name}
                    className="w-6 h-6 rounded-full border-2 border-[#1a1c24] bg-gray-800"
                    title={u.name}
                  />
                ))}
                {room.users.length > 4 && (
                  <span className="w-6 h-6 rounded-full bg-[#2a2d38] border-2 border-[#1a1c24] text-[9px] font-bold text-white flex items-center justify-center">
                    +{room.users.length - 4}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Reactions Bar */}
            <div className="px-3 py-1.5 bg-[#161820] border-b border-[#242732] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-gray-400 shrink-0">Vibe:</span>
              {['🍿', '🔥', '😱', '👏', '❤️', '😂', '💀'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendVibe?.(emoji, `Reacted ${emoji} while watching!`)}
                  className="px-2 py-1 rounded-lg bg-[#20232c] hover:bg-[#2c303c] text-sm transition active:scale-90 cursor-pointer"
                  title={`Send ${emoji} reaction to room`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Embed Real-Time Firestore Room Chat */}
            <div className="flex-1 min-h-0">
              <RoomChat room={room} currentUser={currentUser} onSendVibe={onSendVibe} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
