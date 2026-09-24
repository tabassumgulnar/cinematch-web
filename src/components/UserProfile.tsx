import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Check, Edit2, LogOut, Bell, Moon, Bookmark, Award } from 'lucide-react';

interface UserProfileProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  availableUsers: User[];
  onShowToast: (msg: string, icon?: string) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  currentUser,
  onSwitchUser,
  availableUsers,
  onShowToast,
}) => {
  const [favoriteGenres, setFavoriteGenres] = useState([
    'Sci-Fi',
    'Thriller',
    'Dark Comedy',
    'Cyberpunk',
    'Neo-Noir',
  ]);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkCinemaMode, setDarkCinemaMode] = useState(true);
  const [autoSaveWatchlist, setAutoSaveWatchlist] = useState(true);

  const removeGenre = (genre: string) => {
    setFavoriteGenres((prev) => prev.filter((g) => g !== genre));
    onShowToast(`Removed ${genre} from taste profile`);
  };

  const addGenre = () => {
    const genresToAdd = ['Mind-Bending', 'Mystery', 'Psychological', 'Anime', 'Indie'];
    const next = genresToAdd.find((g) => !favoriteGenres.includes(g));
    if (next) {
      setFavoriteGenres((prev) => [...prev, next]);
      onShowToast(`Added ${next} to favorites`);
    } else {
      onShowToast('All suggested genres added');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-lg lg:max-w-3xl mx-auto px-4 pb-28 space-y-4 pt-4 animate-in fade-in duration-300">
      {/* Top Profile Header Card */}
      <section className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-md p-6 shadow-xl border border-white/10">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Avatar with Neon Crimson Glow */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#E50914] via-rose-500 to-amber-400 shadow-[0_0_24px_rgba(229,9,20,0.45)]">
              <img
                className="w-full h-full rounded-full object-cover"
                src={currentUser.avatar}
                alt={currentUser.name}
              />
            </div>
            <span className="absolute bottom-0 right-1 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-black shadow-md">
              <Check className="w-4 h-4 stroke-[3]" />
            </span>
          </div>

          <h1 className="text-2xl text-white font-black font-display">{currentUser.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{currentUser.username}</p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-amber-300 border border-amber-400/30">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold">
              Film Aficionado · VIP
            </span>
          </div>

          <button
            onClick={() => onShowToast('Profile editor active')}
            type="button"
            className="mt-3.5 inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-semibold active:scale-95 transition-all shadow-md border border-white/10 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Edit Profile</span>
          </button>
        </div>
      </section>

      {/* Switch Persona */}
      <section className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
            Switch Swiping Persona (Demo Sync)
          </span>
          <span className="text-xs text-emerald-400 font-semibold">Instant Sync</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {availableUsers.map((u) => {
            const isSelected = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                onClick={() => {
                  onSwitchUser(u);
                  onShowToast(`Active user: ${u.name}`);
                }}
                type="button"
                className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600/20 border-rose-500 text-white shadow-md'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-9 h-9 rounded-full object-cover mb-1 ring-1 ring-white/10"
                />
                <span className="text-[10px] font-semibold truncate w-full text-center">
                  {u.name.split(' ')[0]}
                </span>
                <span className="text-[9px] opacity-75">
                  {u.role === 'host' ? 'Host' : 'Member'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Preferences Section */}
      <section className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col gap-3">
        <h2 className="text-sm font-bold text-white">Taste Profile</h2>
        <div className="flex flex-wrap gap-2">
          {favoriteGenres.map((g) => (
            <button
              key={g}
              onClick={() => removeGenre(g)}
              type="button"
              className="px-3 py-1.5 rounded-full bg-[#E50914] text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-rose-950/40 active:scale-95 transition cursor-pointer"
            >
              <span>{g}</span>
              <span className="text-[10px]">✕</span>
            </button>
          ))}
          <button
            onClick={addGenre}
            type="button"
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-white/10 cursor-pointer"
          >
            <span>+ Add</span>
          </button>
        </div>
      </section>

      {/* Settings & Toggles */}
      <section className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg border border-white/10 divide-y divide-white/5">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Notifications</span>
              <span className="text-[11px] text-slate-400">Match & party alerts</span>
            </div>
          </div>
          <button
            onClick={() => setPushNotifications((v) => !v)}
            type="button"
            className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
              pushNotifications ? 'bg-emerald-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                pushNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Dark Cinema Mode</span>
              <span className="text-[11px] text-slate-400">OLED Dark glassmorphism</span>
            </div>
          </div>
          <button
            onClick={() => setDarkCinemaMode((v) => !v)}
            type="button"
            className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
              darkCinemaMode ? 'bg-emerald-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                darkCinemaMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Auto-Save Watchlist</span>
              <span className="text-[11px] text-slate-400">Save consensus movie picks</span>
            </div>
          </div>
          <button
            onClick={() => setAutoSaveWatchlist((v) => !v)}
            type="button"
            className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
              autoSaveWatchlist ? 'bg-emerald-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoSaveWatchlist ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Log Out */}
      <button
        onClick={() => onShowToast('Session refreshed')}
        type="button"
        className="w-full h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-rose-400 flex items-center justify-center gap-2 border border-rose-500/20 font-bold text-xs transition cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of Session</span>
      </button>
    </div>
  );
};
