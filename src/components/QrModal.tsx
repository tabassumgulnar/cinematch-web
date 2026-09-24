import React from 'react';
import { QrCode, X, Copy } from 'lucide-react';

interface QrModalProps {
  roomCode: string;
  onClose: () => void;
  onCopy: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ roomCode, onClose, onCopy }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="w-full max-w-sm bg-gray-950/90 rounded-3xl border border-white/15 p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95 backdrop-blur-2xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-600/20 flex items-center justify-center text-rose-400 border border-rose-500/30">
          <QrCode className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white font-display">Scan to Join Room</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Point smartphone camera to connect to Room #{roomCode}
          </p>
        </div>

        {/* QR visual representation */}
        <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-white/10">
          <svg
            className="w-44 h-44"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="5" y="5" width="26" height="26" rx="4" fill="#030712" />
            <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
            <rect x="13" y="13" width="10" height="10" rx="1" fill="#e50914" />

            <rect x="69" y="5" width="26" height="26" rx="4" fill="#030712" />
            <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
            <rect x="77" y="13" width="10" height="10" rx="1" fill="#e50914" />

            <rect x="5" y="69" width="26" height="26" rx="4" fill="#030712" />
            <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
            <rect x="13" y="77" width="10" height="10" rx="1" fill="#e50914" />

            <rect x="36" y="8" width="6" height="6" fill="#030712" />
            <rect x="46" y="8" width="6" height="6" fill="#030712" />
            <rect x="56" y="8" width="6" height="6" fill="#030712" />
            <rect x="36" y="18" width="8" height="6" fill="#030712" />
            <rect x="48" y="18" width="6" height="8" fill="#030712" />

            <rect x="8" y="36" width="6" height="8" fill="#030712" />
            <rect x="18" y="36" width="8" height="6" fill="#030712" />
            <rect x="8" y="48" width="6" height="6" fill="#030712" />

            <rect x="36" y="36" width="28" height="28" rx="3" fill="#030712" />
            <circle cx="50" cy="50" r="8" fill="#e50914" />

            <rect x="68" y="36" width="6" height="8" fill="#030712" />
            <rect x="78" y="44" width="8" height="6" fill="#030712" />
            <rect x="86" y="36" width="6" height="6" fill="#030712" />

            <rect x="36" y="68" width="8" height="6" fill="#030712" />
            <rect x="48" y="78" width="8" height="6" fill="#030712" />
            <rect x="58" y="68" width="6" height="8" fill="#030712" />
            <rect x="68" y="68" width="6" height="6" fill="#030712" />
            <rect x="78" y="76" width="8" height="8" fill="#030712" />
            <rect x="86" y="68" width="6" height="8" fill="#030712" />
          </svg>
        </div>

        <div className="flex items-center gap-2 bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 w-full justify-between">
          <span className="text-xs font-mono text-rose-300 truncate">
            {window.location.origin}/?room={roomCode}
          </span>
          <button
            onClick={onCopy}
            className="text-xs font-bold text-rose-400 hover:text-white transition cursor-pointer flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="w-full h-11 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
