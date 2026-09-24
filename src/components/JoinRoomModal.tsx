import React, { useState } from 'react';
import { X, Users, ArrowRight, Copy, Check, PlusCircle } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode: string;
  onJoinRoom: (code: string) => void;
  onCopyInviteLink: () => void;
  onCreateNewRoom?: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  currentRoomCode,
  onJoinRoom,
  onCopyInviteLink,
  onCreateNewRoom,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace('#', '');
    if (!clean) {
      setError('Please enter a valid room code (e.g. 8492)');
      return;
    }
    if (clean.length < 2) {
      setError('Room code must be at least 2 characters');
      return;
    }
    setError('');
    onJoinRoom(clean);
    setInputCode('');
    onClose();
  };

  const handleCopy = () => {
    onCopyInviteLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div
        className="relative w-full max-w-md bg-gray-950/90 border border-white/15 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white font-display">Join Movie Room</h2>
              <p className="text-xs text-slate-400">Swipe & sync movie picks with friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enter Code Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Enter Room Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                #
              </span>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. 8492"
                maxLength={8}
                className="w-full h-12 pl-8 pr-4 bg-black/40 border border-white/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-white font-mono text-lg font-bold tracking-widest outline-none transition-all placeholder:text-slate-600 uppercase"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="h-12 px-5 rounded-xl bg-gradient-to-r from-[#E50914] to-rose-600 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
            >
              <span>Join</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
          <p className="text-[11px] text-slate-400">
            Anyone in this room code will swipe and match together in real time.
          </p>
        </form>

        {/* Current Room Quick Share */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Current Room Code:</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              #{currentRoomCode}
            </span>
          </div>
          <button
            onClick={handleCopy}
            type="button"
            className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-98 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Invite Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Invite Link for Friends</span>
              </>
            )}
          </button>
          {onCreateNewRoom && (
            <button
              onClick={() => {
                onCreateNewRoom();
                onClose();
              }}
              type="button"
              className="w-full h-10 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-xs font-bold text-rose-300 flex items-center justify-center gap-2 border border-rose-500/30 transition-all active:scale-98 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Create New Room</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
