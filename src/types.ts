export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: 'host' | 'member';
  isReady: boolean;
  statusText: string;
  votedMovies?: Record<string, 'like' | 'pass' | 'super'>;
}

export interface WatchProviderLink {
  name: string;
  platform: 'free' | 'subscription' | 'search';
  url: string;
  badge?: string;
}

export interface Movie {
  id: string;
  title: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: 'movie' | 'tv';
  year: number;
  runtime: string;
  genres: string[];
  languages: string[];
  imdbRating: number;
  tomatoRating: number;
  certificate: string;
  director: string;
  tags: string[];
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
  streamingProvidersText: string;
  matchScorePercent: number;
  watchLinks: WatchProviderLink[];
  trailerVideoUrl?: string;
  streamDurationSeconds?: number;
}

export interface RoomFilters {
  genres: string[];
  languages: string[];
  minRating: number;
  runtimeRange: string;
}

export interface RoomVote {
  movieId: string;
  likedBy: string[];
  passedBy: string[];
  superlikedBy: string[];
}

export interface MatchHistoryItem {
  id: string;
  movieId: string;
  title: string;
  year: number;
  rating: number;
  genreText: string;
  posterUrl: string;
  matchedAt: string;
  watched: boolean;
}

export interface WatchPartyScreenShareInfo {
  isSharing: boolean;
  presenterId: string;
  presenterName: string;
  streamUrl?: string;
  startedAt: number;
}

export interface WatchPartyPlaybackState {
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lastUpdatedBy: string;
  updatedAt: number;
  screenShare?: WatchPartyScreenShareInfo;
}

export interface VoiceParticipant {
  userId: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isSpeaking: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair';
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  filters: RoomFilters;
  users: User[];
  votes: Record<string, RoomVote>;
  matches: string[];
  matchHistory: MatchHistoryItem[];
  status: 'lobby' | 'swiping' | 'matched' | 'watching';
  currentMovieIndex: number;
  vibe: {
    emoji: string;
    text: string;
    author: string;
    timestamp: number;
  };
  watchParty?: WatchPartyPlaybackState;
}

export type ActiveTab = 'swipe-deck' | 'session-lobby' | 'movie-matches' | 'genre-filters' | 'user-profile' | 'let-find-together' | 'watch-party';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface RecommendedMovieItem {
  title: string;
  year?: number;
  rating?: number;
  genres?: string[];
  languages?: string[];
  reason: string;
  posterUrl?: string;
  streamingInfo?: string;
}

export interface ChatAction {
  type: 'CREATE_ROOM' | 'SET_FILTERS' | 'START_SWIPING' | 'ADD_MATCH';
  label: string;
  payload: {
    roomCode?: string;
    genres?: string[];
    languages?: string[];
    minRating?: number;
    movieTitle?: string;
    year?: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  movies?: RecommendedMovieItem[];
  action?: ChatAction;
  sources?: GroundingSource[];
  isSelectiveHighlight?: boolean;
}
