'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Clock,
  ChevronRight,
  Globe,
  Loader2,
  FileText,
  BookOpen,
} from 'lucide-react';

// Web Speech API types (not in standard TS lib)
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

const LANGUAGES = ['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Japanese', 'Portuguese'];
const PERSONAS = ['Aria (Natural)', 'Nova (Professional)', 'Echo (Neutral)', 'Browser Default'];

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Tap the mic and speak',
  listening: 'Listening — tap again to submit',
  processing: 'Processing your request...',
  speaking: 'Speaking — tap to stop',
};

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'bg-surface-100 dark:bg-gray-800 hover:bg-surface-200 dark:hover:bg-surface-200 dark:bg-gray-700 border-surface-300 dark:border-gray-700',
  listening: 'bg-red-600 hover:bg-red-700 border-red-500 shadow-lg shadow-red-500/30',
  processing: 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/30',
  speaking: 'bg-violet-600 border-violet-500 shadow-lg shadow-violet-500/30',
};

function WaveformBars({ active, color }: { active: boolean; color: string }) {
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-center justify-center gap-0.5 h-16">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${color}`}
          style={{
            height: active ? `${Math.max(4, Math.random() * 56 + 8)}px` : '4px',
            animation: active ? `pulse ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

interface Source { documentName: string; documentType: string; chunkText: string }

interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
  time: string;
}

interface KBDoc { id: string; name: string; original_name?: string; type: string; wordCount: number; pageCount: number; uploadedAt: string }

export default function VoicePage() {
  const { data: session, status } = useSession();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [lastSources, setLastSources] = useState<Source[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');
  const [selectedPersona, setSelectedPersona] = useState('Aria (Natural)');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');
  const [kbDocs, setKbDocs] = useState<KBDoc[]>([]);
  const [kbLoading, setKbLoading] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isActive = voiceState !== 'idle';

  const getToken = () => (session as any)?.accessToken;
  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name });

  // Load knowledge base document list on mount
  useEffect(() => {
    if (status !== 'authenticated') return;
    setKbLoading(true);
    authFetch('/api/backend/knowledge/documents?pageSize=100', {}, getToken(), getUser())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) setKbDocs(data.items);
      })
      .catch(() => {})
      .finally(() => setKbLoading(false));
  }, [status, session?.user?.email]);

  const speak = useCallback((text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1;
    utt.pitch = 1;
    utt.onend = () => setVoiceState('idle');
    window.speechSynthesis.speak(utt);
    setVoiceState('speaking');
  }, [isMuted]);

  const askBackend = useCallback(async (question: string) => {
    setVoiceState('processing');
    setError('');
    try {
      const normalized = question.toLowerCase();
      const isRecentUploadedDocQuery =
        /(recent|latest|last)/.test(normalized) &&
        /(upload|uploaded)/.test(normalized) &&
        /(document|file)/.test(normalized);

      // Deterministic local path for "recent uploaded document" questions to
      // avoid generic or inaccurate model responses.
      if (isRecentUploadedDocQuery) {
        const docsRes = await authFetch(
          '/api/backend/knowledge/documents?pageSize=1&source=upload',
          {},
          getToken(),
          getUser(),
        );

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const latest = docsData?.items?.[0];
          if (latest) {
            let summary = '';
            const chunksRes = await authFetch(
              `/api/backend/knowledge/documents/${latest.id}/chunks?pageSize=1`,
              {},
              getToken(),
              getUser(),
            );
            if (chunksRes.ok) {
              const chunksData = await chunksRes.json();
              const firstChunk = chunksData?.items?.[0]?.content || '';
              if (firstChunk) {
                summary = firstChunk.slice(0, 320).trim();
                if (firstChunk.length > 320) summary += '...';
              }
            }

            const answer = summary
              ? `Your most recent uploaded document is ${latest.originalName || latest.name}. Here is a quick summary: ${summary}`
              : `Your most recent uploaded document is ${latest.originalName || latest.name}. I could not extract a preview snippet yet.`;

            const sources: Source[] = [{
              documentName: latest.originalName || latest.name,
              documentType: latest.type || 'unknown',
              chunkText: summary || 'No preview available',
            }];

            setAiResponse(answer);
            setLastSources(sources);
            setHistory(prev => [{
              id: Date.now().toString(),
              question,
              answer,
              sources,
              time: new Date().toLocaleTimeString(),
            }, ...prev.slice(0, 9)]);
            speak(answer);
            return;
          }
        }
      }

      const res = await authFetch(
        '/api/backend/voice/ask',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        },
        getToken(),
        getUser(),
      );
      if (!res.ok) throw new Error('Ask failed');
      const data = await res.json();
      const answer = data.answer || 'No response';
      const sources: Source[] = data.sources || [];
      setAiResponse(answer);
      setLastSources(sources);
      setHistory(prev => [{
        id: Date.now().toString(),
        question,
        answer,
        sources,
        time: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)]);
      speak(answer);
    } catch {
      setError('Failed to get AI response. Please try again.');
      setVoiceState('idle');
    }
  }, [speak, session?.user?.email, session?.user?.name]);

  const LANG_CODES: Record<string, string> = {
    'English (US)': 'en-US',
    'English (UK)': 'en-GB',
    'Spanish': 'es-ES',
    'French': 'fr-FR',
    'German': 'de-DE',
    'Japanese': 'ja-JP',
    'Portuguese': 'pt-BR',
  };

  const startRecording = useCallback(async () => {
    setError('');

    // Stop any previous recognition instance to prevent "aborted" errors
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    // ── Web Speech API path ─────────────────────────────────────────────────
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition: SpeechRecognition = new SR();

      // continuous=true keeps listening until the user clicks stop — prevents
      // the browser from ending recognition after the first short pause
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = LANG_CODES[selectedLanguage] ?? 'en-US';

      let accumulated = '';       // confirmed final text
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;

      const resetSilenceTimer = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        // Auto-submit after 2.5 s of silence once something has been said
        silenceTimer = setTimeout(() => {
          recognition.stop();
        }, 2500);
      };

      recognition.onstart = () => setVoiceState('listening');

      recognition.onresult = (e: SpeechRecognitionEvent) => {
        let interimText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (!result) continue;
          // Pick the alternative with highest confidence
          const first = result.item(0);
          let bestText = first?.transcript ?? '';
          let bestConf = first?.confidence ?? 0;
          for (let a = 1; a < result.length; a++) {
            const alt = result.item(a);
            if ((alt?.confidence ?? 0) > bestConf) {
              bestConf = alt?.confidence ?? 0;
              bestText = alt?.transcript ?? bestText;
            }
          }

          if (result.isFinal) {
            // Only accept if confidence is reasonable (>0.4), or confidence is 0
            // (some browsers don't set it, treating 0 as "unknown" not "bad")
            if (bestConf === 0 || bestConf >= 0.4) {
              accumulated += (accumulated ? ' ' : '') + bestText.trim();
            }
            resetSilenceTimer();
          } else {
            interimText += bestText;
            resetSilenceTimer();
          }
        }
        setTranscript((accumulated + (interimText ? ' ' + interimText : '')).trim());
      };

      recognition.onend = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        const text = accumulated.trim();
        if (text) {
          askBackend(text);
        } else {
          setVoiceState('idle');
          setTranscript('');
        }
      };

      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (e.error === 'aborted') {
          // "aborted" is transient — usually caused by a duplicate instance
          // or browser cancellation. Don't show an error; just reset state.
          setVoiceState('idle');
          return;
        }
        if (e.error === 'no-speech') {
          setError('No speech detected. Make sure your microphone is working.');
        } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setError('Microphone access denied. Allow microphone in browser settings.');
        } else if (e.error === 'network') {
          setError('Network error during speech recognition. Check your connection.');
        } else {
          setError(`Speech recognition error: ${e.error}`);
        }
        setVoiceState('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
      return;
    }

    // ── MediaRecorder fallback → Whisper ────────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Pick best supported format for Whisper (prefers webm/opus or mp4/aac)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const form = new FormData();
        form.append('audio', blob, `recording.${ext}`);
        setVoiceState('processing');
        try {
          const res = await authFetch(
            '/api/backend/voice/transcribe',
            {
              method: 'POST',
              body: form,
            },
            getToken(),
            getUser(),
          );
          if (!res.ok) throw new Error('Transcription failed');
          const data = await res.json();
          const text = (data.text || '').trim();
          setTranscript(text);
          if (text) await askBackend(text);
          else {
            setError('No speech detected in recording. Please try again.');
            setVoiceState('idle');
          }
        } catch {
          setError('Transcription failed. Please try again.');
          setVoiceState('idle');
        }
      };
      // Collect data every 250ms so we don't miss audio at the end
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setVoiceState('listening');
    } catch {
      setError('Microphone access denied. Please allow microphone access in browser settings.');
      setVoiceState('idle');
    }
  }, [selectedLanguage, askBackend, session?.user?.email, session?.user?.name]);

  const handleMicClick = async () => {
    if (voiceState === 'speaking') {
      // Cancel TTS and return to idle — don't wipe transcript
      window.speechSynthesis?.cancel();
      setVoiceState('idle');
      return;
    }
    if (voiceState === 'listening') {
      // User manually clicks stop → submit whatever we have
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      // onend / onstop handlers will call askBackend
      return;
    }
    if (voiceState === 'processing') {
      return; // ignore clicks while processing
    }
    // idle → start listening
    setTranscript('');
    setAiResponse('');
    setLastSources([]);
    await startRecording();
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Voice Assistant</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">
            Speak naturally to search and interact with your knowledge base
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-surface-200 dark:bg-gray-700 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Language</label>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="w-full rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-900 dark:text-white"
            >
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-gray-400 mb-1">Voice Persona</label>
            <select
              value={selectedPersona}
              onChange={e => setSelectedPersona(e.target.value)}
              className="w-full rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-900 dark:text-white"
            >
              {PERSONAS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main voice panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <div className="mb-6">
              <WaveformBars
                active={voiceState === 'listening' || voiceState === 'speaking'}
                color={voiceState === 'listening' ? 'bg-red-500' : voiceState === 'speaking' ? 'bg-violet-500' : 'bg-surface-200 dark:bg-gray-700'}
              />
            </div>

            <button
              onClick={handleMicClick}
              disabled={voiceState === 'processing'}
              className={`relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all disabled:cursor-not-allowed ${STATE_COLORS[voiceState]}`}
            >
              {voiceState === 'processing' ? (
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              ) : voiceState === 'listening' ? (
                <MicOff className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-surface-900 dark:text-white" />
              )}
            </button>

            <p className="text-sm font-medium text-surface-600 dark:text-gray-300 mb-1">{STATE_LABELS[voiceState]}</p>

            {/* Live transcript — updates as you speak */}
            {(voiceState === 'listening' || transcript) && (
              <div className="mt-4 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 p-4 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-surface-500 dark:text-gray-400">
                    {voiceState === 'listening' ? 'Transcribing...' : 'You said:'}
                  </p>
                  {voiceState === 'listening' && (
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                <p className="text-sm text-surface-900 dark:text-white min-h-[1.25rem]">
                  {transcript || <span className="text-surface-500 dark:text-gray-500 italic">Waiting for speech…</span>}
                </p>
              </div>
            )}

            {aiResponse && voiceState !== 'processing' && (
              <div className="mt-3 rounded-lg border border-indigo-800 bg-indigo-900/20 p-4 text-left">
                <p className="text-xs font-medium text-indigo-400 mb-1">AI Response:</p>
                <p className="text-sm text-surface-700 dark:text-gray-200">{aiResponse}</p>
                {lastSources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-indigo-800/40">
                    <p className="text-xs font-medium text-indigo-400 mb-2">Sources:</p>
                    <div className="space-y-1">
                      {lastSources.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <FileText className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs text-indigo-300 font-medium">{s.documentName}</span>
                            <span className="text-xs text-surface-500 dark:text-gray-500 ml-1">({s.documentType})</span>
                            <p className="text-xs text-surface-500 dark:text-gray-500 mt-0.5 line-clamp-2">{s.chunkText}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-xs text-surface-500 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-surface-200 dark:bg-gray-700"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-xs text-surface-500 dark:text-gray-400">
                <Globe className="h-3 w-3" />
                {selectedLanguage}
              </div>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Quick Questions</h3>
            <div className="space-y-2">
              {[
                'What files do I have in my knowledge base?',
                'Summarize the most recently uploaded document',
                'What topics are covered in my documents?',
                'Find information about data retention or compliance',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setTranscript(q); askBackend(q); }}
                  disabled={isActive}
                  className="flex items-center justify-between w-full rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-4 py-3 text-left text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-surface-200 dark:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <span>{q}</span>
                  <ChevronRight className="h-4 w-4 text-surface-400 dark:text-gray-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Knowledge base files */}
          <div className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                Knowledge Base
                {!kbLoading && <span className="ml-1 text-surface-500 dark:text-gray-500 font-normal">({kbDocs.length})</span>}
              </h3>
            </div>
            {kbLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-surface-500 dark:text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : kbDocs.length === 0 ? (
              <p className="text-xs text-surface-400 dark:text-gray-500 text-center py-4">
                No documents yet. Upload files to the Knowledge Base.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {kbDocs.slice(0, 20).map(doc => (
                  <div key={doc.id} className="flex items-start gap-2 rounded-lg bg-surface-50 dark:bg-gray-800/50 px-2 py-1.5">
                    <FileText className="h-3 w-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-surface-800 dark:text-gray-200 truncate font-medium">{doc.name || doc.original_name}</p>
                      <p className="text-xs text-surface-500 dark:text-gray-500">
                        {doc.type?.toUpperCase()}
                        {doc.wordCount > 0 && ` · ${doc.wordCount} words`}
                        {doc.pageCount > 0 && ` · ${doc.pageCount}p`}
                      </p>
                    </div>
                  </div>
                ))}
                {kbDocs.length > 20 && (
                  <p className="text-xs text-surface-500 dark:text-gray-500 text-center pt-1">+{kbDocs.length - 20} more</p>
                )}
              </div>
            )}
          </div>

          {/* History panel */}
          <div className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Recent Queries</h3>
            {history.length === 0 ? (
              <p className="text-xs text-surface-400 dark:text-gray-500 text-center py-4">No queries yet. Start speaking!</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {history.map(item => (
                  <div key={item.id} className="rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <Clock className="h-3 w-3 text-surface-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-surface-500 dark:text-gray-400">{item.time}</p>
                    </div>
                    <p className="text-xs font-medium text-surface-900 dark:text-white mb-1">{item.question}</p>
                    <p className="text-xs text-surface-500 dark:text-gray-400 line-clamp-2">{item.answer}</p>
                    {item.sources.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.sources.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                            <FileText className="h-2.5 w-2.5" />
                            {s.documentName.length > 20 ? s.documentName.slice(0, 20) + '…' : s.documentName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
