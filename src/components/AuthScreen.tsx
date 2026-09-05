import React, { useState } from 'react';
import {
  Sparkles,
  Mic,
  MessageSquareQuote,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface AuthScreenProps {
  onSignInSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      onSignInSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-900 via-slate-900 to-violet-900 flex flex-col justify-between text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-950/40 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl backdrop-blur-md bg-indigo-500/20 border border-indigo-400/30 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <span className="font-serif font-semibold text-lg tracking-tight text-white">
              Gemini Journal
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium backdrop-blur-md bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Strict User Data Isolation</span>
          </div>
        </div>
      </header>

      {/* Main Hero & Sign-In Card */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 sm:py-16 flex flex-col items-center justify-center text-center relative z-10">
        {/* Floating Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-6 shadow-xl shadow-indigo-500/10">
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          <span>Gemini 3.6 Flash Voice Logger & Reflections</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-light text-slate-100 tracking-tight max-w-2xl leading-tight">
          Your private space for <span className="font-semibold text-white">vocal thoughts and guided reflections.</span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed">
          Record spoken voice entries with instant verbatim transcription and AI summaries. Converse with Gemini for deep emotional clarity—with every interaction strictly isolated to your account.
        </p>

        {/* Authentication Card */}
        <div className="mt-10 backdrop-blur-2xl bg-white/5 border border-white/15 rounded-[36px] shadow-2xl p-8 sm:p-10 w-full max-w-md space-y-6 relative">
          <div className="space-y-1">
            <h2 className="text-xl font-serif font-semibold text-white">
              Sign In to Your Journal
            </h2>
            <p className="text-xs text-slate-400">
              One-click authentication via Google. No passwords stored.
            </p>
          </div>

          {authError && (
            <div
              id="auth-error-alert"
              className="p-3.5 rounded-2xl backdrop-blur-xl bg-rose-950/80 border border-rose-500/30 flex items-start gap-2.5 text-rose-200 text-xs text-left shadow-lg"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border border-white/20 backdrop-blur-md bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all shadow-xl hover:shadow-2xl active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 text-indigo-300 animate-spin" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                {/* Official Google 'G' vector logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              </>
            )}
          </button>

          {/* Privacy Guarantees */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Encrypted transmission & owner-bound database rules</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl text-left">
          <div className="backdrop-blur-2xl bg-white/5 p-6 rounded-[28px] border border-white/10 shadow-xl space-y-2.5">
            <div className="w-9 h-9 rounded-2xl backdrop-blur-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Voice Audio Logs</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Record speaking your thoughts naturally. Gemini 3.6 Flash transcribes audio verbatim with punctuation.
            </p>
          </div>

          <div className="backdrop-blur-2xl bg-white/5 p-6 rounded-[28px] border border-white/10 shadow-xl space-y-2.5">
            <div className="w-9 h-9 rounded-2xl backdrop-blur-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Pre-Save Synthesis</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Review extracted titles, moods, and key highlights prior to accepting the entry into your journal.
            </p>
          </div>

          <div className="backdrop-blur-2xl bg-white/5 p-6 rounded-[28px] border border-white/10 shadow-xl space-y-2.5">
            <div className="w-9 h-9 rounded-2xl backdrop-blur-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Firestore Isolation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Rules strictly restrict entries so other users cannot read or write to your records.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400 backdrop-blur-md bg-slate-950/40">
        Gemini Journal & Voice Reflections • Powered by Gemini 3.6 Flash & Cloud Firestore
      </footer>
    </div>
  );
};
