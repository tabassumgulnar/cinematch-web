import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, User, Movie, RoomFilters, ActiveTab, WatchPartyPlaybackState, VoiceParticipant } from '../types';
import { CURRENT_USER } from '../data/mockRoom';
import { INITIAL_MOVIES } from '../data/movies';
import { fetchTrendingMovies } from '../services/tmdb';
import {
  generateRandomRoomId,
  saveRoomToFirestore,
  subscribeToRoomInFirestore,
  updateRoomWatchPartyInFirestore,
} from '../firebase';
import confetti from 'canvas-confetti';

/**
 * Generate or retrieve a persistent distinct user profile for this browser device.
 * Prevents identical peer IDs and collision when two tabs/devices test WebRTC.
 */
function getOrCreateSessionUser(): User {
  if (typeof window === 'undefined') return CURRENT_USER;
  try {
    const cached = localStorage.getItem('cinematch_session_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}

  const urlParams = new URLSearchParams(window.location.search);
  const isJoiningExistingRoom = Boolean(urlParams.get('room'));

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const guestAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  ];
  const guestNames = ['Sam K.', 'Jordan M.', 'Taylor P.', 'Casey B.', 'Morgan D.', 'Riley C.', 'Jamie L.'];
  const name = isJoiningExistingRoom
    ? guestNames[Math.floor(Math.random() * guestNames.length)]
    : 'Alex Rivera';
  const role: 'host' | 'member' = isJoiningExistingRoom ? 'member' : 'host';
  const userId = `usr_${Date.now().toString(36)}_${randomSuffix}`;

  const user: User = {
    id: userId,
    name,
    username: `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomSuffix}`,
    avatar: isJoiningExistingRoom
      ? guestAvatars[Math.floor(Math.random() * guestAvatars.length)]
      : CURRENT_USER.avatar,
    role,
    isReady: true,
    statusText: isJoiningExistingRoom ? 'Joined watch party' : 'Ready to swipe',
  };

  try {
    localStorage.setItem('cinematch_session_user', JSON.stringify(user));
  } catch {}

  return user;
}

export function useRoom() {
  const [currentUser, setCurrentUser] = useState<User>(getOrCreateSessionUser);

  // Initialize room with dynamic random Room ID (e.g. ROOM_482910) or URL param
  const [room, setRoom] = useState<Room>(() => {
    const sessionUser = getOrCreateSessionUser();
    let initialCode = generateRandomRoomId();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom && urlRoom.trim()) {
        initialCode = urlRoom.trim().toUpperCase().replace('#', '');
      }
    }
    return {
      id: `room-${initialCode}`,
      code: initialCode,
      hostId: sessionUser.id,
      filters: {
        genres: ['Action', 'Comedy', 'Horror', 'Sci-Fi'],
        languages: ['Hindi', 'English', 'South Indian (Telugu/Tamil)'],
        minRating: 7.5,
        runtimeRange: '90 - 120m',
      },
      users: [sessionUser],
      votes: {},
      matches: [],
      matchHistory: [],
      status: 'lobby',
      currentMovieIndex: 0,
      vibe: {
        emoji: '🍿',
        text: 'Room ready! Popcorn is salted, invite friends to join.',
        author: sessionUser.name,
        timestamp: Date.now(),
      },
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('swipe-deck');
  const [cardIndex, setCardIndex] = useState(0);
  const [prioritizedMovie, setPrioritizedMovie] = useState<Movie | null>(null);
  const [moviePool, setMoviePool] = useState<Movie[]>(INITIAL_MOVIES);
  const [lastAction, setLastAction] = useState<'like' | 'pass' | 'super' | null>(null);
  const [matchModalMovie, setMatchModalMovie] = useState<Movie | null>(null);
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);

  // Load real-time trending movies from TMDB API on mount
  useEffect(() => {
    let isCancelled = false;
    async function loadLiveTmdb() {
      try {
        const liveMovies = await fetchTrendingMovies();
        if (!isCancelled && liveMovies && liveMovies.length > 0) {
          setMoviePool((prev) => {
            const liveIds = new Set(liveMovies.map((m) => m.id));
            const existingRemaining = prev.filter((m) => !liveIds.has(m.id));
            return [...liveMovies, ...existingRemaining];
          });
        }
      } catch (err) {
        console.warn('Could not fetch live TMDB movies:', err);
      }
    }
    loadLiveTmdb();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Watch Party & Real-time Voice Call States
  const [watchPartyMovie, setWatchPartyMovie] = useState<Movie | null>(null);
  const [watchPartyState, setWatchPartyState] = useState<WatchPartyPlaybackState | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>(() =>
    room.users.map((u) => ({
      userId: u.id,
      name: u.name,
      avatar: u.avatar,
      isMuted: false,
      isSpeaking: false,
      connectionQuality: 'excellent',
    }))
  );
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isVoiceDeafened, setIsVoiceDeafened] = useState(false);
  const [activeReactions, setActiveReactions] = useState<
    Array<{ id: string; emoji: string; userName: string; timestamp: number }>
  >([]);
  const [webRtcSignalData, setWebRtcSignalData] = useState<{
    targetUserId?: string;
    signal: any;
    fromUserId: string;
    fromUserName: string;
    timestamp: number;
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);

  // Trigger celebration confetti
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e50914', '#4edea3', '#f1c111', '#ffffff'],
      });
    } catch {
      // safe fallback if canvas is restricted
    }
  }, []);

  const showToast = useCallback((message: string, icon: string = 'check_circle') => {
    setToast({ message, icon });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 2500);
  }, []);

  // Filter movies based on room preferences (Genre + Language + Min Rating) over dynamic TMDB moviePool
  // If no preferences are selected yet (or if filters produce 0 matches), trending TMDB movies are served so swipe deck is never empty.
  const filteredMovies = (() => {
    const currentPool = moviePool.length > 0 ? moviePool : INITIAL_MOVIES;
    const hasGenrePreferences = Boolean(room.filters.genres && room.filters.genres.length > 0);
    const hasLanguagePreferences = Boolean(room.filters.languages && room.filters.languages.length > 0);
    const hasSpecificPreferences = hasGenrePreferences || hasLanguagePreferences;

    // If no preferences are selected yet, return the live trending movie pool directly
    if (!hasSpecificPreferences) {
      return currentPool;
    }

    const list = currentPool.filter((m) => {
      const matchesGenre =
        !hasGenrePreferences ||
        m.genres.some((g) => room.filters.genres.includes(g));

      const matchesLanguage =
        !hasLanguagePreferences ||
        m.languages.some((l) =>
          room.filters.languages.some(
            (selected) =>
              l.toLowerCase().includes(selected.toLowerCase()) ||
              selected.toLowerCase().includes(l.toLowerCase())
          )
        );

      const matchesRating = m.imdbRating >= (room.filters.minRating || 7.0) - 1.2;
      return matchesGenre && matchesLanguage && matchesRating;
    });

    if (list.length > 0) return list;

    // Soft fallback if exact criteria produced 0 matches
    const softList = currentPool.filter((m) => {
      const matchesGenre =
        hasGenrePreferences && room.filters.genres.some((g) => m.genres.includes(g));
      const matchesLanguage =
        hasLanguagePreferences &&
        m.languages.some((l) =>
          room.filters.languages.some(
            (selected) =>
              l.toLowerCase().includes(selected.toLowerCase()) ||
              selected.toLowerCase().includes(l.toLowerCase())
          )
        );
      return matchesGenre || matchesLanguage;
    });

    // Never return an empty list; fall back to the dynamic TMDB trending pool or default catalog
    return softList.length > 0 ? softList : currentPool;
  })();

  const activeDeckMovies = (() => {
    const base = filteredMovies.length > 0 ? filteredMovies : (moviePool.length > 0 ? moviePool : INITIAL_MOVIES);
    if (!prioritizedMovie) return base;
    return [prioritizedMovie, ...base.filter((m) => m.id !== prioritizedMovie.id)];
  })();

  // Robust circular card indexing ensuring currentMovie is always defined and swipe deck is never empty
  const safeCardIndex = activeDeckMovies.length > 0 ? cardIndex % activeDeckMovies.length : 0;
  const currentMovie =
    activeDeckMovies[safeCardIndex] ||
    activeDeckMovies[0] ||
    moviePool[0] ||
    INITIAL_MOVIES[0];
  const nextMovie = activeDeckMovies.length > 1
    ? activeDeckMovies[(safeCardIndex + 1) % activeDeckMovies.length]
    : activeDeckMovies[0] || currentMovie;
  const thirdMovie = activeDeckMovies.length > 2
    ? activeDeckMovies[(safeCardIndex + 2) % activeDeckMovies.length]
    : activeDeckMovies[0] || currentMovie;
  const availableUsers = room.users;

  // Initialize WebSocket connection
  useEffect(() => {
    isMountedRef.current = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: room.code,
            payload: { user: currentUser },
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_UPDATED' && data.room) {
            setRoom(data.room);
          } else if (data.type === 'MATCH_FOUND') {
            setRoom(data.room);
            const foundMovie =
              moviePool.find((m) => m.id === data.movieId) ||
              INITIAL_MOVIES.find((m) => m.id === data.movieId) ||
              data.movie;
            if (foundMovie) {
              setMatchModalMovie(foundMovie);
              triggerConfetti();
            }
          } else if (data.type === 'VIBE_SHARED') {
            setRoom(data.room);
            showToast(`${data.vibe.author}: ${data.vibe.emoji} ${data.vibe.text}`, 'celebration');
          } else if (data.type === 'SESSION_STARTED') {
            setRoom(data.room);
            setActiveTab('swipe-deck');
            showToast('Host launched swiping session! 🍿', 'local_fire_department');
          } else if (data.type === 'WATCH_PARTY_STARTED') {
            setRoom(data.room);
            setWatchPartyMovie(data.movie);
            setWatchPartyState(data.watchParty);
            setActiveTab('watch-party');
            showToast(`Watch Party started for "${data.movie?.title}"! 🍿`, 'movie');
          } else if (data.type === 'WATCH_PARTY_SYNCED') {
            setWatchPartyState(data.watchParty);
          } else if (data.type === 'VOICE_STATE_UPDATED') {
            setVoiceParticipants((prev) =>
              prev.map((p) =>
                p.userId === data.userId
                  ? { ...p, isMuted: data.isMuted, isSpeaking: data.isSpeaking }
                  : p
              )
            );
          } else if (data.type === 'WATCH_PARTY_REACTION_RECEIVED') {
            const reactionItem = {
              id: data.id,
              emoji: data.emoji,
              userName: data.userName,
              timestamp: data.timestamp,
            };
            setActiveReactions((prev) => [...prev.slice(-6), reactionItem]);
            setTimeout(() => {
              setActiveReactions((prev) => prev.filter((r) => r.id !== reactionItem.id));
            }, 3500);
          } else if (data.type === 'WATCH_PARTY_SCREEN_SHARE_UPDATED') {
            setWatchPartyState((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                screenShare: data.isSharing
                  ? {
                      isSharing: true,
                      presenterId: data.presenterId,
                      presenterName: data.presenterName,
                      streamUrl: data.streamUrl,
                      startedAt: Date.now(),
                    }
                  : undefined,
              };
            });
            if (data.isSharing) {
              showToast(`${data.presenterName} is sharing movie screen live! 🎬`, 'live_tv');
            } else {
              showToast(`${data.presenterName} stopped screen sharing`, 'info');
            }
          } else if (data.type === 'WEBRTC_SIGNAL_RECEIVED') {
            setWebRtcSignalData({
              targetUserId: data.targetUserId,
              signal: data.signal,
              fromUserId: data.fromUserId,
              fromUserName: data.fromUserName,
              timestamp: Date.now(),
            });
          } else if (data.type === 'WATCH_PARTY_ENDED') {
            setRoom(data.room);
            setWatchPartyMovie(null);
            setWatchPartyState(null);
            setActiveTab('movie-matches');
            showToast('Watch party concluded', 'info');
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      socket.onerror = () => {
        // Fallback gracefully without breaking UI
      };
    } catch {
      // Local fallback mode works 100%
    }

    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [room.code, currentUser.id, triggerConfetti, showToast]);

  // Keep URL query parameter updated and sync real-time changes with Firestore
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== room.code) {
        url.searchParams.set('room', room.code);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}

    // Listen for Firestore updates from other participants in this isolated room
    const unsubscribe = subscribeToRoomInFirestore(room.code, (firestoreRoom) => {
      if (!firestoreRoom) {
        // Room does not exist yet in Firestore, save initial room state
        saveRoomToFirestore(room);
        return;
      }

      // Ensure current user is recorded in remote room users
      const remoteUsers = firestoreRoom.users || [];
      const userExists = remoteUsers.some((u) => u.id === currentUser.id);
      const mergedUsers = userExists ? remoteUsers : [...remoteUsers, currentUser];

      if (!userExists) {
        // Automatically register current user to Firestore room
        saveRoomToFirestore({
          ...room,
          ...firestoreRoom,
          users: mergedUsers,
        });
      }

      setRoom((prev) => {
        const mergedVotes = { ...prev.votes, ...(firestoreRoom.votes || {}) };
        const mergedMatches = Array.from(
          new Set([...(prev.matches || []), ...(firestoreRoom.matches || [])])
        );

        return {
          ...prev,
          ...firestoreRoom,
          users: mergedUsers,
          votes: mergedVotes,
          matches: mergedMatches,
        };
      });

      if (firestoreRoom.watchParty) {
        setWatchPartyState(firestoreRoom.watchParty);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [room.code, currentUser]);

  // Vote handler
  const handleVote = useCallback(
    (voteType: 'like' | 'pass' | 'super'): boolean => {
      const activeMovie = currentMovie;
      if (!activeMovie) return false;

      setLastAction(voteType);
      let isUnanimousMatch = false;

      // Local optimistic update
      setRoom((prev) => {
        const votes = { ...prev.votes };
        if (!votes[activeMovie.id]) {
          votes[activeMovie.id] = {
            movieId: activeMovie.id,
            likedBy: [],
            passedBy: [],
            superlikedBy: [],
          };
        }

        const voteRecord = { ...votes[activeMovie.id] };
        if (voteType === 'like' || voteType === 'super') {
          if (!voteRecord.likedBy.includes(currentUser.id)) {
            voteRecord.likedBy.push(currentUser.id);
          }
          if (voteType === 'super' && !voteRecord.superlikedBy.includes(currentUser.id)) {
            voteRecord.superlikedBy.push(currentUser.id);
          }
        } else {
          if (!voteRecord.passedBy.includes(currentUser.id)) {
            voteRecord.passedBy.push(currentUser.id);
          }
        }
        votes[activeMovie.id] = voteRecord;

        // Check unanimous match: all users in room have liked it
        const isMatch =
          prev.users.length > 0 &&
          prev.users.every((u) => voteRecord.likedBy.includes(u.id));

        if (isMatch) {
          isUnanimousMatch = true;
        }

        const updatedMatches = isMatch && !prev.matches.includes(activeMovie.id)
          ? [activeMovie.id, ...prev.matches]
          : prev.matches;

        const updatedHistory = isMatch
          ? [
              {
                id: `h-${Date.now()}`,
                movieId: activeMovie.id,
                title: activeMovie.title,
                year: activeMovie.year,
                rating: activeMovie.imdbRating,
                genreText: activeMovie.genres.join(' • ') + ' • ' + activeMovie.year,
                posterUrl: activeMovie.posterUrl,
                matchedAt: 'Just now',
                watched: false,
              },
              ...prev.matchHistory,
            ]
          : prev.matchHistory;

        if (isMatch) {
          setMatchModalMovie(activeMovie);
          triggerConfetti();
        }

        return {
          ...prev,
          votes,
          matches: updatedMatches,
          matchHistory: updatedHistory,
          status: isMatch ? 'matched' : prev.status,
        };
      });

      // Send to WebSocket server
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'VOTE',
            roomCode: room.code,
            payload: {
              movieId: activeMovie.id,
              vote: voteType,
              movieDetails: activeMovie,
              userId: currentUser.id,
            },
          })
        );
      }

      // Advance deck
      setCardIndex((prev) => (prev + 1) % filteredMovies.length);
      return isUnanimousMatch;
    },
    [currentMovie, currentUser.id, filteredMovies.length, room.code, triggerConfetti]
  );

  const rewindVote = useCallback(() => {
    if (cardIndex > 0) {
      setCardIndex((prev) => prev - 1);
      showToast('Undid previous swipe', 'replay');
    }
  }, [cardIndex, showToast]);

  const updateFilters = useCallback(
    (newFilters: Partial<RoomFilters>) => {
      setRoom((prev) => {
        const updated = {
          ...prev,
          filters: { ...prev.filters, ...newFilters },
        };

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'UPDATE_FILTERS',
              roomCode: prev.code,
              payload: { filters: newFilters },
            })
          );
        }
        return updated;
      });
      setCardIndex(0);
      showToast('Preferences updated! Discovery refreshed.', 'tune');
    },
    [showToast]
  );

  const sendVibe = useCallback(
    (emoji: string, text: string) => {
      const vibePayload = {
        emoji,
        text,
        author: currentUser.name,
        timestamp: Date.now(),
      };

      setRoom((prev) => ({
        ...prev,
        vibe: vibePayload,
      }));

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'SEND_VIBE',
            roomCode: room.code,
            payload: vibePayload,
          })
        );
      }
      showToast(`Shared vibe: ${emoji}`, 'celebration');
    },
    [currentUser.name, room.code, showToast]
  );

  const toggleReady = useCallback(
    (userId: string) => {
      setRoom((prev) => {
        const users = prev.users.map((u) =>
          u.id === userId ? { ...u, isReady: !u.isReady } : u
        );
        return { ...prev, users };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'TOGGLE_READY',
            roomCode: room.code,
            payload: { userId },
          })
        );
      }
    },
    [room.code]
  );

  const toggleWatchedHistory = useCallback(
    (historyId: string) => {
      setRoom((prev) => {
        const matchHistory = prev.matchHistory.map((item) =>
          item.id === historyId ? { ...item, watched: !item.watched } : item
        );
        return { ...prev, matchHistory };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'TOGGLE_WATCHED',
            roomCode: room.code,
            payload: { historyId },
          })
        );
      }
    },
    [room.code]
  );

  const prioritizeMovieInDeck = useCallback(
    (movie: Movie) => {
      setMoviePool((prev) => {
        const without = prev.filter((m) => m.id !== movie.id);
        return [movie, ...without];
      });
      setPrioritizedMovie(movie);
      setCardIndex(0);
      setActiveTab('swipe-deck');
      showToast(`Brought "${movie.title}" to front of deck! 🎬`, 'local_fire_department');
    },
    [showToast]
  );

  const copyInviteLink = useCallback(() => {
    const inviteUrl = `${window.location.origin}/?room=${room.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
    }
    showToast(`Copied Room #${room.code} invite link! 🍿`, 'content_copy');
  }, [room.code, showToast]);

  const startSwipingTogether = useCallback(() => {
    setRoom((prev) => ({ ...prev, status: 'swiping' }));
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'START_SESSION',
          roomCode: room.code,
        })
      );
    }
    setActiveTab('swipe-deck');
    showToast('Swiping session initiated for crew!', 'local_fire_department');
  }, [room.code, showToast]);

  const createNewRoom = useCallback(() => {
    const newCode = generateRandomRoomId();
    const newRoom: Room = {
      id: `room-${newCode}`,
      code: newCode,
      hostId: currentUser.id,
      filters: {
        genres: ['Action', 'Comedy', 'Horror', 'Sci-Fi'],
        languages: ['Hindi', 'English', 'South Indian (Telugu/Tamil)'],
        minRating: 7.5,
        runtimeRange: '90 - 120m',
      },
      users: [{ ...currentUser, role: 'host', isReady: true }],
      votes: {},
      matches: [],
      matchHistory: [],
      status: 'lobby',
      currentMovieIndex: 0,
      vibe: {
        emoji: '🍿',
        text: 'New room created! Popcorn is salted, invite friends to join.',
        author: currentUser.name,
        timestamp: Date.now(),
      },
    };

    setRoom(newRoom);
    setCardIndex(0);
    saveRoomToFirestore(newRoom);

    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', newCode);
      window.history.pushState({}, '', newUrl.toString());
    } catch {}

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode: newCode,
          payload: { user: currentUser },
        })
      );
    }

    showToast(`Created new Room #${newCode}!`, 'add_circle');
    return newRoom;
  }, [currentUser, showToast]);

  const createCustomRoom = useCallback(
    (customCode?: string, customFilters?: Partial<RoomFilters>) => {
      const code = customCode || generateRandomRoomId();
      const newFilters: RoomFilters = {
        genres: customFilters?.genres || ['Action', 'Comedy', 'Horror'],
        languages: customFilters?.languages || ['Hindi', 'English'],
        minRating: customFilters?.minRating || 7.5,
        runtimeRange: customFilters?.runtimeRange || '90 - 120m',
      };
      const newRoom: Room = {
        id: `room-${code}`,
        code,
        hostId: currentUser.id,
        filters: newFilters,
        users: [{ ...currentUser, role: 'host', isReady: true }],
        votes: {},
        matches: [],
        matchHistory: [],
        status: 'lobby',
        currentMovieIndex: 0,
        vibe: {
          emoji: '✨',
          text: `Room #${code} created with LET FIND TOGETHER`,
          author: 'LET FIND TOGETHER AI',
          timestamp: Date.now(),
        },
      };

      setRoom(newRoom);
      setCardIndex(0);
      saveRoomToFirestore(newRoom);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: code,
            payload: { user: currentUser },
          })
        );
      }

      showToast(`Created & entered Room #${code}!`, 'celebration');
      return newRoom;
    },
    [currentUser, showToast]
  );

  // Sync voice participants with current room roster
  useEffect(() => {
    setVoiceParticipants((prev) => {
      const map = new Map(prev.map((p) => [p.userId, p]));
      return room.users.map((u) => {
        const existing = map.get(u.id);
        return (
          existing || {
            userId: u.id,
            name: u.name,
            avatar: u.avatar,
            isMuted: false,
            isSpeaking: false,
            connectionQuality: 'excellent',
          }
        );
      });
    });
  }, [room.users]);

  // Join any existing or new room by code
  const joinRoomByCode = useCallback(
    (codeToJoin: string) => {
      const cleanCode = codeToJoin.trim().toUpperCase().replace('#', '');
      if (!cleanCode) return;

      // Update URL query parameter
      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', cleanCode);
        window.history.pushState({}, '', newUrl.toString());
      } catch (e) {
        // fallback
      }

      setRoom((prev) => ({
        ...prev,
        code: cleanCode,
        id: `room-${cleanCode}`,
        users: prev.users.some((u) => u.id === currentUser.id)
          ? prev.users
          : [...prev.users, currentUser],
        votes: {},
        matches: [],
      }));

      setCardIndex(0);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: cleanCode,
            payload: { user: currentUser },
          })
        );
      }

      showToast(`Connected to Room #${cleanCode}! Share this code with friends.`, 'meeting_room');
    },
    [currentUser, showToast]
  );

  // Auto-join room from URL search parameter e.g. ?room=1234
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl && roomFromUrl !== room.code) {
      joinRoomByCode(roomFromUrl);
    }
  }, [joinRoomByCode, room.code]);

  const startWatchParty = useCallback(
    (movie: Movie) => {
      setWatchPartyMovie(movie);
      const initialPartyState: WatchPartyPlaybackState = {
        movieId: movie.id,
        movieTitle: movie.title,
        moviePoster: movie.posterUrl,
        isPlaying: true,
        currentTime: 0,
        duration: 180,
        lastUpdatedBy: currentUser.name,
        updatedAt: Date.now(),
      };
      setWatchPartyState(initialPartyState);
      setActiveTab('watch-party');

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'WATCH_PARTY_START',
            roomCode: room.code,
            payload: { movie, initiator: currentUser },
          })
        );
      }
      showToast(`Started Watch Party for "${movie.title}"! 🍿`, 'movie');
    },
    [currentUser, room.code, showToast]
  );

  const syncWatchParty = useCallback(
    (isPlaying: boolean, currentTime: number, duration?: number) => {
      setWatchPartyState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isPlaying,
          currentTime,
          duration: duration || prev.duration,
          lastUpdatedBy: currentUser.name,
          updatedAt: Date.now(),
        };
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'WATCH_PARTY_SYNC',
            roomCode: room.code,
            payload: { isPlaying, currentTime, duration, initiator: currentUser },
          })
        );
      }
    },
    [currentUser, room.code]
  );

  const toggleVoiceMute = useCallback(() => {
    setIsVoiceMuted((prev) => {
      const next = !prev;
      setVoiceParticipants((participants) =>
        participants.map((p) =>
          p.userId === currentUser.id
            ? { ...p, isMuted: next, isSpeaking: next ? false : p.isSpeaking }
            : p
        )
      );

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'VOICE_STATE_CHANGE',
            roomCode: room.code,
            payload: { userId: currentUser.id, isMuted: next, isSpeaking: false },
          })
        );
      }
      showToast(next ? 'Microphone muted' : 'Microphone unmuted', next ? 'mic_off' : 'mic');
      return next;
    });
  }, [currentUser.id, room.code, showToast]);

  const updateVoiceSpeakingState = useCallback(
    (isSpeaking: boolean) => {
      setVoiceParticipants((participants) =>
        participants.map((p) =>
          p.userId === currentUser.id ? { ...p, isSpeaking } : p
        )
      );

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'VOICE_STATE_CHANGE',
            roomCode: room.code,
            payload: { userId: currentUser.id, isMuted: isVoiceMuted, isSpeaking },
          })
        );
      }
    },
    [currentUser.id, isVoiceMuted, room.code]
  );

  const toggleVoiceSpeaker = useCallback(() => {
    setIsVoiceDeafened((prev) => {
      const next = !prev;
      showToast(
        next ? 'Speakers deafened / audio muted' : 'Audio sound restored',
        next ? 'volume_off' : 'volume_up'
      );
      return next;
    });
  }, [showToast]);

  const sendWatchPartyReaction = useCallback(
    (emoji: string) => {
      const reactionItem = {
        id: `react-${Date.now()}-${Math.random()}`,
        emoji,
        userName: currentUser.name,
        timestamp: Date.now(),
      };
      setActiveReactions((prev) => [...prev.slice(-6), reactionItem]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reactionItem.id));
      }, 3500);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'WATCH_PARTY_REACTION',
            roomCode: room.code,
            payload: { userId: currentUser.id, userName: currentUser.name, emoji },
          })
        );
      }
    },
    [currentUser.id, currentUser.name, room.code]
  );

  const leaveWatchParty = useCallback(() => {
    setWatchPartyMovie(null);
    setWatchPartyState(null);
    setActiveTab('movie-matches');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'WATCH_PARTY_LEAVE',
          roomCode: room.code,
          payload: { userId: currentUser.id },
        })
      );
    }
    showToast('Left Watch Party', 'exit_to_app');
  }, [currentUser.id, room.code, showToast]);

  const broadcastScreenShare = useCallback(
    (isSharing: boolean, streamUrl?: string) => {
      const screenShareData = isSharing
        ? {
            isSharing: true,
            presenterId: currentUser.id,
            presenterName: currentUser.name,
            streamUrl,
            startedAt: Date.now(),
          }
        : undefined;

      setWatchPartyState((prev) => {
        if (!prev) return null;
        const nextState = {
          ...prev,
          screenShare: screenShareData,
        };
        // Also persist watch party screen share update to Firestore
        updateRoomWatchPartyInFirestore(room.code, nextState).catch(() => {});
        return nextState;
      });

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'WATCH_PARTY_SCREEN_SHARE',
            roomCode: room.code,
            payload: {
              isSharing,
              presenterId: currentUser.id,
              presenterName: currentUser.name,
              streamUrl,
            },
          })
        );
      }
    },
    [currentUser.id, currentUser.name, room.code]
  );

  const sendWebRtcSignal = useCallback(
    (targetUserId: string, signal: any) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'WEBRTC_SIGNAL',
            roomCode: room.code,
            payload: {
              targetUserId,
              signal,
              fromUserId: currentUser.id,
              fromUserName: currentUser.name,
            },
          })
        );
      }
    },
    [currentUser.id, currentUser.name, room.code]
  );

  return {
    currentUser,
    setCurrentUser,
    room,
    setRoom,
    activeTab,
    setActiveTab,
    filteredMovies,
    currentMovie,
    nextMovie,
    thirdMovie,
    availableUsers,
    cardIndex,
    lastAction,
    matchModalMovie,
    setMatchModalMovie,
    vote: handleVote,
    rewind: rewindVote,
    updateFilters,
    createCustomRoom,
    sendVibe,
    toggleUserReady: toggleReady,
    toggleWatchedHistory,
    startSwipingTogether,
    copyInviteLink,
    prioritizeMovieInDeck,
    moviePool,
    setMoviePool,
    createNewRoom,
    joinRoomByCode,
    toastMessage: toast?.message || null,
    toastIcon: toast?.icon || null,
    showToast,
    // Watch Party & Voice Call exports
    watchPartyMovie,
    watchPartyState,
    voiceParticipants,
    isVoiceMuted,
    isVoiceDeafened,
    activeReactions,
    startWatchParty,
    syncWatchParty,
    toggleVoiceMute,
    updateVoiceSpeakingState,
    toggleVoiceSpeaker,
    sendWatchPartyReaction,
    leaveWatchParty,
    broadcastScreenShare,
    sendWebRtcSignal,
    webRtcSignalData,
  };
}
