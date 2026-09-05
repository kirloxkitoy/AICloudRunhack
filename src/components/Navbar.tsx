import React from 'react';
import { Mic, MessageSquareQuote, History, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
  activeTab: 'voice' | 'reflection' | 'history';
  setActiveTab: (tab: 'voice' | 'reflection' | 'history') => void;
  onSignOut: () => void;
  entryCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onSignOut,
  entryCount,
}) => {
  return (
    <header className="bg-slate-950/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 transition-all shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/25 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-lg tracking-tight text-white">
                  Gemini Journal
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Isolated
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Voice logs & reflections powered by Gemini 3.6 Flash
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/10">
            <button
              id="nav-tab-voice"
              type="button"
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'voice'
                  ? 'bg-white/15 text-white border border-white/20 shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Mic className="w-4 h-4 text-rose-400" />
              <span>Voice Log</span>
            </button>

            <button
              id="nav-tab-reflection"
              type="button"
              onClick={() => setActiveTab('reflection')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'reflection'
                  ? 'bg-white/15 text-white border border-white/20 shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <MessageSquareQuote className="w-4 h-4 text-indigo-400" />
              <span>Reflections</span>
            </button>

            <button
              id="nav-tab-history"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all relative ${
                activeTab === 'history'
                  ? 'bg-white/15 text-white border border-white/20 shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>History</span>
              {entryCount > 0 && (
                <span className="text-[10px] bg-white/20 text-slate-100 px-1.5 py-0.2 rounded-full font-semibold border border-white/10">
                  {entryCount}
                </span>
              )}
            </button>
          </nav>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full ring-2 ring-white/20 object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 text-cyan-300 flex items-center justify-center font-semibold text-sm border border-white/20 shadow-sm">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">
                  {user.displayName || 'Anonymous User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {user.email || 'Authenticated'}
                </p>
              </div>
            </div>

            <button
              id="sign-out-btn"
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
