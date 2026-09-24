import React from 'react';
import { ActiveTab, Movie, User } from '../types';
import { Sparkles, Users, LogIn, LogOut, KeyRound, Share2, Film } from 'lucide-react';
import { SearchBarAutocomplete } from './SearchBarAutocomplete';
import { CineMatchLogo } from './CineMatchLogo';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User;
  roomCode?: string;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenJoinRoom?: () => void;
  onOpenLetFindTogether?: () => void;
  hasStartedSwiping?: boolean;
  onCreateNewRoom?: () => void;
  onCopyInviteLink?: () => void;
  onOpenSearch?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddToSwipeDeck?: (movie: Movie) => void;
  onDirectWatchFree?: (movie: Movie) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  roomCode = '1001',
  isLoggedIn = false,
  onOpenAuth,
  onSignOut,
  onOpenJoinRoom,
  onCopyInviteLink,
  onOpenSearch,
  onAddToSwipeDeck,
  onDirectWatchFree,
}) => {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)] transition-all">
      <div className="h-16 max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Title */}
        <div
          className="flex items-center cursor-pointer select-none shrink-0 group"
          onClick={() => setActiveTab('swipe-deck')}
          role="button"
          tabIndex={0}
        >
          <CineMatchLogo size="md" />
        </div>

        {/* Center: Live TMDB Smart Search Bar with High-End Streaming Styling */}
        <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg mx-1 sm:mx-3 relative">
          <SearchBarAutocomplete
            onAddToSwipeDeck={(movie) => {
              if (onAddToSwipeDeck) {
                onAddToSwipeDeck(movie);
              }
            }}
            onWatchOn7Reels={(movie) => {
              if (onDirectWatchFree) {
                onDirectWatchFree(movie);
              } else {
                window.open(
                  `https://7reels.cc/search?q=${encodeURIComponent(movie.title)}`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }
            }}
            onOpenFullSearchOverlay={onOpenSearch}
          />
        </div>

        {/* Desktop Nav Tabs (Visible from md up: tablets, laptops & desktops) */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('swipe-deck')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'swipe-deck'
                ? 'bg-[#E50914] text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Swipe Deck</span>
          </button>

          <button
            onClick={() => setActiveTab('movie-matches')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'movie-matches'
                ? 'bg-[#E50914] text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Matches</span>
          </button>

          <button
            onClick={() => setActiveTab('session-lobby')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'session-lobby'
                ? 'bg-[#E50914] text-white shadow-lg shadow-rose-900/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lobby & Chat</span>
          </button>
        </nav>

        {/* Right: Room Code & Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Room Code Badge */}
          {onOpenJoinRoom && (
            <button
              onClick={onOpenJoinRoom}
              type="button"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 cursor-pointer backdrop-blur-md shadow-sm"
              title="Party Room Code - Click to Switch/Join"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-extrabold text-white text-[11px] sm:text-xs tracking-wider">
                #{roomCode}
              </span>
            </button>
          )}

          {/* Quick Copy Link Button */}
          {onCopyInviteLink && (
            <button
              onClick={onCopyInviteLink}
              type="button"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-1 backdrop-blur-md"
              title="Copy Room Invite Link"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline text-[11px] font-bold text-amber-300">Invite</span>
            </button>
          )}

          {/* User Auth Info */}
          {isLoggedIn ? (
            <div className="flex items-center gap-1.5 bg-white/5 pl-1.5 pr-2 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('user-profile')}
                className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
                title={`Profile: ${currentUser.name}`}
              >
                <img
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-rose-500 shadow-sm"
                  src={currentUser.avatar}
                />
                <span className="hidden sm:inline text-[11px] font-bold text-white max-w-[70px] truncate">
                  {currentUser.name}
                </span>
              </button>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition active:scale-95 shadow-sm backdrop-blur-md cursor-pointer"
              title="Sign in with Google"
            >
              <LogIn className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-medium">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
