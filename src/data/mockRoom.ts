import { Room, User } from '../types';

export const CURRENT_USER: User = {
  id: 'u-alex',
  name: 'Alex Rivera',
  username: '@cine_alex',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDCIdq2nFZvmpS-u3D7k4GTKfh3_Nbx7xLNooI9T8qKA-w7AsnRV4wQw70oSxmmR2DDsaHAEjggE6Ta4T0u04kRwBa0tBKGNW1xqkyGgZ7acoCkNmH5vSfcE-109HOeVcLNOrN87X1o0Pp-OCQGqfMTrGYNIKRO7piDmzzb_Fp7jaPlRpJWCu0_2F5WQqFMsgzRbMc5HdfWFFgo-M7Hg5Z8RY3neABpXPUbIgV_KfQlOpW8RQO80hnS',
  role: 'host',
  isReady: true,
  statusText: 'Ready to swipe',
};

export const INITIAL_ROOM_USERS: User[] = [
  CURRENT_USER,
];

export const INITIAL_ROOM: Room = {
  id: 'room-8492',
  code: '8492',
  hostId: 'u-alex',
  filters: {
    genres: ['Action', 'Comedy', 'Horror', 'Sci-Fi'],
    languages: ['Hindi', 'English', 'South Indian (Telugu/Tamil)'],
    minRating: 7.5,
    runtimeRange: '90 - 120m',
  },
  users: INITIAL_ROOM_USERS,
  votes: {},
  matches: [],
  matchHistory: [
    {
      id: 'h-1',
      movieId: 'm-dark-knight',
      title: 'The Dark Knight',
      year: 2008,
      rating: 9.0,
      genreText: 'Action • Crime • 2008',
      posterUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAo2dmvfEIecOmf85EIPjGWEni5q4PA1D0LLi0OsrK-lXIjI1i2wHovDsQR-xLMptMCmXk2ZnRTUQuUOjYZclsMh7gYzsS4Qw4oJGDegTUTNMK9sUAb7bb1yxQxWezhgWeHmqUArQSBhAjLO4aV0v6maFmrWlyuojPpZwIezjeChvyvedTBzUcXWlVC2J7xlo0VPWYLwGcdnQzTFVkhrL9T9PJ313big0wffXPD-GaxDQNUFOoK-VtE',
      matchedAt: 'Tonight 9:15 PM',
      watched: true,
    },
    {
      id: 'h-2',
      movieId: 'm-eeaao',
      title: 'Everything Everywhere All at Once',
      year: 2022,
      rating: 7.8,
      genreText: 'Sci-Fi • Comedy • 2022',
      posterUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC1-bJe143sgw5wUJoE34ArQSrq6RIw23OUWcoJV3KxWMxO209sKubMPZ8nX_3qSMM2aFb6bLfX3jKCWdOHi4gu3v3olMx60AV_FvI1y20Wgghw6RLJQRAAuhSjtvyMcQowuut5SNEzvuWLM2gSge54ZBxHQvWTENFoP8rdsGIAJfOLuv57LlXUmq40ZWJlXzex_f3NR9DKW11OHMHWDrHxBrtSN3SQ7AnKhQv-NOjigvMq6i7KUblx',
      matchedAt: 'Yesterday',
      watched: false,
    },
    {
      id: 'h-3',
      movieId: 'm-spirited-away',
      title: 'Spirited Away',
      year: 2001,
      rating: 8.6,
      genreText: 'Anime • Fantasy • 2001',
      posterUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCYreVeC_U_6NkzZPXU1tqtQOuAhHqf7kfzgCNCKw5cH2tpSuDzleUBn18c7ICcweY9kqYgrGwA-NKuefhFy3erTHKB8ysulQVW6DdZ6Dz91Sbtxj4N2cxuEk7vBaebgnHIqN2ST_sGhSrhw_goyQ8IdZB3pWJUnIdnna9h164sMxSMOd19aQuFmbE5r_sCuBjENPvkBYuO5rN9hSLZmmC5wzGB6whEyVK2NPx2DPMY9adRROXOX-dW',
      matchedAt: 'Oct 24',
      watched: false,
    },
  ],
  status: 'lobby',
  currentMovieIndex: 0,
  vibe: {
    emoji: '🍿',
    text: 'Ready to swipe! Popcorn is salted and ready.',
    author: 'Sarah Chen',
    timestamp: Date.now(),
  },
};
