import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GreetingBanner } from './components/GreetingBanner';
import { VoiceLogger } from './components/VoiceLogger';
import { ReflectionChat } from './components/ReflectionChat';
import { HistoryView } from './components/HistoryView';
import { AuthScreen } from './components/AuthScreen';
import { auth, onAuthStateChanged, logOut, getUserEntries } from './lib/firebase';
import { JournalEntry, UserProfile } from './types';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'voice' | 'reflection' | 'history'>('voice');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
      } else {
        setUser(null);
        setEntries([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries when user is authenticated
  const loadUserEntries = async (userId: string) => {
    try {
      setEntriesLoading(true);
      const data = await getUserEntries(userId);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load user entries from Firestore:', err);
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadUserEntries(user.uid);
    }
  }, [user?.uid]);

  // Handle entry saved
  const handleEntrySaved = (newEntry: JournalEntry) => {
    setEntries((prev) => [newEntry, ...prev.filter((e) => e.id !== newEntry.id)]);
    setToast({
      message: `"${newEntry.title}" was saved to your private journal history.`,
      type: 'success',
    });
  };

  // Handle entry deleted
  const handleEntryDeleted = (deletedId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== deletedId));
    setToast({
      message: 'Journal entry removed from storage.',
      type: 'success',
    });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await logOut();
      setUser(null);
      setEntries([]);
      setActiveTab('voice');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-indigo-950 via-slate-950 to-violet-950 flex flex-col items-center justify-center space-y-4 text-slate-200">
        <div className="w-12 h-12 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-xl shadow-indigo-500/20">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
        <p className="text-xs font-medium text-slate-400 tracking-wide">
          Connecting to secure journal session...
        </p>
      </div>
    );
  }

  // Not authenticated -> Show landing & sign-in screen
  if (!user) {
    return <AuthScreen onSignInSuccess={() => {}} />;
  }

  // Authenticated -> Show private user dashboard
  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-950 via-slate-950 to-violet-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        entryCount={entries.length}
      />

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Dynamic System-Time Greeting Banner */}
        <GreetingBanner user={user} entryCount={entries.length} />

        {/* Floating Notification Toast */}
        {toast && (
          <div
            id="app-toast-notification"
            className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 border transition-all ${
              toast.type === 'success'
                ? 'bg-slate-900/90 text-white border-white/20'
                : 'bg-rose-950/90 text-white border-rose-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            )}
            <p className="text-xs font-medium flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            <VoiceLogger user={user} onEntrySaved={handleEntrySaved} />
          </div>
        )}

        {activeTab === 'reflection' && (
          <div className="space-y-4">
            <ReflectionChat user={user} onEntrySaved={handleEntrySaved} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <HistoryView
              entries={entries}
              userId={user.uid}
              onEntryDeleted={handleEntryDeleted}
              onNavigateTab={setActiveTab}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400 backdrop-blur-xl bg-slate-950/40 relative z-10">
        <p>
          Gemini Journal & Voice Reflections • Cloud Firestore Isolated • Gemini 3.6 Flash
        </p>
      </footer>
    </div>
  );
}
