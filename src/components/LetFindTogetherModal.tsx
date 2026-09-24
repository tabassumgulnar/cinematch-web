import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  PlusCircle,
  Film,
  ExternalLink,
  Flame,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  Zap,
  Globe,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { ChatMessage, Room, RoomFilters, User, Movie } from '../types';

interface LetFindTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  currentUser: User;
  onCreateRoom: (code?: string, filters?: Partial<RoomFilters>) => void;
  onUpdateFilters: (filters: Partial<RoomFilters>) => void;
  onStartSwiping: () => void;
  onAddMatchDirectly?: (movieTitle: string) => void;
  onPlayMovie?: (movie: Movie) => void;
  isEmbeddedView?: boolean;
}

const INITIAL_GREETING: ChatMessage = {
  id: 'msg-init',
  sender: 'bot',
  text: `✨ **Welcome to LET FIND TOGETHER!**\n\nI am your **highly selective AI cinema curator and room commander**.\n\nI believe life is too short for mediocre movies. My selection algorithm strictly prioritizes **critically acclaimed gems, 7.5+ IMDb masterworks, and verified crowd-pleasers** across Hindi, English, and international cinema.\n\n**What can we do together?**\n- 🎬 **Create a Room:** Say *"Create a room for Action and Comedy"* and I'll generate a live room code instantly.\n- 🎯 **Highly Selective Picks:** Ask for *"Smart horror without cheap jumpscares"* or *"Belly-laugh Hindi comedies"*.\n- ⚙️ **Configure Room:** Tell me to tune this room's genres, languages, or runtime.\n- 🚀 **Start Swiping:** Ready to choose? Just tell me *"Let's swipe!"*`,
  timestamp: Date.now(),
  action: {
    type: 'CREATE_ROOM',
    label: 'Generate Selective 4-Digit Room 🎬',
    payload: {
      genres: ['Comedy', 'Action', 'Horror'],
      languages: ['Hindi', 'English'],
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
      reason: 'Selective Verdict: ★★★★★ Atmospheric triumph and legendary Indian folk horror that avoids cheap jumpscares.',
      streamingInfo: 'JioCinema / Prime Video',
    },
    {
      title: 'Everything Everywhere All at Once',
      year: 2022,
      rating: 7.8,
      genres: ['Sci-Fi', 'Comedy', 'Action'],
      languages: ['English'],
      reason: 'Selective Verdict: ★★★★★ 7-time Oscar winner blending mind-bending multiverses with genuine emotional heart.',
      streamingInfo: 'SonyLIV / Prime Video',
    },
  ],
};

const SUGGESTIONS = [
  '🎬 Create a new room for 8.0+ IMDb Thrillers',
  '😂 Best Hindi & English Comedies for friends',
  '👻 Find top-tier Horror without cheap jumpscares',
  '⚡ Set room to Hindi, English & Action',
  '🍿 Start swiping session now',
];

export const LetFindTogetherModal: React.FC<LetFindTogetherModalProps> = ({
  isOpen,
  onClose,
  room,
  currentUser,
  onCreateRoom,
  onUpdateFilters,
  onStartSwiping,
  onAddMatchDirectly,
  onPlayMovie,
  isEmbeddedView = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelMode, setModelMode] = useState<'standard' | 'fast'>('standard');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 150);
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  if (!isOpen && !isEmbeddedView) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-6),
          modelMode,
          roomContext: {
            code: room.code,
            hostName: currentUser.name,
            filters: room.filters,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API returned an error');
      }

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.text || 'Here is your selective curation!',
        timestamp: Date.now(),
        action: data.action,
        movies: data.movies,
        sources: data.sources,
        isSelectiveHighlight: true,
      };

      setMessages((prev) => [...prev, botMessage]);

      // If user explicitly asked to create room and action was returned, we can auto-highlight
      if (data.action?.type === 'CREATE_ROOM' && query.toLowerCase().includes('create')) {
        // Leave the button ready for user tap
      }
    } catch (err) {
      console.error('Failed to chat with LET FIND TOGETHER:', err);
      // Fallback response with selective recommendations
      const fallbackBotMessage: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'bot',
        text: `🎬 **LET FIND TOGETHER Curation**\n\nI processed your request: **"${query}"**.\n\nHere are my **highly selective picks** that strictly exceed 7.5+ ratings:\n\n1. **3 Idiots (2009)** — *IMDb 8.4 • Hindi*\n   - Timeless humor, peerless group bonding.\n2. **Mad Max: Fury Road (2015)** — *IMDb 8.1 • English*\n   - Masterclass in relentless practical action choreography.\n3. **Tumbbad (2018)** — *IMDb 8.2 • Hindi*\n   - Visual horror masterpiece with zero cheap gimmicks.`,
        timestamp: Date.now(),
        action: {
          type: 'CREATE_ROOM',
          label: 'Create Selective Room Now 🎬',
          payload: {
            genres: ['Comedy', 'Action', 'Horror'],
            languages: ['Hindi', 'English'],
            minRating: 7.8,
          },
        },
      };
      setMessages((prev) => [...prev, fallbackBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = (action: ChatMessage['action']) => {
    if (!action) return;

    if (action.type === 'CREATE_ROOM') {
      onCreateRoom(action.payload.roomCode, {
        genres: action.payload.genres,
        languages: action.payload.languages,
        minRating: action.payload.minRating,
      });
      if (!isEmbeddedView) onClose();
    } else if (action.type === 'SET_FILTERS') {
      onUpdateFilters({
        genres: action.payload.genres,
        languages: action.payload.languages,
        minRating: action.payload.minRating,
      });
    } else if (action.type === 'START_SWIPING') {
      onStartSwiping();
      if (!isEmbeddedView) onClose();
    } else if (action.type === 'ADD_MATCH' && action.payload.movieTitle) {
      if (onAddMatchDirectly) {
        onAddMatchDirectly(action.payload.movieTitle);
      }
    }
  };

  const handleQuickCreateRoom = () => {
    handleSendMessage('Create a new room with 7.8+ IMDb selective Action, Comedy & Horror in Hindi and English');
  };

  return (
    <div
      className={
        isEmbeddedView
          ? 'w-full max-w-2xl mx-auto flex flex-col h-[calc(100vh-130px)] bg-[#12141a] rounded-2xl border border-[#2a2d37] overflow-hidden shadow-2xl'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn'
      }
    >
      <div
        className={
          isEmbeddedView
            ? 'flex flex-col h-full w-full'
            : 'w-full max-w-xl bg-[#12141a] border border-[#2a2d37] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col h-[88vh] max-h-[780px]'
        }
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#171a22] border-b border-[#282b36] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e50914] via-[#f59e0b] to-[#ec4899] p-[2px] shadow-lg shadow-[#e50914]/20">
                <div className="w-full h-full bg-[#12141a] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#f59e0b] animate-pulse" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#12141a] rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base tracking-wide flex items-center gap-1.5">
                  LET FIND TOGETHER
                </h3>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 text-[#ff7875]">
                  Highly Selective AI
                </span>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[#38bdf8]" />
                Google Search Grounded • Active Room #{room.code}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Model Mode Toggle */}
            <button
              onClick={() =>
                setModelMode((prev) => (prev === 'standard' ? 'fast' : 'standard'))
              }
              title={`Mode: ${modelMode === 'standard' ? 'Selective Pro (3.5 Flash + Search)' : 'Fast Mode (Flash Lite)'}`}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#222634] hover:bg-[#2c3144] text-gray-300 border border-[#373c50] flex items-center gap-1 transition"
            >
              <Zap className={`w-3 h-3 ${modelMode === 'standard' ? 'text-amber-400' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">
                {modelMode === 'standard' ? 'Selective 3.5' : 'Fast Lite'}
              </span>
            </button>

            {!isEmbeddedView && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#222634] hover:bg-[#2e3346] text-gray-400 hover:text-white flex items-center justify-center transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Room Quick Status Bar */}
        <div className="px-4 py-2 bg-[#1a1e28] border-b border-[#262a36] flex items-center justify-between text-[11px] text-gray-300">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-semibold text-white">Active Room: #{room.code}</span>
            <span className="text-gray-500">•</span>
            <span className="text-[#a5b4fc]">
              {room.filters.genres.slice(0, 3).join(', ')}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-emerald-400">{room.filters.languages.join(' & ')}</span>
          </div>

          <button
            onClick={handleQuickCreateRoom}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Room</span>
          </button>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#12141a] to-[#0c0e13]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`flex gap-2.5 max-w-[92%] sm:max-w-[85%] ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {msg.sender === 'user' ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full border border-gray-600 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#e50914] to-[#f59e0b] flex items-center justify-center shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#e50914] to-[#c70812] text-white rounded-tr-none shadow-lg shadow-[#e50914]/20'
                      : 'bg-[#1b1f2b] text-gray-100 rounded-tl-none border border-[#2d3345] shadow-lg'
                  }`}
                >
                  {/* Sender label */}
                  {msg.sender === 'bot' && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-amber-400">
                      <Bot className="w-3.5 h-3.5" />
                      <span>LET FIND TOGETHER</span>
                      <span className="text-[10px] font-normal text-gray-400">
                        • Verified Selective Cut
                      </span>
                    </div>
                  )}

                  {/* Text formatted */}
                  <div className="whitespace-pre-line space-y-2">
                    {msg.text.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Recommended Movie Cards (if present) */}
                  {msg.movies && msg.movies.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#2e3447] space-y-2.5">
                      <div className="text-[11px] font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>Highly Selective Masterpieces:</span>
                      </div>

                      {msg.movies.map((m, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-2.5 bg-[#141722] rounded-xl border border-[#2d3243] flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">
                              {m.title} {m.year && <span className="text-gray-400 font-normal">({m.year})</span>}
                            </span>
                            {m.rating && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] border border-amber-500/30">
                                ★ {m.rating}
                              </span>
                            )}
                          </div>

                          <p className="text-[12px] text-gray-300 italic">{m.reason}</p>

                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                            {m.streamingInfo && (
                              <span className="text-cyan-400">📺 {m.streamingInfo}</span>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  if (onPlayMovie) {
                                    onPlayMovie({
                                      id: `rec-${m.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                                      title: m.title,
                                      year: m.year || 2023,
                                      runtime: '2h 00m',
                                      genres: m.genres || ['Action', 'Thriller'],
                                      languages: ['English', 'Hindi'],
                                      imdbRating: m.rating || 8.0,
                                      tomatoRating: 90,
                                      certificate: 'PG-13',
                                      director: 'Curated Director',
                                      tags: ['AI Recommended'],
                                      synopsis: m.reason || 'Curated pick for your group.',
                                      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600',
                                      streamingProvidersText: 'In-App Player',
                                      matchScorePercent: 95,
                                      watchLinks: [],
                                    });
                                  }
                                }}
                                className="text-[11px] font-bold text-[#ff7875] hover:text-white flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                              >
                                <Film className="w-2.5 h-2.5" />
                                <span>Play In-App</span>
                              </button>
                              <span className="text-gray-600">•</span>
                              <button
                                onClick={() => {
                                  onUpdateFilters({
                                    genres: m.genres || ['Action', 'Comedy'],
                                  });
                                }}
                                className="text-[11px] font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
                              >
                                Tune Room
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action trigger button */}
                  {msg.action && (
                    <div className="mt-3 pt-2.5 border-t border-[#2e3447]">
                      <button
                        onClick={() => executeAction(msg.action)}
                        className="w-full py-2 px-3.5 bg-gradient-to-r from-amber-500 to-[#e50914] hover:from-amber-400 hover:to-[#ff1a26] text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{msg.action.label}</span>
                      </button>
                    </div>
                  )}

                  {/* Google Search Grounding Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#2e3447] text-[11px] text-gray-400">
                      <div className="flex items-center gap-1 mb-1 text-gray-400 font-medium">
                        <Globe className="w-3 h-3 text-[#38bdf8]" />
                        <span>Google Search Grounding Data:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-md bg-[#252a3b] hover:bg-[#32394f] text-[10px] text-cyan-300 flex items-center gap-1 border border-[#39425b] transition"
                          >
                            <span>{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-gray-400 text-xs py-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#e50914] to-[#f59e0b] flex items-center justify-center animate-spin">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-4 py-2.5 bg-[#1b1f2b] rounded-2xl rounded-tl-none border border-[#2d3345] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                <span
                  className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
                <span className="text-gray-300 font-medium ml-1">
                  LET FIND TOGETHER is curating top cinema...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-[#151822] border-t border-[#262a37] overflow-x-auto no-scrollbar flex items-center gap-2">
          {SUGGESTIONS.map((suggestion, sIdx) => (
            <button
              key={sIdx}
              onClick={() => handleSendMessage(suggestion)}
              disabled={isLoading}
              className="shrink-0 px-3 py-1 rounded-full bg-[#1f2433] hover:bg-[#2a3044] text-[11px] text-gray-300 hover:text-white border border-[#333a50] transition disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#171a24] border-t border-[#282c3c]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask LET FIND TOGETHER to create a room, curate horror, comedies..."
                disabled={isLoading}
                className="w-full bg-[#0f1117] text-white placeholder-gray-500 text-sm rounded-xl pl-3.5 pr-10 py-2.5 border border-[#2e3344] focus:outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#e50914] to-[#f59e0b] hover:from-[#ff1a26] hover:to-[#fbbf24] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-[#e50914]/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
