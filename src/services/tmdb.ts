import { Movie, WatchProviderLink } from '../types';
import { createWatchLinks, INITIAL_MOVIES } from '../data/movies';

export const TMDB_API_KEY =
  (import.meta as any).env?.VITE_TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

export const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export const TMDB_LANGUAGES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
  ml: 'Malayalam',
  kn: 'Kannada',
  pa: 'Punjabi',
};

export const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BACKDROP_BASE_W1280 = 'https://image.tmdb.org/t/p/w1280';

export const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
export const DEFAULT_BACKDROP =
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80';

/**
 * Constructs the official TMDB image URL using the w500 base.
 * If poster_path is null or undefined, only then returns the fallback image.
 */
export function getTmdbPosterUrl(posterPath?: string | null, fallbackUrl: string = DEFAULT_POSTER): string {
  if (posterPath && posterPath.trim()) {
    if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
      return posterPath;
    }
    const cleanPath = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
    return `https://image.tmdb.org/t/p/w500${cleanPath}`;
  }
  return fallbackUrl;
}

/**
 * Constructs the official TMDB backdrop URL using the w1280 base.
 */
export function getTmdbBackdropUrl(backdropPath?: string | null, fallbackUrl: string = DEFAULT_BACKDROP): string {
  if (backdropPath && backdropPath.trim()) {
    if (backdropPath.startsWith('http://') || backdropPath.startsWith('https://')) {
      return backdropPath;
    }
    const cleanPath = backdropPath.startsWith('/') ? backdropPath : `/${backdropPath}`;
    return `https://image.tmdb.org/t/p/w1280${cleanPath}`;
  }
  return fallbackUrl;
}

export interface TmdbRawMovie {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  original_language?: string;
  adult?: boolean;
  popularity?: number;
  media_type?: 'movie' | 'tv';
}

/**
 * Transforms a TMDB raw movie or TV series response into the CineMatch Movie interface.
 * Dynamically maps both `title` (movies) and `name` (TV series).
 * Constructs official TMDB poster URL using: https://image.tmdb.org/t/p/w500${item.poster_path}
 */
export function formatTmdbMovie(raw: TmdbRawMovie): Movie {
  const title = (raw.title || raw.name || raw.original_title || raw.original_name || 'Untitled').trim();
  const dateStr = raw.release_date || raw.first_air_date || '';
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) || 2026 : 2026;
  const rating = raw.vote_average ? Number(raw.vote_average.toFixed(1)) : 7.5;
  const isTvSeries = raw.media_type === 'tv' || Boolean(raw.name && !raw.title);

  const genres: string[] = [];
  if (Array.isArray(raw.genre_ids)) {
    for (const gid of raw.genre_ids) {
      if (TMDB_GENRES[gid] && !genres.includes(TMDB_GENRES[gid])) {
        genres.push(TMDB_GENRES[gid]);
      }
    }
  }
  if (genres.length === 0) {
    genres.push(isTvSeries ? 'Viral Series' : 'Drama', 'Trending');
  }

  const langCode = (raw.original_language || 'en').toLowerCase();
  const langName = TMDB_LANGUAGES[langCode] || langCode.toUpperCase();
  const languages: string[] = [langName];
  if (langName !== 'English') {
    languages.push('English Subtitles');
  }

  // Use official TMDB poster image base: https://image.tmdb.org/t/p/w500${item.poster_path}
  const posterUrl = raw.poster_path
    ? `https://image.tmdb.org/t/p/w500${raw.poster_path.startsWith('/') ? raw.poster_path : `/${raw.poster_path}`}`
    : DEFAULT_POSTER;

  const backdropUrl = raw.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path.startsWith('/') ? raw.backdrop_path : `/${raw.backdrop_path}`}`
    : DEFAULT_BACKDROP;

  const matchScorePercent = Math.min(99, Math.max(70, Math.round(rating * 10 + 5)));

  return {
    id: `tmdb-${isTvSeries ? 'tv' : 'movie'}-${raw.id}`,
    title,
    name: raw.name,
    poster_path: raw.poster_path || null,
    backdrop_path: raw.backdrop_path || null,
    media_type: isTvSeries ? 'tv' : 'movie',
    year,
    runtime: isTvSeries ? 'TV Series' : '2h 05m',
    genres,
    languages,
    imdbRating: rating,
    tomatoRating: Math.min(100, Math.round(rating * 10)),
    certificate: raw.adult ? 'R' : isTvSeries ? 'TV-14' : 'PG-13',
    director: isTvSeries ? 'Official TMDB Series' : 'TMDB Global Selection',
    tags: [...genres.slice(0, 2), isTvSeries ? 'Viral Series 📺' : 'Trending 🍿'],
    synopsis: raw.overview?.trim() || `Stream ${title} (${year}) online in full HD.`,
    posterUrl,
    backdropUrl,
    streamingProvidersText: '7reels.cc & Prime',
    matchScorePercent,
    watchLinks: createWatchLinks(title, year),
    trailerVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    streamDurationSeconds: 720,
  };
}

/**
 * Fetch real-time combined trending movies & TV series from TMDB API:
 * https://api.themoviedb.org/3/trending/all/week?api_key=YOUR_TMDB_KEY
 */
export async function fetchTrendingAll(page: number = 1): Promise<Movie[]> {
  try {
    const url = `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Combined Trending status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.results) && data.results.length > 0) {
      return data.results
        .filter((item: TmdbRawMovie) => Boolean(item.title || item.name))
        .map((item: TmdbRawMovie) => formatTmdbMovie(item));
    }
  } catch (error) {
    console.warn('Direct TMDB combined trending fetch error, trying server proxy fallback...', error);
    try {
      const fallbackRes = await fetch('/api/tmdb/trending');
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData.results) && fallbackData.results.length > 0) {
          return fallbackData.results
            .filter((item: TmdbRawMovie) => Boolean(item.title || item.name))
            .map((item: TmdbRawMovie) => formatTmdbMovie(item));
        }
      }
    } catch (proxyError) {
      console.warn('Proxy fallback error:', proxyError);
    }
  }
  return INITIAL_MOVIES;
}

/**
 * Fetch trending movies and series (alias of fetchTrendingAll).
 */
export async function fetchTrendingMovies(): Promise<Movie[]> {
  return fetchTrendingAll(1);
}

/**
 * Fetch real-time popular movies from TMDB API.
 */
export async function fetchPopularMovies(page: number = 1): Promise<Movie[]> {
  try {
    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Popular status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.results) && data.results.length > 0) {
      return data.results.map((item: TmdbRawMovie) => formatTmdbMovie(item));
    }
  } catch (error) {
    console.warn('Direct TMDB popular fetch error:', error);
  }
  return INITIAL_MOVIES;
}

/**
 * Live search movies and TV series by query string from TMDB API.
 */
export async function searchTmdbMovies(query: string, limit: number = 10): Promise<Movie[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      trimmed
    )}&include_adult=false&language=en-US&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Search status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.results)) {
      const movies = data.results
        .filter((raw: TmdbRawMovie) => Boolean(raw.title || raw.name || raw.original_title))
        .slice(0, limit)
        .map((item: TmdbRawMovie) => formatTmdbMovie(item));
      return movies;
    }
  } catch (error) {
    console.warn('Direct TMDB search error, trying server proxy fallback...', error);
    try {
      const fallbackRes = await fetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData.results)) {
          return fallbackData.results
            .filter((raw: TmdbRawMovie) => Boolean(raw.title || raw.name || raw.original_title))
            .slice(0, limit)
            .map((item: TmdbRawMovie) => formatTmdbMovie(item));
        }
      }
    } catch (proxyError) {
      console.warn('Proxy search error:', proxyError);
    }
  }

  // Fallback to local filter if offline
  const lower = trimmed.toLowerCase();
  return INITIAL_MOVIES.filter((m) =>
    m.title.toLowerCase().includes(lower) ||
    m.genres.some((g) => g.toLowerCase().includes(lower))
  ).slice(0, limit);
}
