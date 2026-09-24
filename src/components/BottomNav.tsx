import React from 'react';
import { ActiveTab } from '../types';
import { Flame, Users, Sparkles, Heart, SlidersHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  matchesCount: number;
  onOpenLetFindTogether?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  matchesCount,
  onOpenLetFindTogether,
}) => {
  const tabs = [
    {
      id: 'swipe-deck' as ActiveTab,
      label: 'Swipe',
      icon: Flame,
    },
    {
      id: 'session-lobby' as ActiveTab,
      label: 'Lobby',
      icon: Users,
    },
    {
      id: 'let-find-together' as ActiveTab,
      label: 'AI Concierge',
      icon: Sparkles,
      isSpecial: true,
    },
    {
      id: 'movie-matches' as ActiveTab,
      label: 'Matches',
      icon: Heart,
      badge: matchesCount,
    },
    {
      id: 'genre-filters' as ActiveTab,
      label: 'Filters',
      icon: SlidersHorizontal,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-gray-950/85 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.8)]">
      <div className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'let-find-together' && onOpenLetFindTogether) {
                  onOpenLetFindTogether();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] gap-1 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-[#E50914] font-bold scale-105'
                  : tab.isSpecial
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    tab.isSpecial ? 'text-amber-400' : isActive ? 'text-[#E50914]' : ''
                  }`}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-[#E50914] text-white text-[10px] font-bold leading-tight shadow-md shadow-rose-950/50">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] shadow-sm shadow-rose-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
