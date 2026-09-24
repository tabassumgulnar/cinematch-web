import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface FloatingAiBotButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingAiBotButton: React.FC<FloatingAiBotButtonProps> = ({
  onClick,
  isOpen,
}) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 animate-bounce-subtle">
      <button
        id="btn-open-let-find-together"
        onClick={onClick}
        className="group relative flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-[#161922] text-white border border-[#363b4e] shadow-[0_8px_30px_rgba(229,9,20,0.35)] hover:shadow-[0_8px_35px_rgba(229,9,20,0.55)] transition-all duration-300 hover:scale-105 active:scale-95"
      >
        {/* Glowing aura */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e50914] via-[#f59e0b] to-[#ec4899] rounded-full blur-sm opacity-70 group-hover:opacity-100 transition duration-300 -z-10 animate-pulse" />

        {/* Icon with gradient badge */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#e50914] to-[#f59e0b] flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
        </div>

        {/* Labels */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs tracking-wider text-white">
              LET FIND TOGETHER
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-[10px] text-amber-300 font-semibold leading-tight">
            Create Room & Selective AI
          </span>
        </div>
      </button>
    </div>
  );
};
