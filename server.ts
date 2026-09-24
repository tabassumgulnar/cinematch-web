import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI();
  }
  return aiClient;
}

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory room store (mirrors Firebase Firestore collection 'rooms')
interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: 'host' | 'member';
  isReady: boolean;
  statusText: string;
}

interface RoomFilters {
  genres: string[];
  languages: string[];
  minRating: number;
  runtimeRange: string;
}

interface RoomVote {
  movieId: string;
  likedBy: string[];
  passedBy: string[];
  superlikedBy: string[];
}

interface MatchHistoryItem {
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

interface WatchPartyScreenShareInfo {
  isSharing: boolean;
  presenterId: string;
  presenterName: string;
  streamUrl?: string;
  startedAt: number;
}

interface WatchPartyPlaybackState {
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

interface Room {
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

// In-memory room store (mirrors Firebase Firestore collection 'rooms')
const rooms: Record<string, Room> = {};

// WebSocket connection registry: RoomCode -> Set of WebSockets
const roomConnections = new Map<string, Set<WebSocket>>();

function broadcastToRoom(roomCode: string, payload: any) {
  const sockets = roomConnections.get(roomCode);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const client of sockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// REST Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms/:code', (req: Request, res: Response) => {
  const room = rooms[req.params.code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

app.post('/api/rooms', (req: Request, res: Response) => {
  const { code, host, filters } = req.body;
  const roomCode = code || Math.floor(1000 + Math.random() * 9000).toString();
  const newRoom: Room = {
    id: `room-${roomCode}`,
    code: roomCode,
    hostId: host?.id || 'u-alex',
    filters: filters || {
      genres: ['Action', 'Comedy', 'Horror', 'Sci-Fi'],
      languages: ['Hindi', 'English'],
      minRating: 7.5,
      runtimeRange: '90 - 120m',
    },
    users: host ? [host] : [],
    votes: {},
    matches: [],
    matchHistory: [],
    status: 'lobby',
    currentMovieIndex: 0,
    vibe: {
      emoji: '🍿',
      text: 'Lobby initialized! Invite your friends to join.',
      author: host?.name || 'Host',
      timestamp: Date.now(),
    },
  };
  rooms[roomCode] = newRoom;
  res.status(201).json(newRoom);
});

app.post('/api/rooms/:code/join', (req: Request, res: Response) => {
  const room = rooms[req.params.code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const { user } = req.body;
  if (user && !room.users.find((u) => u.id === user.id)) {
    room.users.push(user);
    broadcastToRoom(room.code, { type: 'ROOM_UPDATED', room });
  }
  res.json(room);
});

// TMDB API Endpoints & Proxy
const DEFAULT_TMDB_KEY = process.env.TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';

app.get('/api/tmdb/trending', async (_req: Request, res: Response) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/trending/all/week?api_key=${DEFAULT_TMDB_KEY}&language=en-US&page=1`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch combined trending content from TMDB' });
  }
});

app.get('/api/tmdb/trending/all', async (_req: Request, res: Response) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/trending/all/week?api_key=${DEFAULT_TMDB_KEY}&language=en-US&page=1`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch combined trending content from TMDB' });
  }
});

app.get('/api/tmdb/popular', async (req: Request, res: Response) => {
  const page = req.query.page || '1';
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${DEFAULT_TMDB_KEY}&language=en-US&page=${page}`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular movies from TMDB' });
  }
});

app.get('/api/tmdb/search', async (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  if (!query.trim()) {
    return res.json({ results: [] });
  }
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${DEFAULT_TMDB_KEY}&query=${encodeURIComponent(
      query.trim()
    )}&include_adult=false&language=en-US&page=1`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search content from TMDB' });
  }
});

// TMDB API Discover Proxy (or fallback if TMDB_KEY not configured)
app.get('/api/tmdb/discover', async (req: Request, res: Response) => {
  const { genres, language, minRating } = req.query;
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${DEFAULT_TMDB_KEY}&language=en-US&sort_by=popularity.desc&vote_average.gte=${minRating || 7}&page=1`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();
    res.json({ source: 'tmdb_live', data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
});

// AI Chatbot: "LET FIND TOGETHER" - Highly Selective Movie Curator & Room Concierge
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, history = [], roomContext, modelMode = 'standard' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message string is required' });
  }

  const ai = getGenAI();

  // Helper for generating selective fallback if Gemini API is unavailable or throws
  const generateFallbackResponse = (userPrompt: string) => {
    const lower = userPrompt.toLowerCase();
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Check for room creation intent
    if (lower.includes('create') && (lower.includes('room') || lower.includes('rom') || lower.includes('lobby') || lower.includes('party'))) {
      let selectedGenres = ['Action', 'Comedy', 'Horror'];
      let selectedLanguages = ['Hindi', 'English'];

      if (lower.includes('horror')) selectedGenres = ['Horror', 'Thriller'];
      else if (lower.includes('comedy')) selectedGenres = ['Comedy'];
      else if (lower.includes('action')) selectedGenres = ['Action', 'Sci-Fi'];

      if (lower.includes('hindi') && !lower.includes('english')) selectedLanguages = ['Hindi'];
      else if (lower.includes('english') && !lower.includes('hindi')) selectedLanguages = ['English'];

      // Register room in server memory so anyone can join
      if (!rooms[randomCode]) {
        rooms[randomCode] = {
          id: `room-${randomCode}`,
          code: randomCode,
          hostId: 'u-alex',
          filters: {
            genres: selectedGenres,
            languages: selectedLanguages,
            minRating: 7.8,
            runtimeRange: '90 - 120m',
          },
          users: [
            {
              id: 'u-alex',
              name: 'Alex Rivera',
              username: '@cine_alex',
              avatar:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDCIdq2nFZvmpS-u3D7k4GTKfh3_Nbx7xLNooI9T8qKA-w7AsnRV4wQw70oSxmmR2DDsaHAEjggE6Ta4T0u04kRwBa0tBKGNW1xqkyGgZ7acoCkNmH5vSfcE-109HOeVcLNOrN87X1o0Pp-OCQGqfMTrGYNIKRO7piDmzzb_Fp7jaPlRpJWCu0_2F5WQqFMsgzRbMc5HdfWFFgo-M7Hg5Z8RY3neABpXPUbIgV_KfQlOpW8RQO80hnS',
              role: 'host',
              isReady: true,
              statusText: 'Room created with LET FIND TOGETHER',
            },
          ],
          votes: {},
          matches: [],
          matchHistory: [],
          status: 'lobby',
          currentMovieIndex: 0,
          vibe: {
            emoji: '✨',
            text: `Curated room #${randomCode} generated by LET FIND TOGETHER!`,
            author: 'LET FIND TOGETHER AI',
            timestamp: Date.now(),
          },
        };
      }

      return {
        text: `🎬 **Boom! Room #${randomCode} is ready for you!**\n\nI configured this room exclusively with **highly selective cinema**:\n- **Genres:** ${selectedGenres.join(', ')}\n- **Languages:** ${selectedLanguages.join(' & ')}\n- **Quality Standard:** ★ 7.8+ IMDb strictly curated (zero fluff)\n\nTap the button below to jump into your new room and invite your movie crew!`,
        action: {
          type: 'CREATE_ROOM',
          label: `Enter Room #${randomCode} 🎬`,
          payload: {
            roomCode: randomCode,
            genres: selectedGenres,
            languages: selectedLanguages,
            minRating: 7.8,
          },
        },
        movies: [
          {
            title: 'Tumbbad',
            year: 2018,
            rating: 8.2,
            genres: ['Horror', 'Fantasy'],
            languages: ['Hindi'],
            reason: 'Selective Verdict: ★★★★★ Atmospheric triumph and legendary Indian folk horror that completely avoids cheap jumpscares.',
            streamingInfo: 'JioCinema & Prime Video',
          },
          {
            title: 'Deadpool & Wolverine',
            year: 2024,
            rating: 7.7,
            genres: ['Action', 'Comedy'],
            languages: ['English', 'Hindi'],
            reason: 'Selective Verdict: ★★★★☆ Irreverent crowd-pleaser with unmatched duo chemistry and relentless comedic timing.',
            streamingInfo: 'Disney+ Hotstar',
          },
        ],
      };
    }

    if (lower.includes('horror')) {
      return {
        text: `👻 **LET FIND TOGETHER Selective Horror Recommendations:**\n\nI filtered out low-budget jump-scare slop to bring you true psychological dread and modern masterworks:\n\n1. **Tumbbad (2018)** — *IMDb 8.2 • Hindi*\n   - **Why It Passed My Cut:** Visceral, mythic storytelling set across three generations. The atmosphere and set design are unparalleled in Indian cinema.\n   - **Where to Watch:** JioCinema / Prime Video\n\n2. **Get Out (2017)** — *IMDb 7.8 • English*\n   - **Why It Passed My Cut:** Jordan Peele’s Oscar-winning script balances razor-sharp social commentary with unrelenting suspense.\n   - **Where to Watch:** JioCinema & Prime\n\n3. **The Conjuring (2013)** — *IMDb 7.5 • English/Hindi*\n   - **Why It Passed My Cut:** A textbook demonstration of practical lighting, auditory tension, and family stakes.`,
        action: {
          type: 'SET_FILTERS',
          label: 'Apply Horror Filters to Active Room 👻',
          payload: {
            genres: ['Horror', 'Thriller'],
            languages: ['Hindi', 'English'],
          },
        },
        movies: [
          {
            title: 'Tumbbad',
            year: 2018,
            rating: 8.2,
            genres: ['Horror'],
            reason: 'Mythic folk horror masterpiece with 8.2 IMDb.',
            streamingInfo: 'JioCinema',
          },
          {
            title: 'Get Out',
            year: 2017,
            rating: 7.8,
            genres: ['Horror', 'Thriller'],
            reason: 'Oscar-winning psychological thriller.',
            streamingInfo: 'Prime Video',
          },
        ],
      };
    }

    if (lower.includes('comedy')) {
      return {
        text: `😂 **LET FIND TOGETHER Highly Selective Comedy Selection:**\n\nZero cringe, guaranteed belly laughs for your group session:\n\n1. **3 Idiots (2009)** — *IMDb 8.4 • Hindi*\n   - **Why It Passed My Cut:** A timeless emotional rollercoaster with genuine wit, memorable characters, and heart.\n   - **Where to Watch:** Prime Video / YouTube\n\n2. **Superbad (2007)** — *IMDb 7.6 • English*\n   - **Why It Passed My Cut:** The definitive coming-of-age buddy comedy with authentic dialogue and legendary comedic beats.\n   - **Where to Watch:** SonyLIV\n\n3. **Hera Pheri (2000)** — *IMDb 8.2 • Hindi*\n   - **Why It Passed My Cut:** The holy grail of Bollywood comedy timing; endlessly quotable.`,
        action: {
          type: 'SET_FILTERS',
          label: 'Apply Comedy Filters 😂',
          payload: {
            genres: ['Comedy'],
            languages: ['Hindi', 'English'],
          },
        },
      };
    }

    return {
      text: `✨ **Hello! I am LET FIND TOGETHER** — your highly selective AI movie curator and room commander.\n\nI uphold strict standards: **I only recommend cinema that earns its runtime (typically 7.5+ IMDb or high Rotten Tomatoes)**. No boring fillers, only films that leave your group raving.\n\n**Here is what I can do for you right now:**\n- 🎬 **Create a Room:** Tell me *"Create a room for Action & Sci-Fi"* and I'll generate it instantly.\n- 🎯 **Selective Curation:** Ask for *"Best Hindi comedies"*, *"Smart horror"*, or *"9+ IMDb thrillers"*.\n- ⚙️ **Configure Filters:** Ask to change languages, runtimes, or genres.\n- 🚀 **Launch Session:** Tell me *"Let's start swiping"* and I'll queue the deck!`,
      action: {
        type: 'CREATE_ROOM',
        label: `Generate Selective Room #${randomCode} 🎬`,
        payload: {
          roomCode: randomCode,
          genres: ['Comedy', 'Action', 'Horror'],
          languages: ['Hindi', 'English'],
          minRating: 7.5,
        },
      },
    };
  };

  if (!ai) {
    const fallback = generateFallbackResponse(message);
    return res.json(fallback);
  }

  try {
    const systemInstruction = `You are "LET FIND TOGETHER", an elite, highly selective AI movie curation & room concierge for the CineMatch group movie matcher app.

YOUR PRIMARY DIRECTIVE: BE HIGHLY SELECTIVE
- Users come to CineMatch because picking movies with friends is hard. Your role is to elevate their taste and guarantee an exceptional movie experience.
- DO NOT recommend mediocre, generic, or low-rated movies. Every film must meet a high bar (typically 7.5+ IMDb, 80%+ Rotten Tomatoes, or award-winning cult status).
- For each recommendation, provide:
  1. Title & Year
  2. IMDb / Rotten Tomatoes rating
  3. "Selective Verdict": A sharp 1-2 sentence reason explaining why this film is extraordinary and why a group will love it.
  4. Where to stream (e.g. Netflix, Prime Video, JioCinema, Hotstar, YouTube Movies).

ROOM MANAGEMENT & APP CONTROL:
You are able to create rooms, switch filters, and control CineMatch directly!
When the user asks to create a room, set filters, or start swiping:
Include a structured ACTION line at the end of your response:
ACTION: {"type": "CREATE_ROOM", "roomCode": "XXXX", "genres": ["Comedy", "Action"], "languages": ["Hindi", "English"], "minRating": 7.5, "label": "Create Room #XXXX 🎬"}
or
ACTION: {"type": "SET_FILTERS", "genres": ["Horror"], "languages": ["Hindi", "English"], "label": "Set Horror Filters 👻"}
or
ACTION: {"type": "START_SWIPING", "label": "Start Swiping 🎬"}

Keep your tone enthusiastic, sharp, stylish, and cinephilic.
Current active room: #${roomContext?.code || '8492'} (Host: ${roomContext?.hostName || 'Alex'}, Filters: ${roomContext?.filters?.genres?.join(', ') || 'Action, Comedy'}).`;

    // Select model based on modelMode parameter:
    // User metadata says: "Use gemini-3.5-flash (with googleSearch tool) for Search Grounding"
    // "Use gemini-3.1-pro-preview for particularly complex tasks, gemini-3.5-flash for general tasks, and gemini-3.1-flash-lite for tasks that should happen fast."
    let modelName = 'gemini-3.5-flash';
    if (modelMode === 'fast') {
      modelName = 'gemini-3.1-flash-lite';
    }

    // Format chat history into messages format
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.sender === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        // Search grounding with Google Search tool as requested
        tools: [{ googleSearch: {} }],
      },
    });

    let fullText = response.text || '';
    let parsedAction: any = null;

    // Extract ACTION block if present
    const actionMatch = fullText.match(/ACTION:\s*(\{.*\})/);
    if (actionMatch && actionMatch[1]) {
      try {
        parsedAction = JSON.parse(actionMatch[1]);
        // Remove the raw ACTION line from the clean conversational text
        fullText = fullText.replace(/ACTION:\s*\{.*\}/, '').trim();

        // If it's a CREATE_ROOM action, register it in server memory
        if (parsedAction.type === 'CREATE_ROOM' && parsedAction.roomCode) {
          const code = parsedAction.roomCode;
          if (!rooms[code]) {
            rooms[code] = {
              id: `room-${code}`,
              code,
              hostId: 'u-alex',
              filters: {
                genres: parsedAction.genres || ['Action', 'Comedy'],
                languages: parsedAction.languages || ['Hindi', 'English'],
                minRating: parsedAction.minRating || 7.5,
                runtimeRange: '90 - 120m',
              },
              users: [
                {
                  id: 'u-alex',
                  name: 'Alex Rivera',
                  username: '@cine_alex',
                  avatar:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDCIdq2nFZvmpS-u3D7k4GTKfh3_Nbx7xLNooI9T8qKA-w7AsnRV4wQw70oSxmmR2DDsaHAEjggE6Ta4T0u04kRwBa0tBKGNW1xqkyGgZ7acoCkNmH5vSfcE-109HOeVcLNOrN87X1o0Pp-OCQGqfMTrGYNIKRO7piDmzzb_Fp7jaPlRpJWCu0_2F5WQqFMsgzRbMc5HdfWFFgo-M7Hg5Z8RY3neABpXPUbIgV_KfQlOpW8RQO80hnS',
                  role: 'host',
                  isReady: true,
                  statusText: 'Created via LET FIND TOGETHER AI',
                },
              ],
              votes: {},
              matches: [],
              matchHistory: [],
              status: 'lobby',
              currentMovieIndex: 0,
              vibe: {
                emoji: '✨',
                text: 'Created by LET FIND TOGETHER AI',
                author: 'LET FIND TOGETHER',
                timestamp: Date.now(),
              },
            };
          }
        }
      } catch (err) {
        console.warn('Could not parse action JSON from model output:', err);
      }
    }

    // Extract grounding sources from search grounding chunks if returned
    const sources: Array<{ title: string; url: string }> = [];
    const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk?.web?.uri) {
          sources.push({
            title: chunk.web.title || new URL(chunk.web.uri).hostname,
            url: chunk.web.uri,
          });
        }
      }
    }

    res.json({
      text: fullText,
      action: parsedAction,
      sources: sources.slice(0, 4),
    });
  } catch (err) {
    console.error('Error invoking Gemini model:', err);
    // Safe graceful fallback with selective output
    const fallback = generateFallbackResponse(message);
    res.json(fallback);
  }
});

// WebSocket Server attached to the same HTTP server on port 3000
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode = '';
  let currentUserId = '';

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, roomCode, payload } = data;

      if (type === 'JOIN_ROOM') {
        currentRoomCode = roomCode;
        currentUserId = payload?.user?.id || '';

        if (!roomConnections.has(roomCode)) {
          roomConnections.set(roomCode, new Set());
        }
        roomConnections.get(roomCode)!.add(ws);

        let room = rooms[roomCode];
        if (!room) {
          room = {
            id: `room-${roomCode}`,
            code: roomCode,
            hostId: payload?.user?.id || 'host',
            filters: {
              genres: ['Action', 'Comedy', 'Horror', 'Sci-Fi'],
              languages: ['Hindi', 'English', 'South Indian (Telugu/Tamil)'],
              minRating: 7.5,
              runtimeRange: '90 - 120m',
            },
            users: payload?.user ? [payload.user] : [],
            votes: {},
            matches: [],
            matchHistory: [],
            status: 'lobby',
            currentMovieIndex: 0,
            vibe: {
              emoji: '🍿',
              text: 'Room opened! Ready to swipe and watch movies.',
              author: payload?.user?.name || 'Host',
              timestamp: Date.now(),
            },
          };
          rooms[roomCode] = room;
        }

        if (room && payload?.user) {
          if (!room.users.find((u) => u.id === payload.user.id)) {
            room.users.push(payload.user);
          }
          broadcastToRoom(roomCode, { type: 'ROOM_UPDATED', room });
        } else if (room) {
          ws.send(JSON.stringify({ type: 'ROOM_UPDATED', room }));
        }
      }

      if (type === 'VOTE') {
        const { movieId, vote, movieDetails, userId } = payload;
        const room = rooms[roomCode];
        if (!room) return;

        if (!room.votes[movieId]) {
          room.votes[movieId] = {
            movieId,
            likedBy: [],
            passedBy: [],
            superlikedBy: [],
          };
        }

        const voteRecord = room.votes[movieId];
        const voter = userId || currentUserId;

        if (vote === 'like' || vote === 'super') {
          if (!voteRecord.likedBy.includes(voter)) {
            voteRecord.likedBy.push(voter);
          }
          if (vote === 'super' && !voteRecord.superlikedBy.includes(voter)) {
            voteRecord.superlikedBy.push(voter);
          }
        } else if (vote === 'pass') {
          if (!voteRecord.passedBy.includes(voter)) {
            voteRecord.passedBy.push(voter);
          }
        }

        // Real-Time Matching Algorithm:
        // A match occurs when every active participant has liked the movie
        const isUnanimousMatch =
          room.users.length > 0 &&
          room.users.every((u) => voteRecord.likedBy.includes(u.id));

        if (isUnanimousMatch && !room.matches.includes(movieId)) {
          room.matches.push(movieId);
          room.status = 'matched';

          // Add to match history
          const newHistoryItem: MatchHistoryItem = {
            id: `h-${Date.now()}`,
            movieId,
            title: movieDetails?.title || 'Matched Film',
            year: movieDetails?.year || 2024,
            rating: movieDetails?.imdbRating || 8.5,
            genreText: movieDetails?.genres?.join(' • ') || 'Feature Film',
            posterUrl: movieDetails?.posterUrl || '',
            matchedAt: 'Just now',
            watched: false,
          };
          room.matchHistory.unshift(newHistoryItem);

          broadcastToRoom(roomCode, {
            type: 'MATCH_FOUND',
            movieId,
            movie: movieDetails,
            likedBy: voteRecord.likedBy,
            room,
          });
        } else {
          broadcastToRoom(roomCode, {
            type: 'VOTE_RECORDED',
            movieId,
            voteRecord,
            voter,
            room,
          });
        }
      }

      if (type === 'UPDATE_FILTERS') {
        const { filters } = payload;
        const room = rooms[roomCode];
        if (room) {
          room.filters = { ...room.filters, ...filters };
          broadcastToRoom(roomCode, { type: 'ROOM_UPDATED', room });
        }
      }

      if (type === 'SEND_VIBE') {
        const { emoji, text, author } = payload;
        const room = rooms[roomCode];
        if (room) {
          room.vibe = {
            emoji,
            text,
            author,
            timestamp: Date.now(),
          };
          broadcastToRoom(roomCode, {
            type: 'VIBE_SHARED',
            vibe: room.vibe,
            room,
          });
        }
      }

      if (type === 'TOGGLE_READY') {
        const { userId } = payload;
        const room = rooms[roomCode];
        if (room) {
          const user = room.users.find((u) => u.id === userId);
          if (user) {
            user.isReady = !user.isReady;
            broadcastToRoom(roomCode, { type: 'ROOM_UPDATED', room });
          }
        }
      }

      if (type === 'START_SESSION') {
        const room = rooms[roomCode];
        if (room) {
          room.status = 'swiping';
          broadcastToRoom(roomCode, { type: 'SESSION_STARTED', room });
        }
      }

      if (type === 'TOGGLE_WATCHED') {
        const { historyId } = payload;
        const room = rooms[roomCode];
        if (room) {
          const item = room.matchHistory.find((h) => h.id === historyId);
          if (item) {
            item.watched = !item.watched;
            broadcastToRoom(roomCode, { type: 'ROOM_UPDATED', room });
          }
        }
      }

      // Real-Time Watch Party & Synchronized Video Player
      if (type === 'WATCH_PARTY_START') {
        const { movie, initiator } = payload;
        const room = rooms[roomCode];
        if (room) {
          room.status = 'watching';
          room.watchParty = {
            movieId: movie?.id || 'm-watch',
            movieTitle: movie?.title || 'Selected Feature',
            moviePoster: movie?.posterUrl || '',
            isPlaying: true,
            currentTime: 0,
            duration: 180, // Demo player default
            lastUpdatedBy: initiator?.name || 'Party Host',
            updatedAt: Date.now(),
          };
          broadcastToRoom(roomCode, {
            type: 'WATCH_PARTY_STARTED',
            movie,
            watchParty: room.watchParty,
            room,
          });
        }
      }

      // Synchronous Play, Pause & Seek across all participants (Firebase Realtime / WebSocket Synced)
      if (type === 'WATCH_PARTY_SYNC') {
        const { isPlaying, currentTime, duration, initiator } = payload;
        const room = rooms[roomCode];
        if (room && room.watchParty) {
          room.watchParty.isPlaying = isPlaying;
          room.watchParty.currentTime = currentTime;
          if (duration) room.watchParty.duration = duration;
          room.watchParty.lastUpdatedBy = initiator?.name || 'Participant';
          room.watchParty.updatedAt = Date.now();

          broadcastToRoom(roomCode, {
            type: 'WATCH_PARTY_SYNCED',
            watchParty: room.watchParty,
            action: isPlaying ? 'PLAY' : 'PAUSE',
            initiator: initiator?.name || 'Participant',
            currentTime,
          });
        }
      }

      // Voice Call Peer Mesh State (WebRTC audio mute/unmute/speaking indicator)
      if (type === 'VOICE_STATE_CHANGE') {
        const { userId, isMuted, isSpeaking } = payload;
        broadcastToRoom(roomCode, {
          type: 'VOICE_STATE_UPDATED',
          userId,
          isMuted,
          isSpeaking,
        });
      }

      // Floating Live Reaction during Watch Party
      if (type === 'WATCH_PARTY_REACTION') {
        const { userId, userName, emoji } = payload;
        broadcastToRoom(roomCode, {
          type: 'WATCH_PARTY_REACTION_RECEIVED',
          id: `react-${Date.now()}-${Math.random()}`,
          userId,
          userName,
          emoji,
          timestamp: Date.now(),
        });
      }

      if (type === 'WATCH_PARTY_LEAVE') {
        const room = rooms[roomCode];
        if (room) {
          room.status = 'matched';
          broadcastToRoom(roomCode, {
            type: 'WATCH_PARTY_ENDED',
            room,
          });
        }
      }

      // Host Movie Website Screen Sharing & WebRTC signaling
      if (type === 'WATCH_PARTY_SCREEN_SHARE') {
        const { isSharing, presenterId, presenterName, streamUrl } = payload;
        const room = rooms[roomCode];
        if (room && room.watchParty) {
          room.watchParty.screenShare = isSharing
            ? {
                isSharing: true,
                presenterId,
                presenterName,
                streamUrl,
                startedAt: Date.now(),
              }
            : undefined;
        }
        broadcastToRoom(roomCode, {
          type: 'WATCH_PARTY_SCREEN_SHARE_UPDATED',
          isSharing,
          presenterId,
          presenterName,
          streamUrl,
          watchParty: room?.watchParty,
        });
      }

      if (type === 'WEBRTC_SIGNAL') {
        const { targetUserId, signal, fromUserId, fromUserName } = payload;
        broadcastToRoom(roomCode, {
          type: 'WEBRTC_SIGNAL_RECEIVED',
          targetUserId,
          signal,
          fromUserId,
          fromUserName,
        });
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode && roomConnections.has(currentRoomCode)) {
      roomConnections.get(currentRoomCode)!.delete(ws);
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CineMatch server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
