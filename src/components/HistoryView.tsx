import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Clock,
  Mic,
  MessageSquareQuote,
  Trash2,
  ChevronRight,
  Sparkles,
  BookOpen,
  Filter,
  X,
  Volume2,
} from 'lucide-react';
import { JournalEntry } from '../types';
import { deleteJournalEntry } from '../lib/firebase';

interface HistoryViewProps {
  entries: JournalEntry[];
  userId: string;
  onEntryDeleted: (entryId: string) => void;
  onNavigateTab: (tab: 'voice' | 'reflection') => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  entries,
  userId,
  onEntryDeleted,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'voice' | 'reflection'>('all');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesType = filterType === 'all' || entry.type === filterType;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      entry.title.toLowerCase().includes(query) ||
      (entry.transcript && entry.transcript.toLowerCase().includes(query)) ||
      (entry.summary?.summary && entry.summary.summary.toLowerCase().includes(query)) ||
      (entry.summary?.mood && entry.summary.mood.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  const handleDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this journal entry from your private cloud storage?')) {
      return;
    }
    setIsDeletingId(entryId);
    try {
      await deleteJournalEntry(userId, entryId);
      onEntryDeleted(entryId);
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Could not delete entry. Please try again.');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[28px] p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, keywords, moods..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/50 bg-white/5 backdrop-blur-md text-white placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto backdrop-blur-md bg-white/5 border border-white/10 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'all'
                ? 'bg-white/20 text-white shadow-xs border border-white/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('voice')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'voice'
                ? 'bg-white/20 text-white shadow-xs border border-white/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3 h-3 text-rose-400" />
            <span>Voice Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('reflection')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'reflection'
                ? 'bg-white/20 text-white shadow-xs border border-white/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquareQuote className="w-3 h-3 text-indigo-400" />
            <span>Reflections</span>
          </button>
        </div>
      </div>

      {/* Entries List or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[32px] p-12 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl backdrop-blur-md bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center mx-auto shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-white">
              {searchQuery ? 'No matching journal entries' : 'Your Journal History is Empty'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching for a different keyword or reset your filter query.'
                : 'Speak into your microphone for an audio log or converse with Gemini to begin building your private reflection history.'}
            </p>
          </div>
          {!searchQuery && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('voice')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 border border-rose-400/30 transition-colors"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Record Audio Log</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('reflection')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 border border-indigo-400/30 transition-colors"
              >
                <MessageSquareQuote className="w-3.5 h-3.5" />
                <span>Start Reflection</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredEntries.map((entry) => {
            const dateObj = new Date(entry.createdAt);
            const dateStr = dateObj.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="group backdrop-blur-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 rounded-[28px] shadow-xl hover:shadow-2xl transition-all p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
                        entry.type === 'voice'
                          ? 'bg-rose-500/20 text-rose-200 border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                      }`}
                    >
                      {entry.type === 'voice' ? (
                        <>
                          <Mic className="w-3 h-3 text-rose-300" />
                          <span>Voice Log</span>
                        </>
                      ) : (
                        <>
                          <MessageSquareQuote className="w-3 h-3 text-indigo-300" />
                          <span>Reflection</span>
                        </>
                      )}
                    </span>

                    {entry.summary?.mood && (
                      <span className="text-[11px] font-medium backdrop-blur-md bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {entry.summary.mood}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto md:ml-0 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{dateStr}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-serif font-bold text-white group-hover:text-indigo-200 transition-colors truncate">
                    {entry.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {entry.summary?.summary || entry.transcript || 'Click to view full entry details...'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(entry.id, e)}
                    disabled={isDeletingId === entry.id}
                    className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-xl backdrop-blur-md bg-white/5 group-hover:bg-indigo-500/20 text-slate-400 group-hover:text-indigo-200 border border-white/10 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedEntry && (
        <div
          id="entry-detail-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="backdrop-blur-2xl bg-slate-900/90 rounded-[36px] max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-white/15 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
                      selectedEntry.type === 'voice'
                        ? 'bg-rose-500/20 text-rose-200 border-rose-500/30'
                        : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                    }`}
                  >
                    {selectedEntry.type === 'voice' ? 'Voice Journal Log' : 'Conversational Reflection'}
                  </span>
                  {selectedEntry.summary?.mood && (
                    <span className="text-xs backdrop-blur-md bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                      Mood: {selectedEntry.summary.mood}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-2">
                  {selectedEntry.title}
                </h2>

                <p className="text-xs text-slate-400 font-mono">
                  Recorded on {new Date(selectedEntry.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Section */}
            {selectedEntry.summary?.summary && (
              <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  Gemini Synthesis
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal italic">
                  "{selectedEntry.summary.summary}"
                </p>
              </div>
            )}

            {/* Key Bullet Points */}
            {selectedEntry.summary?.keyPoints && selectedEntry.summary.keyPoints.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Highlights & Insights
                </span>
                <ul className="space-y-1.5">
                  {selectedEntry.summary.keyPoints.map((point, i) => (
                    <li
                      key={i}
                      className="text-xs sm:text-sm text-slate-200 flex items-start gap-2 backdrop-blur-md bg-white/5 p-2.5 rounded-xl border border-white/10"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Multi-turn Chat Conversation History if Reflection */}
            {selectedEntry.conversation && selectedEntry.conversation.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Dialogue Turns ({selectedEntry.conversation.length} exchanges)
                </span>
                <div className="space-y-2.5 max-h-60 overflow-y-auto p-3 backdrop-blur-md bg-white/5 rounded-2xl border border-white/10">
                  {selectedEntry.conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white ml-6 shadow-md'
                          : 'backdrop-blur-xl bg-white/10 text-slate-100 border border-white/10 mr-6'
                      }`}
                    >
                      <div className="font-semibold text-[10px] mb-1 opacity-80">
                        {msg.role === 'user' ? 'You' : 'Gemini'}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verbatim Transcript */}
            {selectedEntry.transcript && !selectedEntry.conversation && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Full Transcribed Audio Log
                </span>
                <div className="p-4 rounded-xl backdrop-blur-md bg-slate-950/60 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {selectedEntry.transcript}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={(e) => handleDelete(selectedEntry.id, e)}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
