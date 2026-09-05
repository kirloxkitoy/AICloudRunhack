import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  BookmarkCheck,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage, JournalEntry, UserProfile } from '../types';
import { saveJournalEntry } from '../lib/firebase';

interface ReflectionChatProps {
  user: UserProfile;
  onEntrySaved: (entry: JournalEntry) => void;
}

const GUIDED_PROMPTS = [
  'What brought me an unexpected moment of calm or gratitude today?',
  'What was the most challenging interaction I had today, and what can it teach me?',
  'An emotion I have been avoiding lately and why...',
  'If I could give my present self one compassionate piece of advice right now, it would be...',
];

export const ReflectionChat: React.FC<ReflectionChatProps> = ({ user, onEntrySaved }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Evening Reflection');
  const [modelUsed, setModelUsed] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  /**
   * Send a reflection turn to Gemini
   */
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputVal).trim();
    if (!content || isSending) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputVal('');
    setIsSending(true);

    // Auto update title if first message
    if (messages.length === 0) {
      const suggestedTitle = content.length > 40 ? `${content.substring(0, 38)}...` : content;
      setSessionTitle(suggestedTitle);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentTopic: sessionTitle,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to receive reflection from Gemini.');
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: `msg_${Date.now()}_m`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMsg]);
      if (data.modelUsed) setModelUsed(data.modelUsed);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err.message || 'Error communicating with Gemini.');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Commit the full multi-turn conversation into Firestore under the user's isolated subcollection
   */
  const handleSaveSession = async () => {
    if (messages.length === 0 || !user.uid) return;

    setSaveStatus('saving');
    setErrorMessage(null);

    const userTurns = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
    const modelTurns = messages.filter((m) => m.role === 'model').map((m) => m.content).join('\n\n');

    const newEntry: JournalEntry = {
      id: `reflection_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.uid,
      type: 'reflection',
      title: sessionTitle.trim() || 'Conversational Reflection',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversation: messages,
      transcript: userTurns,
      summary: {
        title: sessionTitle.trim() || 'Conversational Reflection',
        keyPoints: messages
          .filter((m) => m.role === 'user')
          .slice(0, 4)
          .map((m) => m.content.substring(0, 90)),
        mood: 'Mindful Reflection',
        summary: `Multi-turn dialogue exploring: "${sessionTitle}". User logged ${
          messages.filter((m) => m.role === 'user').length
        } thought reflections.`,
        actionItems: ['Revisit these insights whenever you need centering'],
      },
      tags: ['reflection', 'dialogue', 'gemini-chat'],
    };

    try {
      await saveJournalEntry(user.uid, newEntry);
      setSaveStatus('saved');
      onEntrySaved(newEntry);
      setTimeout(() => setSaveStatus('idle'), 3500);
    } catch (err: any) {
      console.error('Failed to save reflection session:', err);
      setErrorMessage('Could not save reflection to Firestore. Please retry.');
      setSaveStatus('error');
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInputVal('');
    setSessionTitle('Reflections with Gemini');
    setSaveStatus('idle');
    setErrorMessage(null);
  };

  return (
    <div className="backdrop-blur-2xl bg-white/5 border border-white/10 shadow-2xl rounded-[36px] flex flex-col h-[740px] overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl backdrop-blur-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shadow-md shadow-indigo-500/20">
            <MessageSquare className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                id="reflection-title-input"
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Name this reflection session..."
                className="font-serif font-semibold text-white text-sm sm:text-base bg-transparent hover:bg-white/5 focus:bg-white/10 px-2 py-0.5 rounded-lg border border-transparent hover:border-white/15 focus:border-indigo-400/50 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 px-2">
              Multi-turn conversational reflections saved directly to your isolated cloud journal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {modelUsed && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium backdrop-blur-md bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-400/30">
              <Sparkles className="w-3 h-3" />
              {modelUsed}
            </span>
          )}

          {messages.length > 0 && (
            <>
              <button
                type="button"
                onClick={resetChat}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-xs transition-colors"
                title="Start New Session"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                id="save-reflection-btn"
                type="button"
                onClick={handleSaveSession}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-lg transition-all border ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-600 text-white border-emerald-400/30 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white border-indigo-400/30 shadow-indigo-500/20'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Save to Journal</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          id="chat-error-banner"
          className="mx-4 mt-3 p-3 rounded-2xl backdrop-blur-xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-between text-xs text-rose-200 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="text-rose-300 underline font-medium hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="w-12 h-12 rounded-2xl backdrop-blur-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30 shadow-xl shadow-indigo-500/20">
              <Lightbulb className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                Begin a Reflective Journaling Dialogue
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Write what you feel, what you experienced today, or choose a thoughtful prompt below. Gemini will respond with empathetic perspectives and gentle inquiries.
              </p>
            </div>

            {/* Guided Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
              {GUIDED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3.5 rounded-2xl border border-white/10 backdrop-blur-md bg-white/5 hover:bg-white/10 hover:border-indigo-400/40 text-xs text-slate-300 hover:text-white transition-all text-left flex items-start gap-2 group shadow-sm"
                >
                  <span className="text-indigo-400 font-bold">“</span>
                  <span className="flex-1">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-2xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                    : 'backdrop-blur-md bg-violet-900/60 text-indigo-300 border border-violet-500/30 shadow-violet-900/30'
                }`}
              >
                {msg.role === 'user' ? (
                  user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-white" />
                  )
                ) : (
                  <Bot className="w-4 h-4 text-amber-300" />
                )}
              </div>

              <div
                className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border border-indigo-400/20 shadow-indigo-600/20 rounded-tr-xs'
                    : 'backdrop-blur-xl bg-white/10 text-slate-100 border border-white/10 shadow-slate-950/20 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-[10px] mt-1.5 font-mono ${
                    msg.role === 'user' ? 'text-indigo-200/80 text-right' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex gap-3 max-w-md mr-auto">
            <div className="w-8 h-8 rounded-full backdrop-blur-md bg-violet-900/60 text-indigo-300 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-300" />
            </div>
            <div className="rounded-2xl p-4 backdrop-blur-xl bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-2 shadow-lg">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Gemini is reflecting on your thoughts...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 border-t border-white/10 backdrop-blur-md bg-white/5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            id="reflection-chat-input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your reflection, thought, or answer here... (Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none px-4 py-3 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/50 text-xs sm:text-sm text-white placeholder:text-slate-500 bg-white/5 backdrop-blur-md"
          />

          <button
            id="send-reflection-btn"
            type="submit"
            disabled={!inputVal.trim() || isSending}
            className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:hover:from-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 border border-indigo-400/30 transition-all active:scale-95 shrink-0"
            title="Send thought"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
