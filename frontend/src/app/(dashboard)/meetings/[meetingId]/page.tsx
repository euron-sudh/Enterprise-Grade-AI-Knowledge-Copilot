'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Check,
  Users, Link2, Loader2, AlertCircle,
} from 'lucide-react';

interface MeetingRoomPageProps {
  params: { meetingId: string };
}

export default function MeetingRoomPage({ params }: MeetingRoomPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [meetingTitle, setMeetingTitle] = useState('Meeting Room');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/meetings/${params.meetingId}`
    : '';

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  // Fetch meeting title
  useEffect(() => {
    if (!session) return;
    authFetch(`/api/backend/meetings/${params.meetingId}`, {}, session?.accessToken, getUser())
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.title) setMeetingTitle(d.title); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.meetingId, session]);

  // Start camera
  useEffect(() => {
    let mounted = true;
    setCameraLoading(true);
    setCameraError('');

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setCameraLoading(false);
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please allow camera access in your browser and refresh.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera and refresh.');
        } else {
          setCameraError(`Could not start camera: ${err.message}`);
        }
      });

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(v => !v);
  };

  const toggleVideo = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    setIsVideoOff(v => !v);
  };

  const leave = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    router.push('/meetings');
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-white/10 flex-shrink-0">
        <div>
          <h1 className="text-white font-semibold text-sm">{meetingTitle}</h1>
          <p className="text-gray-500 text-xs mt-0.5 font-mono">{fmt(elapsed)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Invite link */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-800 border border-white/10 px-3 py-1.5">
            <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 max-w-48 truncate hidden sm:block">{inviteLink}</span>
            <button
              onClick={copyInvite}
              className="ml-1 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy invite'}
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>1 participant</span>
          </div>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {cameraLoading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <p className="text-gray-400 text-sm">Starting camera...</p>
          </div>
        ) : cameraError ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-red-400 text-sm">{cameraError}</p>
            {/* Still show the room controls even without camera */}
            <div className="w-64 h-48 rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-xl font-bold">
                    {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'Y'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">{session?.user?.name ?? 'You'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-3xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted // muted so you don't hear yourself
              className={`w-full rounded-2xl bg-gray-900 aspect-video object-cover ${isVideoOff ? 'hidden' : 'block'}`}
            />
            {isVideoOff && (
              <div className="w-full aspect-video rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-3xl font-bold">
                      {session?.user?.name?.charAt(0)?.toUpperCase() ?? 'Y'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{session?.user?.name ?? 'You'}</p>
                  <p className="text-gray-600 text-xs mt-1">Camera off</p>
                </div>
              </div>
            )}
            {/* Name tag */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-lg px-2 py-1">
              <span className="text-white text-xs font-medium">{session?.user?.name ?? 'You'} (you)</span>
              {isMuted && <MicOff className="h-3 w-3 text-red-400" />}
            </div>
          </div>
        )}
      </div>

      {/* Invite banner */}
      <div className="mx-6 mb-4 rounded-xl bg-indigo-900/30 border border-indigo-500/30 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-indigo-300 text-sm font-medium">Invite others to join</p>
          <p className="text-indigo-400/70 text-xs mt-0.5 font-mono truncate max-w-sm">{inviteLink}</p>
        </div>
        <button
          onClick={copyInvite}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 pb-6 flex-shrink-0">
        <button
          onClick={toggleMic}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </button>

        <button
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
            isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6 text-white" /> : <Video className="h-6 w-6 text-white" />}
        </button>

        <button
          onClick={leave}
          title="Leave meeting"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-all"
        >
          <PhoneOff className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  );
}
