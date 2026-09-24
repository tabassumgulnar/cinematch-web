import React, { useState } from 'react';
import { Room, User } from '../types';
import { Users, Copy, QrCode, Play, Sparkles, KeyRound, ArrowRight, Check, MessageSquare, PlusCircle, Share2 } from 'lucide-react';
import { RoomChat } from './RoomChat';

interface SessionLobbyProps {
  room: Room;
  currentUser: User;
  onEditRules: () => void;
  onCopyCode: () => void;
  onOpenQR: () => void;
  onInviteFriend: () => void;
  onToggleReady: (userId: string) => void;
  onSendVibe: (emoji: string, text: string) => void;
  onStartSession: () => void;
  onOpenLetFindTogether?: () => void;
  onJoinRoomCode?: (code: string) => void;
  onCreateNewRoom?: () => void;
}

export const SessionLobby: React.FC<SessionLobbyProps> = ({
  room,
  currentUser,
  onEditRules,
  onCopyCode,
  onOpenQR,
  onToggleReady,
  onSendVibe,
  onStartSession,
  onJoinRoomCode,
  onCreateNewRoom,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);

  const readyCount = room.users.filter((u) => u.isReady).length;
  const totalCount = room.users.length;

  const vibeOptions = [
    { emoji: '🍿', label: 'Snacks', text: 'Popcorn is ready!' },
    { emoji: '🚀', label: "Let's go", text: 'Hyped for movie night!' },
    { emoji: '🍕', label: 'Pizza late', text: 'Waiting for food delivery!' },
    { emoji: '😱', label: 'Spooky', text: 'Craving psychological thrills!' },
  ];

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace('#', '');
    if (!clean) {
      setJoinError('Please enter a room code');
      return;
    }
    setJoinError('');
    onJoinRoomCode?.(clean);
    setInputCode('');
  };

  const handleCopyClick = () => {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pb-28 pt-4 flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight flex items-center gap-2">
            <span>Movie Night Lobby</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
              Live Synced
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Invite friends to join Room #{room.code} or enter a code to sync.
          </p>
        </div>

        {/* Primary CTA: Launch Swiping Deck */}
        <button
          onClick={onStartSession}
          type="button"
          className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#E50914] via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-rose-900/40 hover:shadow-rose-700/60 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Swiping Deck</span>
        </button>
      </div>

      {/* Main Grid: Frosted Glass Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Room Code Glass Card */}
          <div className="relative overflow-hidden bg-white/5 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col gap-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Party Room Code
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready for Friends</span>
              </div>
            </div>

            {/* Room Code Display */}
            <div className="flex items-center justify-between bg-black/40 rounded-xl p-3.5 border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Share code</span>
                <span className="text-3xl font-black font-mono tracking-wider text-white">
                  #{room.code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyClick}
                  type="button"
                  className="h-10 px-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Copy invite link"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onOpenQR}
                  type="button"
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center border border-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Show QR Code"
                >
                  <QrCode className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyClick}
                type="button"
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{copied ? 'Copied!' : 'Share Link'}</span>
              </button>
              {onCreateNewRoom && (
                <button
                  onClick={onCreateNewRoom}
                  type="button"
                  className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>New Room</span>
                </button>
              )}
            </div>

            {room.users.length <= 1 && (
              <div className="bg-white/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  You are the first in this room! Share code <strong className="text-white font-mono">#{room.code}</strong> with friends or open in a second browser window to test live syncing.
                </p>
              </div>
            )}
          </div>

          {/* Join Another Room Card */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col gap-3.5 border border-white/10">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold tracking-tight">Join a Friend's Room</h2>
            </div>
            <p className="text-xs text-slate-400">
              Have a code from someone else? Enter it below:
            </p>

            <form onSubmit={handleJoinSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                  #
                </span>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="e.g. 8492"
                  maxLength={8}
                  className="w-full h-11 pl-7 pr-3 bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl text-white font-mono font-bold outline-none text-sm transition uppercase placeholder:text-slate-600"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {joinError && <span className="text-xs text-rose-400 font-semibold">{joinError}</span>}
          </div>

          {/* Room Preferences Summary */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 shadow-xl flex flex-col gap-2.5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Active Preferences
              </span>
              <button
                onClick={onEditRules}
                type="button"
                className="text-xs text-rose-400 hover:text-white font-semibold cursor-pointer"
              >
                Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs text-slate-300">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                🎬 {room.filters.genres.slice(0, 3).join(', ')}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                🌐 {room.filters.languages.slice(0, 2).join(', ')}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                ⭐ IMDb {room.filters.minRating}+
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Participants Card */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col gap-4 border border-white/10">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Connected Participants ({room.users.length})
                </h2>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">
                {readyCount} of {totalCount} Ready
              </span>
            </div>

            {/* Members List */}
            <div className="flex flex-col gap-2">
              {room.users.map((user) => {
                const isMe = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-medium">
                              You
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {user.statusText || 'Connected'}
                        </span>
                      </div>
                    </div>

                    {isMe ? (
                      <button
                        onClick={() => onToggleReady(user.id)}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                          user.isReady
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/10 hover:bg-white/20 text-slate-300'
                        }`}
                      >
                        {user.isReady ? '✓ Ready' : 'Mark Ready'}
                      </button>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          user.isReady ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {user.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Room Vibe Selector */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col gap-3 border border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Send Room Vibe</h2>
            </div>
            <p className="text-xs text-slate-400">
              Broadcast a quick status update to everyone in the room:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {vibeOptions.map((v) => (
                <button
                  key={v.label}
                  onClick={() => onSendVibe(v.emoji, v.text)}
                  type="button"
                  className="p-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-white/20 text-left transition active:scale-95 cursor-pointer flex flex-col gap-1"
                >
                  <span className="text-xl">{v.emoji}</span>
                  <strong className="text-xs text-white">{v.label}</strong>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{v.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Room Chat */}
          <div className="w-full">
            <RoomChat room={room} currentUser={currentUser} onSendVibe={onSendVibe} />
          </div>
        </div>
      </div>
    </div>
  );
};
