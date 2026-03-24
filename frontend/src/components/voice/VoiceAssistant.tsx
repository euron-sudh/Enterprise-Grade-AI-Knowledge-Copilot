'use client';

import { useCallback, useEffect } from 'react';

import { AlertCircle, Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAudioRecorder, useMediaDevices } from '@/hooks/useVoice';
import * as voiceApi from '@/lib/api/voice';
import { useVoiceStore } from '@/stores/voiceStore';

import { AudioWaveform } from './AudioWaveform';

export function VoiceAssistant() {
  const {
    status,
    isRecording,
    audioLevel,
    transcript,
    selectedVoice,
    language,
    setStatus,
    setError,
    addTranscriptSegment,
    clearTranscript,
  } = useVoiceStore();

  const { hasPermission, error: deviceError, requestPermission } = useMediaDevices();
  const { startRecording, stopRecording, clearRecording, audioBlob } = useAudioRecorder();

  // When audio blob is ready, transcribe it
  useEffect(() => {
    if (!audioBlob) return;

    const transcribe = async () => {
      try {
        setStatus('processing');
        const text = await voiceApi.transcribeAudio(audioBlob, language);
        if (text.trim()) {
          // Add user transcript segment
          addTranscriptSegment({
            id: `seg-${Date.now()}`,
            sessionId: 'local',
            speaker: 'user',
            text,
            confidence: 0.95,
            startTimeMs: 0,
            endTimeMs: 1000,
            isFinal: true,
          });

          // Get real AI answer (RAG-powered)
          const answer = await voiceApi.askVoiceQuestion(text);

          // Add AI transcript segment
          addTranscriptSegment({
            id: `seg-ai-${Date.now()}`,
            sessionId: 'local',
            speaker: 'assistant',
            text: answer,
            confidence: 1,
            startTimeMs: 0,
            endTimeMs: 1000,
            isFinal: true,
          });

          // Convert answer to speech — try API, fall back to browser TTS
          setStatus('speaking');
          try {
            const speechBlob = await voiceApi.generateSpeech({
              text: answer,
              persona: selectedVoice,
            });
            const url = URL.createObjectURL(speechBlob);
            const audio = new Audio(url);
            audio.onended = () => {
              setStatus('connected');
              URL.revokeObjectURL(url);
            };
            await audio.play();
          } catch {
            // Fall back to browser Web Speech API (works without any API key)
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(answer);
              utter.rate = 1;
              utter.pitch = 1;
              utter.onend = () => setStatus('connected');
              window.speechSynthesis.speak(utter);
            } else {
              setStatus('connected');
            }
          }
        } else {
          setStatus('connected');
        }
        clearRecording();
      } catch (err) {
        console.error(err);
        setError('Failed to process voice input');
        setStatus('error');
        toast.error('Voice processing failed. Please try again.');
      }
    };

    void transcribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const handlePushToTalk = useCallback(async () => {
    if (!hasPermission) {
      await requestPermission();
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      setStatus('connecting');
      await startRecording();
    }
  }, [hasPermission, isRecording, requestPermission, startRecording, stopRecording, setStatus]);

  const statusLabel: Record<typeof status, string> = {
    idle: 'Press to start',
    connecting: 'Connecting...',
    connected: 'Ready',
    recording: 'Listening...',
    processing: 'Processing...',
    speaking: 'Speaking...',
    error: 'Error',
  };

  const statusVariant: Record<
    typeof status,
    'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'outline'
  > = {
    idle: 'default',
    connecting: 'warning',
    connected: 'success',
    recording: 'danger',
    processing: 'info',
    speaking: 'primary',
    error: 'danger',
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Status badge */}
      <Badge dot size="lg" variant={statusVariant[status]}>
        {statusLabel[status]}
      </Badge>

      {/* Waveform */}
      <div className="flex h-20 items-center">
        <AudioWaveform
          audioLevel={audioLevel}
          barCount={24}
          className="w-80"
          isActive={isRecording}
        />
      </div>

      {/* Push to talk button */}
      <div className="relative">
        <button
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={`
            relative flex h-24 w-24 items-center justify-center rounded-full
            transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500
            ${
              isRecording
                ? 'bg-red-500 shadow-[0_0_0_12px_rgba(239,68,68,0.2)] hover:bg-red-600'
                : 'bg-brand-600 shadow-brand-lg hover:bg-brand-700'
            }
          `}
          disabled={status === 'processing' || status === 'speaking'}
          onClick={handlePushToTalk}
        >
          {isRecording ? (
            <MicOff className="h-10 w-10 text-white" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}
          {isRecording && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-30" />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-sm text-surface-500">
        {isRecording ? 'Click again to stop' : 'Click the microphone to start talking'}
      </p>

      {/* Device error */}
      {deviceError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Microphone access denied: {deviceError}</span>
          <Button size="sm" variant="danger-ghost" onClick={requestPermission}>
            Grant Access
          </Button>
        </div>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <Card className="w-full max-w-2xl" variant="bordered">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Transcript
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={clearTranscript}>
              Clear
            </Button>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {transcript.map((seg) => (
              <div
                key={seg.id}
                className={`flex gap-3 ${seg.speaker === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`
                    rounded-xl px-3 py-2 text-sm max-w-[80%]
                    ${
                      seg.speaker === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-200'
                    }
                  `}
                >
                  {seg.text}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
