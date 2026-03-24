'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
} from 'lucide-react';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

const LANGUAGES = ['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Japanese', 'Portuguese'];
const PERSONAS = ['Aria (Natural)', 'Nova (Professional)', 'Echo (Neutral)', 'Browser Default'];

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Tap the mic to start',
  listening: 'Listening...',
  processing: 'Processing your request...',
  speaking: 'Speaking response...',
};

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'bg-gray-800 hover:bg-gray-700 border-gray-700',
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

interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  time: string;
}

export default function VoicePage() {
  const { data: session } = useSession();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');
  const [selectedPersona, setSelectedPersona] = useState('Aria (Natural)');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isActive = voiceState !== 'idle';

  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

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
      const res = await fetch('/api/backend/voice/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('Ask failed');
      const data = await res.json();
      const answer = data.answer || 'No response';
      setAiResponse(answer);
      setHistory(prev => [{
        id: Date.now().toString(),
        question,
        answer,
        time: 'Just now',
      }, ...prev.slice(0, 9)]);
      speak(answer);
    } catch (e) {
      setError('Failed to get AI response. Please try again.');
      setVoiceState('idle');
    }
  }, [authHeader, speak]);

  const startRecording = useCallback(async () => {
    setError('');
    // Try Web Speech API first (streaming transcript)
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage.includes('Spanish') ? 'es-ES'
        : selectedLanguage.includes('French') ? 'fr-FR'
        : selectedLanguage.includes('German') ? 'de-DE'
        : selectedLanguage.includes('Japanese') ? 'ja-JP'
        : 'en-US';

      recognition.onstart = () => setVoiceState('listening');
      recognition.onresult = (e: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        setTranscript(final || interim);
      };
      recognition.onend = () => {
        if (transcript.trim()) askBackend(transcript.trim());
        else setVoiceState('idle');
      };
      recognition.onerror = () => {
        setError('Microphone access denied or not available.');
        setVoiceState('idle');
      };
      recognitionRef.current = recognition;
      recognition.start();
      return;
    }

    // Fallback: record audio → send to Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'recording.webm');
        setVoiceState('processing');
        try {
          const res = await fetch('/api/backend/voice/transcribe', {
            method: 'POST',
            headers: authHeader,
            body: form,
          });
          if (!res.ok) throw new Error('Transcription failed');
          const data = await res.json();
          const text = data.text || '';
          setTranscript(text);
          if (text.trim()) await askBackend(text.trim());
          else setVoiceState('idle');
        } catch {
          setError('Transcription failed. Please try again.');
          setVoiceState('idle');
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setVoiceState('listening');
    } catch {
      setError('Microphone access denied.');
      setVoiceState('idle');
    }
  }, [selectedLanguage, transcript, askBackend, authHeader]);

  const handleMicClick = async () => {
    if (isActive) {
      // Stop
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach(t => t.stop());
      setVoiceState('idle');
      setTranscript('');
      return;
    }
    setTranscript('');
    setAiResponse('');
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
    <div className="min-h-full bg-gray-950 p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice Assistant</h1>
          <p className="mt-1 text-sm text-gray-400">
            Speak naturally to search and interact with your knowledge base
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Language</label>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Voice Persona</label>
            <select
              value={selectedPersona}
              onChange={e => setSelectedPersona(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
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
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <div className="mb-6">
              <WaveformBars
                active={voiceState === 'listening' || voiceState === 'speaking'}
                color={voiceState === 'listening' ? 'bg-red-500' : voiceState === 'speaking' ? 'bg-violet-500' : 'bg-gray-700'}
              />
            </div>

            <button
              onClick={handleMicClick}
              className={`relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all ${STATE_COLORS[voiceState]}`}
            >
              {voiceState === 'processing' ? (
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              ) : isActive ? (
                <MicOff className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </button>

            <p className="text-sm font-medium text-gray-300 mb-1">{STATE_LABELS[voiceState]}</p>

            {transcript && (
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-4 text-left">
                <p className="text-xs font-medium text-gray-400 mb-1">You said:</p>
                <p className="text-sm text-white">{transcript}</p>
              </div>
            )}

            {aiResponse && voiceState !== 'processing' && (
              <div className="mt-3 rounded-lg border border-indigo-800 bg-indigo-900/20 p-4 text-left">
                <p className="text-xs font-medium text-indigo-400 mb-1">AI Response:</p>
                <p className="text-sm text-gray-200">{aiResponse}</p>
              </div>
            )}

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-400 hover:bg-gray-700"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-400">
                <Globe className="h-3 w-3" />
                {selectedLanguage}
              </div>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Quick Questions</h3>
            <div className="space-y-2">
              {[
                'What are the key action items from last week?',
                'Summarize the Q4 product roadmap',
                'What is our data retention policy?',
                'Find documents related to GDPR compliance',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setTranscript(q); askBackend(q); }}
                  disabled={isActive}
                  className="flex items-center justify-between w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <span>{q}</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Queries</h3>
            {history.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No queries yet. Start speaking!</p>
            ) : (
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <Clock className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-400">{item.time}</p>
                    </div>
                    <p className="text-xs font-medium text-white mb-1">{item.question}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{item.answer}</p>
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
