'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check,
  Users, Link2, Loader2, AlertCircle, FileText, X, Circle,
} from 'lucide-react';

interface TranscriptLine {
  ts: string;   // HH:MM:SS
  text: string;
  isFinal: boolean;
}

interface MeetingRoomPageProps {
  params: { meetingId: string };
}

function hms(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function nowHMS() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function MeetingRoomPage({ params }: MeetingRoomPageProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const isRecognisingRef = useRef(false);

  // State
  const [meetingTitle, setMeetingTitle] = useState('Meeting Room');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [liveText, setLiveText] = useState('');
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/meetings/${params.meetingId}`
    : '';

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  // Fetch meeting title
  useEffect(() => {
    if (!session) return;
    authFetch(`/api/backend/meetings/${params.meetingId}`, {}, (session as any)?.accessToken, getUser())
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.title) setMeetingTitle(d.title); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.meetingId, session]);

  // ── Camera + audio stream ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // Assign to the video element — it is always in the DOM so ref is valid
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);

        // ── Auto-start recording ──────────────────────────────────────────
        startRecording(stream);
      })
      .catch(err => {
        if (!mounted) return;
        setCameraReady(true); // still mark ready so we show the avatar fallback
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera/microphone access denied. Please allow access in your browser and refresh.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera and refresh.');
        } else {
          setCameraError(`Could not start camera: ${err.message}`);
        }
      });

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      stopRecording(false);
      stopTranscription();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assign stream to video whenever videoRef becomes available (handles HMR / strict mode)
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // ── MediaRecorder ─────────────────────────────────────────────────────────
  const startRecording = (stream: MediaStream) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000); // collect a chunk every second
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.warn('MediaRecorder not available:', e);
    }
  };

  const stopRecording = useCallback((andSave = true) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      if (!andSave) return;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meetingTitle.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    recorder.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, [meetingTitle]);

  // ── Live transcription ────────────────────────────────────────────────────
  const startTranscription = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || isRecognisingRef.current) return;

    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => { isRecognisingRef.current = true; };
      recognition.onend = () => {
        isRecognisingRef.current = false;
        // Auto-restart so transcription runs for the whole meeting
        if (streamRef.current) {
          setTimeout(() => startTranscription(), 300);
        }
      };
      recognition.onerror = (e: any) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        console.warn('SR error:', e.error);
        isRecognisingRef.current = false;
      };
      recognition.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            const text = result[0].transcript.trim();
            if (text) {
              setTranscript(prev => [...prev, { ts: nowHMS(), text, isFinal: true }]);
              setLiveText('');
            }
          } else {
            interim += result[0].transcript;
          }
        }
        setLiveText(interim);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Could not start transcription:', e);
    }
  }, []);

  const stopTranscription = () => {
    isRecognisingRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
  };

  // Start transcription once stream is ready
  useEffect(() => {
    if (cameraReady && !cameraError) {
      startTranscription();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, liveText]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!streamRef.current) return;
    const nextMuted = !isMuted;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = !nextMuted; });
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    if (!streamRef.current) return;
    const nextOff = !isVideoOff;
    streamRef.current.getVideoTracks().forEach(t => { t.enabled = !nextOff; });
    setIsVideoOff(nextOff);
  };

  const leave = () => {
    stopTranscription();
    stopRecording(true); // triggers download
    streamRef.current?.getTracks().forEach(t => t.stop());
    router.push('/meetings');
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-white font-semibold text-sm">{meetingTitle}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-gray-400 text-xs font-mono">{hms(elapsed)}</p>
              {isRecording && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
                  <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
                  REC
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-gray-800 border border-white/10 px-3 py-1.5">
            <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 max-w-36 truncate hidden sm:block">{inviteLink}</span>
            <button onClick={copyInvite} className="ml-1 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy invite'}
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>1 participant</span>
          </div>
          <button
            onClick={() => setShowTranscript(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              showTranscript
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-gray-800 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Transcript
          </button>
        </div>
      </div>

      {/* Body: video + transcript panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {!cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center z-10 bg-gray-950">
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
              <p className="text-gray-400 text-sm">Starting camera...</p>
            </div>
          )}

          {cameraError && cameraReady && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/40 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 max-w-sm z-10">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs">{cameraError}</p>
            </div>
          )}

          <div className="relative w-full max-w-3xl">
            {/* Always render video — never conditionally, so ref stays attached */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full rounded-2xl aspect-video object-cover bg-gray-900 ${
                isVideoOff || cameraError ? 'hidden' : 'block'
              }`}
            />

            {/* Avatar fallback when camera is off or errored */}
            {(isVideoOff || cameraError) && cameraReady && (
              <div className="w-full aspect-video rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-3xl font-bold">
                      {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{session?.user?.name ?? 'You'}</p>
                  <p className="text-gray-500 text-xs mt-1">{cameraError ? 'Camera unavailable' : 'Camera off'}</p>
                </div>
              </div>
            )}

            {/* Name tag */}
            {cameraReady && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-lg px-2.5 py-1">
                <span className="text-white text-xs font-medium">
                  {session?.user?.name ?? 'Admin'} (you)
                </span>
                {isMuted && <MicOff className="h-3 w-3 text-red-400" />}
              </div>
            )}
          </div>
        </div>

        {/* Live transcript panel */}
        {showTranscript && (
          <div className="w-80 flex-shrink-0 border-l border-white/10 bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h3 className="text-white text-sm font-semibold">Live Transcript</h3>
                <p className="text-gray-500 text-xs mt-0.5">Auto-generated • English</p>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {transcript.length === 0 && !liveText && (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Mic className="h-8 w-8 text-gray-700 mb-2" />
                  <p className="text-gray-600 text-xs">Transcript will appear here as you speak</p>
                </div>
              )}

              {transcript.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 text-[10px] font-mono flex-shrink-0 mt-0.5">{line.ts}</span>
                  <p className="text-gray-300 text-xs leading-relaxed">{line.text}</p>
                </div>
              ))}

              {liveText && (
                <div className="flex gap-2 opacity-60">
                  <span className="text-gray-600 text-[10px] font-mono flex-shrink-0 mt-0.5">…</span>
                  <p className="text-gray-400 text-xs leading-relaxed italic">{liveText}</p>
                </div>
              )}

              <div ref={transcriptBottomRef} />
            </div>

            {/* Transcript actions */}
            {transcript.length > 0 && (
              <div className="border-t border-white/10 px-4 py-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = transcript.map(l => `[${l.ts}] ${l.text}`).join('\n');
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${meetingTitle.replace(/\s+/g, '-')}-transcript.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Download .txt
                </button>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => setTranscript([])}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 py-5 bg-gray-900 border-t border-white/10 flex-shrink-0">
        <button
          onClick={toggleMic}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
        </button>

        <button
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
            isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
        </button>

        <button
          onClick={leave}
          title="Leave meeting"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-all"
        >
          <PhoneOff className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}
