import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Edit3,
  Flame,
  Volume2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { JournalEntry, JournalSummary, UserProfile } from '../types';
import { saveJournalEntry } from '../lib/firebase';

interface VoiceLoggerProps {
  user: UserProfile;
  onEntrySaved: (entry: JournalEntry) => void;
}

export const VoiceLogger: React.FC<VoiceLoggerProps> = ({ user, onEntrySaved }) => {
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Transcription & Summarization State
  const [status, setStatus] = useState<'idle' | 'transcribing' | 'summarizing' | 'review' | 'saving' | 'saved'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable Review Fields
  const [editableTitle, setEditableTitle] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [showFullTranscript, setShowFullTranscript] = useState(true);

  // MediaRecorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Audio wave animation state
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(18).fill(20));

  // Clean up timer and media streams on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  // Handle Recording Timer & Simulated Waveform
  useEffect(() => {
    let waveInterval: any;
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      waveInterval = setInterval(() => {
        setAudioLevel(
          Array.from({ length: 18 }, () => Math.floor(Math.random() * 60) + 15)
        );
      }, 150);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveInterval) clearInterval(waveInterval);
      setAudioLevel(Array(18).fill(12));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveInterval) clearInterval(waveInterval);
    };
  }, [isRecording]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  /**
   * Start Microphone Recording
   */
  const startRecording = async () => {
    setErrorMessage(null);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript('');
    setSummary(null);
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(fullBlob);
        const newUrl = URL.createObjectURL(fullBlob);
        setAudioUrl(newUrl);

        // Stop all audio tracks to release microphone hardware cleanly
        stream.getTracks().forEach((track) => track.stop());

        // Process audio with Gemini
        processAudioLog(fullBlob, mimeType);
      };

      mediaRecorder.start(250); // Collect slice every 250ms
      setIsRecording(true);
      setStatus('idle');
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorMessage(
        'Unable to access your internal microphone. Please ensure microphone permissions are allowed in your browser settings.'
      );
    }
  };

  /**
   * Stop Microphone Recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /**
   * Convert Blob to Base64
   */
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Process Audio Log: Transcribe with Gemini 3.6 Flash, then Summarize
   */
  const processAudioLog = async (blob: Blob, mimeType: string) => {
    try {
      setStatus('transcribing');
      setErrorMessage(null);

      // Convert audio blob to base64
      const base64Audio = await blobToBase64(blob);

      // 1. Call Gemini Transcription API
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: mimeType,
        }),
      });

      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transcribe audio recording.');
      }

      const transcribeJson = await transcribeRes.json();
      const rawTranscript = transcribeJson.transcript || '';
      setTranscript(rawTranscript);
      setEditableTranscript(rawTranscript);
      if (transcribeJson.modelUsed) {
        setModelUsed(transcribeJson.modelUsed);
      }

      // 2. Call Gemini Summarization API to synthesize prior to user acceptance
      setStatus('summarizing');

      const summarizeRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: rawTranscript }),
      });

      if (!summarizeRes.ok) {
        const errorData = await summarizeRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate summary.');
      }

      const summarizeJson = await summarizeRes.json();
      const generatedSummary: JournalSummary = summarizeJson.summary;
      setSummary(generatedSummary);
      setEditableTitle(generatedSummary.title || 'Voice Reflection');

      // Now present to user for review
      setStatus('review');
    } catch (err: any) {
      console.error('Audio processing error:', err);
      setErrorMessage(err.message || 'Error communicating with Gemini API.');
      setStatus('idle');
    }
  };

  /**
   * Play / Pause Audio Preview
   */
  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  /**
   * Save the approved entry to Firestore (Isolated to the user)
   */
  const acceptAndSaveEntry = async () => {
    if (!summary || !user.uid) return;

    setStatus('saving');
    setErrorMessage(null);

    const newEntry: JournalEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid,
      type: 'voice',
      title: editableTitle.trim() || summary.title || 'Voice Journal Log',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      audioDurationSeconds: recordingSeconds,
      transcript: editableTranscript.trim() || transcript,
      summary: {
        ...summary,
        title: editableTitle.trim() || summary.title,
      },
      tags: ['voice-log', summary.mood ? summary.mood.toLowerCase() : 'reflective'],
    };

    try {
      await saveJournalEntry(user.uid, newEntry);
      setStatus('saved');
      onEntrySaved(newEntry);
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setErrorMessage('Failed to persist entry to Firestore. Please click Retry.');
      setStatus('review');
    }
  };

  /**
   * Reset form for a new voice log
   */
  const handleStartNew = () => {
    setStatus('idle');
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript('');
    setEditableTranscript('');
    setSummary(null);
    setRecordingSeconds(0);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Recording Studio Card */}
      <div className="backdrop-blur-2xl bg-white/5 border border-white/10 shadow-2xl rounded-[36px] p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" />
              <h2 className="text-xl font-serif font-semibold text-white">
                Voice Journal Recorder
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Speak freely. Your microphone audio is transcribed verbatim and summarized by Gemini 3.6 Flash.
            </p>
          </div>

          {modelUsed && (
            <div className="inline-flex items-center gap-1.5 text-xs backdrop-blur-md bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-400/30 self-start sm:self-auto font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Model: {modelUsed}
            </div>
          )}
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div
            id="voice-error-banner"
            className="mt-6 p-4 rounded-2xl backdrop-blur-xl bg-rose-950/80 border border-rose-500/30 flex items-start justify-between gap-3 text-rose-200 text-sm relative z-10 shadow-xl"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {status === 'review' && (
              <button
                type="button"
                onClick={acceptAndSaveEntry}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium shrink-0 transition-colors border border-rose-400/30 shadow-sm"
              >
                Retry Save
              </button>
            )}
          </div>
        )}

        {/* Dynamic Studio Interface */}
        <div className="mt-8 flex flex-col items-center justify-center py-6 relative z-10">
          {/* Frosted Microphone Orb */}
          <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 mb-6 shadow-xl shadow-indigo-500/20">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-600 shadow-xl shadow-rose-600/50 animate-pulse'
                : 'bg-indigo-500 shadow-xl shadow-indigo-500/50'
            }`}>
              <Mic className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Waveform Visualization */}
          <div className="flex items-center justify-center gap-1.5 h-20 mb-6 w-full max-w-md px-4">
            {audioLevel.map((height, idx) => (
              <div
                key={idx}
                className={`w-2 rounded-full transition-all duration-150 ${
                  isRecording
                    ? 'bg-rose-400 shadow-sm shadow-rose-400/50'
                    : audioBlob
                    ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50'
                    : 'bg-white/10'
                }`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          {/* Time & Status Indicator */}
          <div className="text-center mb-6">
            <span className="font-mono text-3xl sm:text-4xl font-semibold text-white tracking-tight tabular-nums">
              {formatTime(recordingSeconds)}
            </span>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
              {isRecording
                ? 'Recording in progress...'
                : status === 'transcribing'
                ? 'Transcribing audio with Gemini...'
                : status === 'summarizing'
                ? 'Synthesizing reflection...'
                : audioBlob
                ? 'Audio captured'
                : 'Ready to record'}
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-4">
            {!isRecording && status === 'idle' && (
              <button
                id="start-recording-btn"
                type="button"
                onClick={startRecording}
                className="group relative flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm shadow-xl shadow-rose-600/30 border border-rose-400/30 transition-all active:scale-95"
              >
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                  <Mic className="w-2.5 h-2.5 text-rose-600" />
                </div>
                <span>Start Audio Log</span>
              </button>
            )}

            {isRecording && (
              <button
                id="stop-recording-btn"
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white font-semibold text-sm border border-white/20 shadow-xl transition-all active:scale-95 animate-pulse"
              >
                <Square className="w-4 h-4 fill-current text-white" />
                <span>Stop & Transcribe</span>
              </button>
            )}

            {/* Audio Playback Controls if Blob Exists */}
            {audioUrl && !isRecording && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-medium transition-colors shadow-sm"
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-white" />
                      <span>Pause Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-white" />
                      <span>Play Recording</span>
                    </>
                  )}
                </button>
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
                  title="Discard and record again"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Loading States for Gemini Processing */}
          {(status === 'transcribing' || status === 'summarizing') && (
            <div className="mt-8 flex flex-col items-center gap-3 p-6 rounded-2xl backdrop-blur-xl bg-indigo-950/40 border border-indigo-400/20 max-w-md text-center shadow-xl">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">
                  {status === 'transcribing'
                    ? 'Transcribing Spoken Thoughts'
                    : 'Crafting Journal Summary'}
                </h4>
                <p className="text-xs text-slate-300">
                  {status === 'transcribing'
                    ? 'Gemini 3.6 Flash is converting your voice audio into clean, punctuated text...'
                    : 'Extracting key themes, emotional tone, and reflection prompts...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: SUMMARY & TRANSCRIPTION REVIEW CARD (Presented to User prior to accepting) */}
      {status === 'review' && summary && (
        <div
          id="summary-review-card"
          className="backdrop-blur-2xl bg-white/5 border border-white/15 rounded-[32px] shadow-2xl p-6 sm:p-8 space-y-6 transition-all"
        >
          {/* Header & Verification Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-md bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  Review & Approve
                </span>
                <span className="text-xs text-slate-400 font-medium">Step 2 of 2</span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-white mt-1">
                Gemini Transcription & Summary Review
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Please review Gemini's extracted summary and verbatim transcript before accepting it into your private journal.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                id="discard-entry-btn"
                type="button"
                onClick={handleStartNew}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors border border-white/10"
              >
                Discard
              </button>
              <button
                id="accept-and-save-btn"
                type="button"
                onClick={acceptAndSaveEntry}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xl shadow-indigo-500/30 border border-indigo-400/30 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept & Save to Journal</span>
              </button>
            </div>
          </div>

          {/* Editable Title and Mood */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label
                htmlFor="entry-title-input"
                className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                Journal Entry Title (Editable)
              </label>
              <input
                id="entry-title-input"
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/50 text-white text-sm font-semibold bg-white/5 backdrop-blur-md placeholder:text-slate-500"
                placeholder="Give your entry a title..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Detected Tone / Mood
              </label>
              <div className="px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 font-medium text-sm flex items-center backdrop-blur-md">
                {summary.mood || 'Reflective'}
              </div>
            </div>
          </div>

          {/* Synthesis Narrative Summary */}
          <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                Narrative Synthesis
              </span>
              <span className="text-[10px] text-slate-400">Auto-generated</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal italic">
              "{summary.summary}"
            </p>
          </div>

          {/* Key Bullet Points */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                Core Insights & Highlights
              </span>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 backdrop-blur-md bg-white/5 p-3 rounded-xl border border-white/10"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 shadow-xs shadow-indigo-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items or Reflections if available */}
          {summary.actionItems && summary.actionItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                Mindful Questions & Takeaways
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {summary.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-300 backdrop-blur-md bg-white/5 p-3 rounded-xl border border-white/10"
                  >
                    💭 {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Verbatim Transcript Accordion / Editor */}
          <div className="border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/5">
            <button
              type="button"
              onClick={() => setShowFullTranscript(!showFullTranscript)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Verbatim Spoken Transcript ({transcript.split(' ').length} words)</span>
              </div>
              {showFullTranscript ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showFullTranscript && (
              <div className="p-4 bg-slate-950/40 border-t border-white/10 space-y-2">
                <textarea
                  id="editable-transcript-textarea"
                  value={editableTranscript}
                  onChange={(e) => setEditableTranscript(e.target.value)}
                  rows={5}
                  className="w-full text-xs sm:text-sm text-slate-200 leading-relaxed font-mono p-3 rounded-xl border border-white/15 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-black/30 placeholder:text-slate-500"
                  placeholder="Review or tweak transcribed text..."
                />
                <p className="text-[11px] text-slate-400">
                  Tip: You can edit any minor spoken slips above before confirming save.
                </p>
              </div>
            )}
          </div>

          {/* Final Action Buttons Bottom */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartNew}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
            >
              Discard
            </button>
            <button
              id="accept-and-save-btn-bottom"
              type="button"
              onClick={acceptAndSaveEntry}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xl shadow-indigo-500/30 border border-indigo-400/30 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept & Save to Journal</span>
            </button>
          </div>
        </div>
      )}

      {/* SAVED CONFIRMATION CARD */}
      {status === 'saved' && (
        <div
          id="entry-saved-banner"
          className="backdrop-blur-2xl bg-emerald-950/40 border border-emerald-500/30 rounded-[32px] p-6 sm:p-8 text-center space-y-4 shadow-2xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-white">
              Voice Reflection Successfully Saved
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-md mx-auto">
              Your audio transcript and summary have been securely isolated and committed to Cloud Firestore under your private user profile.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              id="record-another-btn"
              type="button"
              onClick={handleStartNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-emerald-400/30 shadow-lg shadow-emerald-500/20"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Another Log</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
