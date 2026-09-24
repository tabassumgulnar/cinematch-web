import React, { useState, useEffect, useRef } from 'react';
import { TRENDING_SHOWCASE_ITEMS, ShowcaseItem, showcaseItemToMovie } from '../data/trendingShowcase';
import { Movie } from '../types';
import { fetchTrendingAll, getTmdbPosterUrl, getTmdbBackdropUrl, DEFAULT_POSTER } from '../services/tmdb';

interface CinematicBackgroundShowcaseProps {
  onAddToSwipeDeck?: (movie: Movie) => void;
  onDirectWatchFree?: (movie: Movie) => void;
  onOpenInfo?: (movie: Movie) => void;
  activeTab?: string;
}

export const CinematicBackgroundShowcase: React.FC<CinematicBackgroundShowcaseProps> = ({
  onAddToSwipeDeck,
  onDirectWatchFree,
  onOpenInfo,
  activeTab = 'swipe-deck',
}) => {
  const [showcaseList, setShowcaseList] = useState<ShowcaseItem[]>(TRENDING_SHOWCASE_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | '2026' | 'movie' | 'series' | 'romance'>('all');
  const [backdropIntensity, setBackdropIntensity] = useState<'balanced' | 'vivid' | 'subtle'>('balanced');
  const [areWingsCollapsed, setAreWingsCollapsed] = useState(false);
  const [isPosterStripCollapsed, setIsPosterStripCollapsed] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [activeHoverCardId, setActiveHoverCardId] = useState<string | null>(null);

  const posterScrollRef = useRef<HTMLDivElement | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real-time combined trending movies & TV series from official TMDB API:
  // https://api.themoviedb.org/3/trending/all/week?api_key=YOUR_TMDB_KEY
  useEffect(() => {
    let isCancelled = false;

    async function loadTmdbTrendingAll() {
      try {
        const liveItems = await fetchTrendingAll(1);
        if (isCancelled || !liveItems || liveItems.length === 0) return;

        // Convert TMDB combined items into ShowcaseItems, dynamically mapping title (movies) and name (TV series)
        const formattedLive: ShowcaseItem[] = liveItems.slice(0, 12).map((m) => {
          const isSeries = m.media_type === 'tv' || Boolean(m.name && !m.title);
          const displayTitle = (m.title || m.name || 'Trending Title').trim();
          const pPath = m.poster_path || null;
          const bPath = m.backdrop_path || null;

          return {
            id: `tmdb-live-${m.id}`,
            title: displayTitle,
            type: isSeries ? 'series' : 'movie',
            year: m.year || 2026,
            runtimeOrSeasons: isSeries ? 'Viral TV Series' : m.runtime || '2h 05m',
            genres: m.genres && m.genres.length > 0 ? m.genres : [isSeries ? 'TV Series' : 'Cinema'],
            languages: m.languages && m.languages.length > 0 ? m.languages : ['English'],
            imdbRating: m.imdbRating || 7.8,
            tomatoRating: m.tomatoRating || 88,
            viralTag: isSeries ? '🔥 #1 Viral TV Series on TMDB' : '🍿 Global Top Trending Movie',
            category: isSeries ? 'viral_series' : 'top_movie',
            categoryLabel: isSeries ? 'TMDB Viral Series' : 'TMDB Top Trending',
            buzzHighlight: `Official TMDB Trending • ${isSeries ? 'Hit TV Series' : 'Box Office Sensation'}`,
            synopsis: m.synopsis || `Stream ${displayTitle} in HD with official posters and trailers.`,
            poster_path: pPath,
            backdrop_path: bPath,
            // Construct full image URL using TMDB API base: https://image.tmdb.org/t/p/w500${item.poster_path}
            posterUrl: getTmdbPosterUrl(pPath, m.posterUrl),
            backdropUrl: getTmdbBackdropUrl(bPath, m.backdropUrl),
            streamingOn: '7reels.cc & Global Streams',
            themeColor: isSeries ? 'rgba(147, 51, 234, 0.45)' : 'rgba(225, 29, 72, 0.45)',
            trailerVideoUrl: m.trailerVideoUrl,
            is2026: String(m.year) === '2026',
          };
        });

        setShowcaseList((prev) => {
          // Keep highly anticipated 2026 releases at top, append live trending items avoiding duplicate titles
          const existingTitles = new Set(prev.map((p) => p.title.toLowerCase()));
          const newLive = formattedLive.filter((item) => !existingTitles.has(item.title.toLowerCase()));
          return [...prev, ...newLive];
        });
      } catch (err) {
        console.warn('Could not load live combined TMDB trending:', err);
      }
    }

    loadTmdbTrendingAll();

    return () => {
      isCancelled = true;
    };
  }, []);

  const currentItem: ShowcaseItem = showcaseList[currentIndex] || showcaseList[0] || TRENDING_SHOWCASE_ITEMS[0];

  // Auto-cycle through trending movies and viral series every 8.5 seconds
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % showcaseList.length);
    }, 8500);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, showcaseList.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % showcaseList.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + showcaseList.length) % showcaseList.length);
  };

  const handleSelectShowcase = (index: number) => {
    setCurrentIndex(index);
    setIsModalOpen(false);
    triggerToast(`Living background set to "${showcaseList[index].title}" ✨`);
  };

  const handleSelectPosterCard = (index: number) => {
    setCurrentIndex(index);
    triggerToast(`Living background updated to "${showcaseList[index].title}" ✨`);
  };

  const handleSwipeCurrent = (item: ShowcaseItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const movie = showcaseItemToMovie(item);
    if (onAddToSwipeDeck) {
      onAddToSwipeDeck(movie);
      triggerToast(`Added "${item.title}" to Swipe Deck! 🎬`);
    }
  };

  const handleWatchCurrent = (item: ShowcaseItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const movie = showcaseItemToMovie(item);
    if (onDirectWatchFree) {
      onDirectWatchFree(movie);
    }
  };

  const handleMoreInfo = (item: ShowcaseItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const movie = showcaseItemToMovie(item);
    if (onOpenInfo) {
      onOpenInfo(movie);
    }
  };

  const scrollPosters = (direction: 'left' | 'right') => {
    if (!posterScrollRef.current) return;
    const scrollAmount = direction === 'left' ? -380 : 380;
    posterScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const triggerToast = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => {
      setBannerNotice(null);
    }, 3200);
  };

  // Opacity styles based on user preference
  const opacityClass =
    backdropIntensity === 'vivid'
      ? 'opacity-65'
      : backdropIntensity === 'subtle'
      ? 'opacity-20'
      : 'opacity-40 sm:opacity-45';

  const filteredItems = showcaseList.filter((item) => {
    if (selectedFilter === '2026') return item.is2026 || String(item.year).includes('2026');
    if (selectedFilter === 'movie') return item.type === 'movie';
    if (selectedFilter === 'series') return item.type === 'series';
    if (selectedFilter === 'romance') return item.genres.includes('Romance') || item.id === 'sc-love-hypothesis';
    return true;
  });

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CINEMATIC BACKGROUND CANVAS (Layered fixed backdrop with Ken-Burns pan) */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
        {/* Layer 1: Ambient Backdrop Image with Crossfade */}
        {showcaseList.map((item, idx) => {
          const isActive = idx === currentIndex;
          const bgUrl = item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path.startsWith('/') ? item.backdrop_path : `/${item.backdrop_path}`}`
            : item.backdropUrl || getTmdbPosterUrl(item.poster_path, item.posterUrl);

          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? `${opacityClass} scale-100` : 'opacity-0 scale-105'
              }`}
              style={{
                transitionProperty: 'opacity, transform',
                transitionDuration: '1000ms',
              }}
            >
              <img
                src={bgUrl}
                alt={item.title}
                className="w-full h-full object-cover object-center filter saturate-125 contrast-105"
                loading={idx < 4 ? 'eager' : 'lazy'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80';
                }}
              />
            </div>
          );
        })}

        {/* Layer 2: Dynamic Radial Ambient Glow based on active movie/series theme */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-out"
          style={{
            background: `radial-gradient(ellipse 75% 65% at 50% 25%, ${currentItem.themeColor} 0%, rgba(10, 10, 15, 0.85) 75%, rgba(3, 3, 5, 0.98) 100%)`,
          }}
        />

        {/* Layer 3: Cinema Vignette & Top/Bottom Edge Feathering for maximum readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/90 via-transparent to-gray-950/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.65)_100%)]" />

        {/* Subtle cinematic scanline & grain mask */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* ========================================================================= */}
      {/* 2. AMBIENT VIRAL & TRENDING TOP BANNER / TICKER (Sticky below header)      */}
      {/* ========================================================================= */}
      <div className="w-full sticky top-16 z-30 max-w-7xl mx-auto px-2 sm:px-4 pt-1.5 pb-1">
        <div className="bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2 transition-all">
          {/* Left: Viral badge & Title showcase */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {/* Live Indicator Icon */}
            <div className="relative flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-md shadow-red-900/30">
              <span className="material-symbols-outlined text-white text-[17px] animate-pulse">
                {currentItem.type === 'series' ? 'live_tv' : 'local_fire_department'}
              </span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-gray-900 animate-ping" />
            </div>

            {/* Showcase title & viral highlight */}
            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-600/30 border border-red-500/40 text-red-300">
                  {currentItem.categoryLabel}
                </span>
                <span
                  className="text-xs sm:text-sm font-black text-white truncate hover:text-red-400 cursor-pointer transition-colors"
                  onClick={() => setIsModalOpen(true)}
                  title="Click to view all trending releases"
                >
                  {currentItem.title}
                </span>
                <span className="text-[11px] font-bold text-amber-300 hidden xs:inline">
                  ({currentItem.year})
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <span className="material-symbols-outlined text-[11px]">star</span>
                  {currentItem.imdbRating}
                </span>
                {currentItem.id === 'sc-love-hypothesis' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 hidden sm:inline-flex items-center gap-0.5">
                    💖 BookTok Viral
                  </span>
                )}
              </div>

              {/* Tagline / Buzz */}
              <div className="text-[11px] text-gray-300/80 truncate hidden md:inline-flex items-center gap-1.5">
                <span className="text-gray-600">•</span>
                <span className="text-gray-300 italic font-medium">{currentItem.viralTag}</span>
                <span className="text-gray-600">•</span>
                <span className="text-emerald-400 font-medium">📺 {currentItem.streamingOn}</span>
              </div>
            </div>
          </div>

          {/* Right: Interactive controls & Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            {/* Toggle Poster Reel Button */}
            <button
              onClick={() => setIsPosterStripCollapsed(!isPosterStripCollapsed)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                !isPosterStripCollapsed
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
              }`}
              title={isPosterStripCollapsed ? 'Show Posters Strip' : 'Hide Posters Strip'}
            >
              <span className="material-symbols-outlined text-[15px]">
                {!isPosterStripCollapsed ? 'visibility' : 'view_carousel'}
              </span>
              <span className="hidden sm:inline">
                {!isPosterStripCollapsed ? 'Hide Posters' : 'TMDB Posters Reel'}
              </span>
            </button>

            {/* Direct Watch Free Button */}
            <button
              onClick={() => handleWatchCurrent(currentItem)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-transform active:scale-95 cursor-pointer"
              title="Watch Free Streams or Trailers"
            >
              <span className="material-symbols-outlined text-[15px]">play_circle</span>
              <span className="hidden sm:inline">Stream Free</span>
            </button>

            {/* Quick Add to Room Swipe Deck */}
            <button
              onClick={() => handleSwipeCurrent(currentItem)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#e50914] hover:bg-red-700 text-white shadow-md shadow-red-900/30 transition-transform active:scale-95 cursor-pointer"
              title="Add this trending title to your room swipe deck"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              <span className="hidden sm:inline">Swipe in Deck</span>
            </button>

            {/* Auto Play / Pause Toggle */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isAutoPlaying ? 'Pause background rotation' : 'Resume background rotation'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isAutoPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Next / Prev Background Showcase */}
            <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/5">
              <button
                onClick={handlePrev}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Previous title"
              >
                <span className="material-symbols-outlined text-[14px]">chevron_left</span>
              </button>
              <span className="text-[10px] text-gray-400 font-mono px-1">
                {currentIndex + 1}/{showcaseList.length}
              </span>
              <button
                onClick={handleNext}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Next title"
              >
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>

            {/* Open Full Showcase Drawer Modal */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-200 transition-colors border border-white/10 cursor-pointer"
              title="Browse all trending movies and series"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-400">grid_view</span>
              <span className="hidden md:inline">Hub</span>
            </button>
          </div>
        </div>

        {/* Temporary toast notification for background showcase actions */}
        {bannerNotice && (
          <div className="mt-1 flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-900/95 border border-emerald-500/40 text-emerald-300 text-xs shadow-lg animate-in fade-in slide-in-from-top-1">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">check_circle</span>
              <span>{bannerNotice}</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DEDICATED TMDB POSTER SHOWCASE REEL (With their posters!)              */}
      {/* Aspect Ratio Preserved: aspect-[2/3] with object-cover                    */}
      {/* ========================================================================= */}
      {!isPosterStripCollapsed && (
        <section
          aria-label="Trending Movies & Viral Series Poster Reel"
          className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 relative z-20 select-none animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="bg-gray-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-3 sm:p-4 shadow-2xl overflow-hidden relative group/strip">
            {/* Marquee Header & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-xs sm:text-sm font-black text-white tracking-wide flex items-center gap-1.5 uppercase">
                  <span>🔥 TMDB Trending Movies & Viral Series</span>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Official TMDB Posters
                  </span>
                </span>
                <span className="text-[11px] text-gray-400 hidden lg:inline">
                  • Click poster to set living background, swipe in room, or stream free!
                </span>
              </div>

              {/* Category Filter Pills & Scroll Controls */}
              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Trending' },
                    { id: 'romance', label: '💖 Romance' },
                    { id: '2026', label: '⚡ 2026 New' },
                    { id: 'series', label: '📺 Viral Series' },
                    { id: 'movie', label: '🎬 Movies' },
                  ].map((filterTab) => (
                    <button
                      key={filterTab.id}
                      onClick={() => setSelectedFilter(filterTab.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedFilter === filterTab.id
                          ? 'bg-[#e50914] text-white shadow-md shadow-red-900/40'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {filterTab.label}
                    </button>
                  ))}
                </div>

                {/* Left / Right Scroll Buttons */}
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={() => scrollPosters('left')}
                    className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 cursor-pointer"
                    title="Scroll posters left"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => scrollPosters('right')}
                    className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 cursor-pointer"
                    title="Scroll posters right"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Scrollable Poster Cards */}
            <div
              ref={posterScrollRef}
              className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth no-scrollbar scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {filteredItems.map((item) => {
                const originalIndex = showcaseList.findIndex((t) => t.id === item.id);
                const isSelected = originalIndex === currentIndex;
                const isHovered = activeHoverCardId === item.id;
                // Construct poster URL using official TMDB base https://image.tmdb.org/t/p/w500${item.poster_path}
                // Fallback only if poster_path is null
                const posterSrc = getTmdbPosterUrl(item.poster_path, item.posterUrl);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectPosterCard(originalIndex)}
                    onMouseEnter={() => setActiveHoverCardId(item.id)}
                    onMouseLeave={() => setActiveHoverCardId(null)}
                    style={{ scrollSnapAlign: 'start' }}
                    className={`flex-shrink-0 w-44 sm:w-48 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 relative group flex flex-col border ${
                      isSelected
                        ? 'ring-2 ring-red-500 border-red-500 bg-red-950/30 shadow-xl shadow-red-950/60 scale-[1.02]'
                        : 'border-white/10 bg-gray-900/90 hover:border-white/30 hover:bg-gray-800/90 hover:-translate-y-1 shadow-lg'
                    }`}
                  >
                    {/* Vertical Poster Container: Strict aspect-[2/3] with object-cover */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/80">
                      <img
                        src={posterSrc}
                        alt={item.title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isSelected ? 'scale-105' : 'group-hover:scale-110'
                        }`}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                        }}
                      />

                      {/* Poster Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md ${
                            item.id === 'sc-love-hypothesis'
                              ? 'bg-pink-600 text-white'
                              : item.type === 'series'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.id === 'sc-love-hypothesis'
                            ? '💖 BookTok 2026'
                            : item.is2026
                            ? '2026 NEW'
                            : item.type === 'series'
                            ? 'VIRAL SERIES'
                            : 'TOP MOVIE'}
                        </span>

                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/30 shadow">
                          <span className="material-symbols-outlined text-[11px]">star</span>
                          {item.imdbRating}
                        </span>
                      </div>

                      {/* Active Live Background Badge */}
                      {isSelected && (
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 py-1 rounded-lg bg-emerald-500/90 text-gray-950 text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-sm animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-950" />
                          <span>Active Living BG</span>
                        </div>
                      )}

                      {/* Hover / Tap Quick Action Buttons Overlay */}
                      <div
                        className={`absolute inset-0 bg-black/80 backdrop-blur-sm p-3 flex flex-col justify-center items-center gap-2 transition-opacity duration-200 ${
                          isHovered && !isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <p className="text-[11px] font-black text-white text-center line-clamp-1">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-amber-300 font-semibold text-center line-clamp-1">
                          {item.viralTag}
                        </span>

                        <div className="flex flex-col w-full gap-1.5 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPosterCard(originalIndex);
                            }}
                            className="w-full py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/20 hover:bg-white/30 text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">wallpaper</span>
                            <span>Set Living BG</span>
                          </button>

                          <button
                            onClick={(e) => handleSwipeCurrent(item, e)}
                            className="w-full py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#e50914] hover:bg-red-700 text-white flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-md"
                          >
                            <span className="material-symbols-outlined text-[13px]">style</span>
                            <span>Swipe in Deck</span>
                          </button>

                          <button
                            onClick={(e) => handleWatchCurrent(item, e)}
                            className="w-full py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-md"
                          >
                            <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                            <span>Stream Free</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between gap-1">
                      <div>
                        <h4 className="text-xs font-black text-white truncate group-hover:text-red-400 transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <span className="text-amber-400 font-bold">{item.year}</span>
                          <span>•</span>
                          <span className="truncate">{item.genres[0]}</span>
                          <span>•</span>
                          <span className="text-gray-300">{item.type === 'series' ? 'Series' : 'Movie'}</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[9px] text-emerald-400 font-semibold truncate">
                        <span className="truncate">📺 {item.streamingOn}</span>
                        <span className="material-symbols-outlined text-[13px] text-gray-400 group-hover:text-white transition-colors">
                          open_in_new
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. LAPTOP / DESKTOP SIDE SHOWCASE WINGS (Visible on 2XL+ screens)          */}
      {/* ========================================================================= */}
      {!areWingsCollapsed ? (
        <>
          {/* Left Wing: Current Active Showcase Spotlight */}
          <aside className="hidden 2xl:flex flex-col fixed left-4 top-36 bottom-24 w-60 z-20 pointer-events-none">
            <div className="pointer-events-auto bg-gray-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 transition-all hover:border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-red-500 text-[17px]">local_fire_department</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-400">Spotlight</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setBackdropIntensity((prev) =>
                        prev === 'balanced' ? 'vivid' : prev === 'vivid' ? 'subtle' : 'balanced'
                      )
                    }
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 cursor-pointer"
                    title="Toggle Background Atmosphere Intensity"
                  >
                    {backdropIntensity.toUpperCase()} BG
                  </button>
                  <button
                    onClick={() => setAreWingsCollapsed(true)}
                    className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10 cursor-pointer"
                    title="Minimize Side Panels"
                  >
                    <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                  </button>
                </div>
              </div>

              {/* Poster & Badges: Strict Aspect Ratio [2/3] with object-cover */}
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] max-h-56 group bg-black">
                <img
                  src={getTmdbPosterUrl(currentItem.poster_path, currentItem.posterUrl)}
                  alt={currentItem.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
                <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30">
                  <span className="material-symbols-outlined text-[12px]">star</span>
                  {currentItem.imdbRating}
                </span>
                <span className="absolute top-1.5 right-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-red-600/90 text-white shadow-md">
                  {currentItem.is2026 ? '2026 NEW' : currentItem.type === 'series' ? 'VIRAL SERIES' : 'TOP MOVIE'}
                </span>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-black text-white leading-tight line-clamp-1">
                  {currentItem.title}
                </h4>
                <p className="text-[10px] text-amber-400 font-semibold line-clamp-1">
                  {currentItem.viralTag}
                </p>
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                  {currentItem.synopsis}
                </p>
              </div>

              {/* Metadata pill */}
              <div className="flex flex-wrap items-center gap-1 text-[9px] text-gray-300">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                  {currentItem.runtimeOrSeasons}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                  {currentItem.genres[0]}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {currentItem.streamingOn}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                <button
                  onClick={() => handleSwipeCurrent(currentItem)}
                  className="py-1 px-1.5 rounded-xl text-[11px] font-bold bg-[#e50914] hover:bg-red-700 text-white flex items-center justify-center gap-1 shadow-md shadow-red-900/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">style</span>
                  <span>Swipe</span>
                </button>
                <button
                  onClick={() => handleWatchCurrent(currentItem)}
                  className="py-1 px-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 shadow-md shadow-emerald-900/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                  <span>Stream</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Right Wing: Trending Viral Queue (Click to switch background) */}
          <aside className="hidden 2xl:flex flex-col fixed right-4 top-36 bottom-24 w-60 z-20 pointer-events-none">
            <div className="pointer-events-auto bg-gray-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-[17px]">trending_up</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">TMDB Trending</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                  <button
                    onClick={() => setAreWingsCollapsed(true)}
                    className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10 cursor-pointer"
                    title="Minimize Side Panels"
                  >
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-gray-400">Click title to change background:</p>

              {/* Mini thumbnails list: Strict aspect-[2/3] */}
              <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-1 select-none">
                {showcaseList.slice(0, 8).map((item, idx) => {
                  const isSelected = idx === currentIndex;
                  const thumbSrc = getTmdbPosterUrl(item.poster_path, item.posterUrl);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex items-center gap-2 p-1 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-950/50'
                          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="w-8 aspect-[2/3] rounded-lg overflow-hidden bg-black flex-shrink-0">
                        <img
                          src={thumbSrc}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-black text-white truncate">{item.title}</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-ping" />
                          )}
                        </div>
                        <p className="text-[9px] text-amber-400 truncate">{item.categoryLabel}</p>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400">
                          <span className="text-amber-400 font-bold">★ {item.imdbRating}</span>
                          <span>•</span>
                          <span>{item.type === 'series' ? 'Series' : 'Movie'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Hub Trigger */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-1 py-1 rounded-xl text-[11px] font-bold bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                <span>All {showcaseList.length} Releases</span>
              </button>
            </div>
          </aside>
        </>
      ) : (
        /* Floating Un-collapse Button */
        <button
          onClick={() => setAreWingsCollapsed(false)}
          className="hidden 2xl:flex fixed left-2 top-36 z-20 items-center gap-1 px-2 py-1 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-white/10 shadow-lg text-[10px] font-bold cursor-pointer"
          title="Restore Side Showcase Panels"
        >
          <span className="material-symbols-outlined text-[14px] text-red-500">local_fire_department</span>
          <span>Showcase Panels</span>
        </button>
      )}

      {/* ========================================================================= */}
      {/* 5. VIRAL SHOWCASE HUB MODAL (Full grid with official TMDB posters)        */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-gray-950 border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/50 via-gray-900 to-black">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-900/40">
                  <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                    Trending Movies & Viral Series Showcase
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Live trending entertainment from official TMDB API with real posters. Tap any to set background, swipe in room, or stream free.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Filter Tabs & Atmosphere Settings */}
            <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-gray-900/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: `All Releases (${showcaseList.length})` },
                  { id: 'romance', label: '💖 Romance' },
                  { id: '2026', label: '⚡ 2026 Releases' },
                  { id: 'series', label: '🔥 Viral Series' },
                  { id: 'movie', label: '🎬 Top Movies' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedFilter === tab.id
                        ? 'bg-[#e50914] text-white shadow-md shadow-red-900/30'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Background Intensity Option */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Background Opacity:</span>
                <div className="flex bg-black/40 rounded-xl p-0.5 border border-white/10">
                  {(['subtle', 'balanced', 'vivid'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBackdropIntensity(mode)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        backdropIntensity === mode
                          ? 'bg-red-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid of Showcase Items: Preserves aspect-[2/3] */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const originalIndex = showcaseList.findIndex((t) => t.id === item.id);
                const isCurrent = originalIndex === currentIndex;
                const modalPosterSrc = getTmdbPosterUrl(item.poster_path, item.posterUrl);

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col group ${
                      isCurrent
                        ? 'bg-red-950/30 border-red-500/70 ring-2 ring-red-500/30 shadow-xl'
                        : 'bg-gray-900/80 border-white/10 hover:border-white/25 hover:bg-gray-800/80'
                    }`}
                  >
                    {/* Poster Banner: Strict Aspect Ratio [2/3] with object-cover */}
                    <div className="relative aspect-[2/3] max-h-72 w-full overflow-hidden bg-black">
                      <img
                        src={modalPosterSrc}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_POSTER;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />

                      {/* Badges */}
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-md ${
                          item.id === 'sc-love-hypothesis'
                            ? 'bg-pink-600'
                            : item.type === 'series'
                            ? 'bg-indigo-600'
                            : 'bg-red-600'
                        }`}
                      >
                        {item.categoryLabel}
                      </span>
                      <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-black bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/30">
                        <span className="material-symbols-outlined text-[13px]">star</span>
                        {item.imdbRating}
                      </span>

                      {isCurrent && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500 text-black shadow-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                          Live In Background
                        </span>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 flex flex-col flex-1 gap-2">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-base font-black text-white group-hover:text-red-400 transition-colors">
                            {item.title}
                          </h4>
                          <span className="text-xs font-bold text-amber-300">({item.year})</span>
                        </div>
                        <p className="text-xs text-amber-400 font-semibold line-clamp-1">
                          {item.viralTag}
                        </p>
                      </div>

                      <p className="text-xs text-gray-300/80 line-clamp-2 leading-relaxed">
                        {item.synopsis}
                      </p>

                      <div className="mt-auto pt-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span>{item.runtimeOrSeasons}</span>
                          <span className="text-emerald-400 font-medium">📺 {item.streamingOn}</span>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10">
                          {/* 1. Set as Background */}
                          <button
                            onClick={() => handleSelectShowcase(originalIndex)}
                            className={`py-1.5 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-white/10 text-emerald-300 cursor-default'
                                : 'bg-white/5 hover:bg-white/15 text-gray-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">wallpaper</span>
                            <span>{isCurrent ? 'Active BG' : 'Set BG'}</span>
                          </button>

                          {/* 2. Add to Swipe Deck */}
                          <button
                            onClick={() => {
                              handleSwipeCurrent(item);
                              setIsModalOpen(false);
                            }}
                            className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-[#e50914] hover:bg-red-700 text-white flex items-center justify-center gap-0.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Swipe</span>
                          </button>

                          {/* 3. Direct Stream Free */}
                          <button
                            onClick={() => {
                              handleWatchCurrent(item);
                              setIsModalOpen(false);
                            }}
                            className="py-1.5 px-1 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-0.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                            <span>Stream</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-gray-900/60 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-[18px]">verified</span>
                <span>Includes official TMDB trending movies & TV series with verified posters</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Close Showcase
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
