import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, saveUserProfileInFirestore, saveRoomSwipeInFirestore } from './firebase';
import { ActiveTab, Movie, RoomFilters, User } from './types';
import { useRoom } from './hooks/useRoom';
import { searchTmdbMovies } from './services/tmdb';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SwipeDeck } from './components/SwipeDeck';
import { SelectGenreLanguage } from './components/SelectGenreLanguage';
import { SessionLobby } from './components/SessionLobby';
import { MovieMatches } from './components/MovieMatches';
import { GenreFilters } from './components/GenreFilters';
import { UserProfile } from './components/UserProfile';
import { WatchModal } from './components/WatchModal';
import { InfoModal } from './components/InfoModal';
import { QrModal } from './components/QrModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { LetFindTogetherModal } from './components/LetFindTogetherModal';
import { AuthModal, PendingAuthAction } from './components/AuthModal';
import { MovieSearchOverlay } from './components/MovieSearchOverlay';
import { CinematicBackgroundShowcase } from './components/CinematicBackgroundShowcase';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('swipe-deck');
  const [hasStartedSwiping, setHasStartedSwiping] = useState(false);
  const [watchModalMovie, setWatchModalMovie] = useState<Movie | null>(null);
  const [infoModalMovie, setInfoModalMovie] = useState<Movie | null>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Search Bar & Direct Filtering State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  // Auth Gate & Firebase State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<PendingAuthAction | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('cinematch_auth_user');
  });

  const {
    room,
    currentUser,
    setCurrentUser,
    availableUsers,
    currentMovie,
    nextMovie,
    thirdMovie,
    matchModalMovie,
    vote,
    rewind,
    updateFilters,
    createCustomRoom,
    toggleUserReady,
    toggleWatchedHistory,
    sendVibe,
    copyInviteLink,
    prioritizeMovieInDeck,
    moviePool,
    createNewRoom,
    joinRoomByCode,
    toastMessage,
    toastIcon,
    showToast,
  } = useRoom();

  // Dynamic Live TMDB Search with Debouncing
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(moviePool.slice(0, 14));
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const results = await searchTmdbMovies(q, 16);
        if (isMounted) {
          setSearchResults(results);
        }
      } catch (err) {
        console.warn('TMDB search overlay error:', err);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, moviePool]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        const authedUser: User = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'CineMatch User',
          username: (user.email?.split('@')[0] || 'user').toLowerCase(),
          avatar:
            user.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          role: 'host',
          isReady: true,
          statusText: 'Signed in with Google',
        };
        setCurrentUser(authedUser);
        localStorage.setItem('cinematch_auth_user', JSON.stringify(authedUser));
        saveUserProfileInFirestore({
          uid: user.uid,
          email: user.email,
          displayName: authedUser.name,
          photoURL: authedUser.avatar,
        });
      }
    });

    return () => unsubscribe();
  }, [setCurrentUser]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    localStorage.removeItem('cinematch_auth_user');
    setIsLoggedIn(false);
    showToast('Signed out from CineMatch', 'logout');
  };

  // Direct 7Reels Watch Stream Redirect
  const handleDirectWatchFree = (movie: Movie) => {
    const targetUrl = `https://7reels.cc/search?q=${encodeURIComponent(movie.title)}`;
    showToast(`Opening 7reels.cc for "${movie.title}"... 🍿`, 'open_in_new');
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAuthSuccess = (user: User, action: PendingAuthAction | null) => {
    setIsLoggedIn(true);
    setCurrentUser(user);

    if (action) {
      setPendingAuthAction(null);
      if (action.type === 'redirect') {
        const targetUrl = `https://7reels.cc/search?q=${encodeURIComponent(action.movie.title)}`;
        showToast(`Redirecting to 7reels.cc for "${action.movie.title}"...`, 'open_in_new');
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleVote = (type: 'like' | 'pass' | 'super') => {
    const isConsensusMatch = vote(type);
    if (currentMovie) {
      saveRoomSwipeInFirestore(
        room.code,
        currentUser.id,
        type,
        currentMovie.title,
        room.matches.length
      );
    }
    if (isConsensusMatch) {
      setTimeout(() => {
        setActiveTab('movie-matches');
      }, 350);
    }
  };

  const handleInviteFriend = () => {
    copyInviteLink();
  };

  const handleAiCreateRoom = (customCode?: string, customFilters?: Partial<RoomFilters>) => {
    createCustomRoom(customCode, customFilters);
    setHasStartedSwiping(false);
    setActiveTab('swipe-deck');
    showToast('LET FIND TOGETHER configured your new room!', 'auto_awesome');
  };

  const handleSwipeThisMovie = (movie: Movie) => {
    setIsSearchOpen(false);
    setHasStartedSwiping(true);
    prioritizeMovieInDeck(movie);
  };

  const handleDirectStreamFromSearch = (movie: Movie) => {
    handleDirectWatchFree(movie);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-900 text-slate-100 flex flex-col font-sans antialiased selection:bg-[#e50914] selection:text-white relative">
      {/* Floating Glass Navbar Header with live TMDB search autocomplete and Room Code */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        isLoggedIn={isLoggedIn}
        roomCode={room.code}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
        onOpenLetFindTogether={() => setIsAiChatOpen(true)}
        hasStartedSwiping={hasStartedSwiping}
        onCreateNewRoom={createNewRoom}
        onCopyInviteLink={copyInviteLink}
        onOpenSearch={() => setIsSearchOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim()) {
            setIsSearchOpen(true);
          }
        }}
        onAddToSwipeDeck={(movie) => handleSwipeThisMovie(movie)}
        onDirectWatchFree={(movie) => handleDirectWatchFree(movie)}
      />

      {/* Dynamic Ambient Background Showcase: Top Movies, New Releases 2024 & Viral Series */}
      <div className="pt-16 w-full">
        <CinematicBackgroundShowcase
          onAddToSwipeDeck={(movie) => {
            setHasStartedSwiping(true);
            prioritizeMovieInDeck(movie);
            showToast(`Added "${movie.title}" to Swipe Deck! 🎬`, 'style');
          }}
          onDirectWatchFree={(movie) => handleDirectWatchFree(movie)}
          onOpenInfo={(movie) => setInfoModalMovie(movie)}
          activeTab={activeTab}
        />
      </div>

      {/* Main Content View */}
      <main className="flex-1 w-full pt-2 pb-28 md:pb-14 flex flex-col items-center relative z-10 px-2 sm:px-4">
        {/* Screen 1: Preferences (Select Genre & Language) */}
        {activeTab === 'swipe-deck' && !hasStartedSwiping && (
          <SelectGenreLanguage
            roomCode={room.code}
            filters={room.filters}
            onUpdateFilters={updateFilters}
            onStartSwiping={() => {
              setHasStartedSwiping(true);
              showToast('Preferences set! Swipe deck unlocked 🎬', 'movie');
            }}
            onOpenLetFindTogether={() => setIsAiChatOpen(true)}
          />
        )}

        {/* Screen 2: Swipe Deck */}
        {activeTab === 'swipe-deck' && hasStartedSwiping && (
          <SwipeDeck
            currentMovie={currentMovie}
            nextMovie={nextMovie}
            thirdMovie={thirdMovie}
            room={room}
            onVote={handleVote}
            onRewind={rewind}
            onOpenInfo={(m) => setInfoModalMovie(m)}
            onChangePreferences={() => setHasStartedSwiping(false)}
            onDirectWatchFree={(m) => handleDirectWatchFree(m)}
            onSendVibe={sendVibe}
            onCopyInviteLink={copyInviteLink}
            onOpenQR={() => setIsQrOpen(true)}
            onOpenLetFindTogether={() => setIsAiChatOpen(true)}
            onOpenMatchesTab={() => setActiveTab('movie-matches')}
          />
        )}

        {/* Session Lobby */}
        {activeTab === 'session-lobby' && (
          <SessionLobby
            room={room}
            currentUser={currentUser}
            onEditRules={() => {
              setHasStartedSwiping(false);
              setActiveTab('swipe-deck');
            }}
            onCopyCode={copyInviteLink}
            onOpenQR={() => setIsQrOpen(true)}
            onInviteFriend={handleInviteFriend}
            onToggleReady={toggleUserReady}
            onSendVibe={sendVibe}
            onStartSession={() => {
              setHasStartedSwiping(true);
              setActiveTab('swipe-deck');
            }}
            onJoinRoomCode={(code) => joinRoomByCode(code)}
            onOpenLetFindTogether={() => setIsAiChatOpen(true)}
            onCreateNewRoom={createNewRoom}
          />
        )}

        {/* Screen 4: Matches & Direct Play */}
        {activeTab === 'movie-matches' && (
          <MovieMatches
            room={room}
            matchedMovie={matchModalMovie || currentMovie}
            onOpenWatch={(m) => setWatchModalMovie(m)}
            onKeepSwiping={() => {
              setHasStartedSwiping(true);
              setActiveTab('swipe-deck');
            }}
            onToggleWatched={toggleWatchedHistory}
            onDirectWatchFree={(m) => handleDirectWatchFree(m)}
            onCopyInviteLink={copyInviteLink}
          />
        )}

        {/* Filters */}
        {activeTab === 'genre-filters' && (
          <GenreFilters
            roomCode={room.code}
            filters={room.filters}
            onUpdateFilters={updateFilters}
            onStartSession={() => {
              setHasStartedSwiping(true);
              setActiveTab('swipe-deck');
            }}
          />
        )}

        {/* User Profile */}
        {activeTab === 'user-profile' && (
          <UserProfile
            currentUser={currentUser}
            onSwitchUser={setCurrentUser}
            availableUsers={availableUsers}
            onShowToast={showToast}
          />
        )}

        {/* AI Concierge Embedded */}
        {activeTab === 'let-find-together' && (
          <div className="w-full px-2 sm:px-4 py-3">
            <LetFindTogetherModal
              isOpen={true}
              onClose={() => setActiveTab('swipe-deck')}
              room={room}
              currentUser={currentUser}
              onCreateRoom={handleAiCreateRoom}
              onUpdateFilters={updateFilters}
              onStartSwiping={() => {
                setHasStartedSwiping(true);
                setActiveTab('swipe-deck');
              }}
              isEmbeddedView={true}
            />
          </div>
        )}
      </main>

      {/* Screen 3: Movie Search Overlay */}
      {isSearchOpen && (
        <MovieSearchOverlay
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={() => setIsSearchOpen(false)}
          searchResults={searchResults}
          onSwipeThisMovie={handleSwipeThisMovie}
          onDirectStream7Reels={handleDirectStreamFromSearch}
          selectedGenres={room.filters.genres}
          selectedLanguages={room.filters.languages}
        />
      )}

      {/* Fixed Bottom Glass Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        matchesCount={room.matches.length}
        onOpenLetFindTogether={() => setIsAiChatOpen(true)}
      />

      {/* Global AI Concierge Modal */}
      <LetFindTogetherModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        room={room}
        currentUser={currentUser}
        onCreateRoom={handleAiCreateRoom}
        onUpdateFilters={updateFilters}
        onStartSwiping={() => {
          setHasStartedSwiping(true);
          setActiveTab('swipe-deck');
        }}
      />

      {/* Watch Modal with 7Reels Direct Option */}
      {watchModalMovie && (
        <WatchModal
          movie={watchModalMovie}
          onClose={() => setWatchModalMovie(null)}
          onDirectWatchFree={(m) => handleDirectWatchFree(m)}
        />
      )}

      {/* Firebase Auth Gate Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        pendingAction={pendingAuthAction}
        onAuthSuccess={handleAuthSuccess}
        showToast={showToast}
      />

      <InfoModal
        movie={infoModalMovie}
        onClose={() => setInfoModalMovie(null)}
        onOpenWatch={(m) => setWatchModalMovie(m)}
      />

      {isQrOpen && (
        <QrModal
          roomCode={room.code}
          onClose={() => setIsQrOpen(false)}
          onCopy={copyInviteLink}
        />
      )}

      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        currentRoomCode={room.code}
        onJoinRoom={(code) => joinRoomByCode(code)}
        onCopyInviteLink={copyInviteLink}
        onCreateNewRoom={createNewRoom}
      />

      {/* Floating Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900/90 text-white text-xs font-semibold shadow-2xl border border-white/15 backdrop-blur-xl animate-in fade-in slide-in-from-top-3">
          {toastIcon && (
            <span
              className="material-symbols-outlined text-[17px] text-emerald-400"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {toastIcon}
            </span>
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
