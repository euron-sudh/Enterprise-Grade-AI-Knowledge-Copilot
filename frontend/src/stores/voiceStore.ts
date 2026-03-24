import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { TranscriptSegment, VoicePersona, VoiceSessionStatus } from '@/types';

interface VoiceState {
  sessionId: string | null;
  status: VoiceSessionStatus;
  isRecording: boolean;
  isPlaying: boolean;
  audioLevel: number;
  transcript: TranscriptSegment[];
  selectedVoice: VoicePersona;
  language: string;
  errorMessage: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setStatus: (status: VoiceSessionStatus) => void;
  setRecording: (recording: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setAudioLevel: (level: number) => void;
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  updateTranscriptSegment: (id: string, updates: Partial<TranscriptSegment>) => void;
  clearTranscript: () => void;
  setVoice: (voice: VoicePersona) => void;
  setLanguage: (language: string) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  status: 'idle' as VoiceSessionStatus,
  isRecording: false,
  isPlaying: false,
  audioLevel: 0,
  transcript: [],
  selectedVoice: 'nova' as VoicePersona,
  language: 'en-US',
  errorMessage: null,
};

export const useVoiceStore = create<VoiceState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSessionId: (id) => set({ sessionId: id }),
      setStatus: (status) => set({ status }),
      setRecording: (isRecording) => set({ isRecording }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setAudioLevel: (audioLevel) => set({ audioLevel }),

      addTranscriptSegment: (segment) =>
        set((state) => ({ transcript: [...state.transcript, segment] })),

      updateTranscriptSegment: (id, updates) =>
        set((state) => ({
          transcript: state.transcript.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      clearTranscript: () => set({ transcript: [] }),
      setVoice: (selectedVoice) => set({ selectedVoice }),
      setLanguage: (language) => set({ language }),
      setError: (errorMessage) => set({ errorMessage }),
      reset: () => set(initialState),
    }),
    { name: 'kf-voice-store' }
  )
);
