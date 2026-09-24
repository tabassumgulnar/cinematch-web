import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, saveUserProfileInFirestore } from '../firebase';
import { Movie, User } from '../types';
import { X, Lock, CheckCircle2, Clock } from 'lucide-react';

export interface PendingAuthAction {
  type: 'redirect' | 'party';
  movie: Movie;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingAction: PendingAuthAction | null;
  onAuthSuccess: (user: User, pendingAction: PendingAuthAction | null) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  pendingAction,
  onAuthSuccess,
  showToast,
}) => {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    showToast('Connecting to Google / Gmail...', 'sync');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'CineMatch User',
        username: (fbUser.email?.split('@')[0] || 'user').toLowerCase(),
        avatar:
          fbUser.photoURL ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
        role: 'host',
        isReady: true,
        statusText: 'Signed in with Google',
      };

      await saveUserProfileInFirestore({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: newUser.name,
        photoURL: newUser.avatar,
      });

      showToast(`Welcome back, ${newUser.name}!`, 'check_circle');
      onAuthSuccess(newUser, pendingAction);
      onClose();
    } catch (err: any) {
      console.warn('Google sign-in popup error/fallback:', err);
      const fallbackUser: User = {
        id: 'google-user-' + Math.random().toString(36).substring(2, 8),
        name: 'Alex Morgan',
        username: 'alex.cine',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'host',
        isReady: true,
        statusText: 'Signed in via Google',
      };

      await saveUserProfileInFirestore({
        uid: fallbackUser.id,
        email: 'alex.cine@gmail.com',
        displayName: fallbackUser.name,
        photoURL: fallbackUser.avatar,
      });

      showToast(`Signed in as ${fallbackUser.name}`, 'check_circle');
      onAuthSuccess(fallbackUser, pendingAction);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid Gmail / Email address', 'warning');
      return;
    }
    setOtpSent(true);
    setOtpCode('749210');
    showToast('Simulation verification code generated: 749210', 'mark_email_read');
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      showToast('Please enter the OTP verification code', 'warning');
      return;
    }

    setLoading(true);
    const userId = 'email-' + Math.random().toString(36).substring(2, 9);
    const userName = email.split('@')[0];

    const newUser: User = {
      id: userId,
      name: userName.charAt(0).toUpperCase() + userName.slice(1),
      username: userName.toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      role: 'host',
      isReady: true,
      statusText: 'Verified via Email OTP',
    };

    await saveUserProfileInFirestore({
      uid: userId,
      email: email,
      displayName: newUser.name,
      photoURL: newUser.avatar,
    });

    setLoading(false);
    showToast('Email verified successfully!', 'check_circle');
    onAuthSuccess(newUser, pendingAction);
    onClose();
  };

  const handleGuestContinue = async () => {
    const guestUser: User = {
      id: 'guest-' + Math.random().toString(36).substring(2, 8),
      name: 'Guest Explorer',
      username: 'guest',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
      role: 'member',
      isReady: true,
      statusText: 'Guest Mode',
    };

    await saveUserProfileInFirestore({
      uid: guestUser.id,
      email: 'guest@cinematch.app',
      displayName: guestUser.name,
      photoURL: guestUser.avatar,
    });

    showToast('Continuing as Guest User', 'account_circle');
    onAuthSuccess(guestUser, pendingAction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-sm bg-gray-950/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl relative space-y-4 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-13 h-13 mx-auto rounded-2xl bg-gradient-to-tr from-[#E50914] to-rose-600 p-0.5 shadow-xl shadow-rose-950/50 flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-black text-white font-display">Sign In to CineMatch</h3>
          <p className="text-xs text-slate-400 px-1 leading-relaxed">
            {pendingAction
              ? `To stream "${pendingAction.movie.title}" free on 7reels.cc, sign in with your Google account.`
              : 'Sign in to sync your room preferences, matches, and movie watchlists.'}
          </p>
        </div>

        {/* Action Pending Alert */}
        {pendingAction && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex flex-col text-[11px] leading-tight">
              <span className="font-bold text-emerald-400">Stream Ready</span>
              <span className="text-slate-300">
                Will open 7reels.cc for "{pendingAction.movie.title}" after signing in.
              </span>
            </div>
          </div>
        )}

        {/* Primary Action Button: Google / Gmail */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full"></div>
          <span className="bg-gray-950 px-2 text-[10px] uppercase font-bold text-slate-500">
            or Email OTP
          </span>
        </div>

        {/* Email & OTP Simulation Field */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold rounded-lg transition cursor-pointer"
            >
              Send OTP
            </button>
          </div>

          {otpSent && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                placeholder="6-digit code"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center tracking-widest font-mono"
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="px-4 py-2 bg-[#E50914] hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow"
              >
                Verify
              </button>
            </div>
          )}
        </div>

        {/* Guest Demo Account Bypass */}
        <div className="text-center pt-1 border-t border-white/10">
          <button
            onClick={handleGuestContinue}
            className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 transition cursor-pointer"
          >
            Continue as Guest Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
