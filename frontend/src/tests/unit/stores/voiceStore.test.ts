import { beforeEach, describe, expect, it } from 'vitest';
import { useVoiceStore } from '@/stores/voiceStore';
import type { TranscriptSegment } from '@/types';

const mockSegment: TranscriptSegment = {
  id: 'seg-1',
  sessionId: 'session-1',
  text: 'Hello, how can I help you?',
  speaker: 'assistant',
  confidence: 1,
  startTimeMs: 0,
  endTimeMs: 2500,
  isFinal: true,
};

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.setState({
      sessionId: null,
      status: 'idle',
      isRecording: false,
      isPlaying: false,
      audioLevel: 0,
      transcript: [],
      selectedVoice: 'nova',
      language: 'en-US',
      errorMessage: null,
    });
  });

  describe('session', () => {
    it('sets session ID', () => {
      useVoiceStore.getState().setSessionId('session-abc');
      expect(useVoiceStore.getState().sessionId).toBe('session-abc');
    });

    it('clears session ID', () => {
      useVoiceStore.getState().setSessionId('session-abc');
      useVoiceStore.getState().setSessionId(null);
      expect(useVoiceStore.getState().sessionId).toBeNull();
    });
  });

  describe('status', () => {
    it('sets status to connecting', () => {
      useVoiceStore.getState().setStatus('connecting');
      expect(useVoiceStore.getState().status).toBe('connecting');
    });

    it('sets status to active', () => {
      useVoiceStore.getState().setStatus('connected');
      expect(useVoiceStore.getState().status).toBe('connected');
    });

    it('sets status back to idle', () => {
      useVoiceStore.getState().setStatus('connected');
      useVoiceStore.getState().setStatus('idle');
      expect(useVoiceStore.getState().status).toBe('idle');
    });
  });

  describe('recording', () => {
    it('sets recording to true', () => {
      useVoiceStore.getState().setRecording(true);
      expect(useVoiceStore.getState().isRecording).toBe(true);
    });

    it('sets recording to false', () => {
      useVoiceStore.getState().setRecording(true);
      useVoiceStore.getState().setRecording(false);
      expect(useVoiceStore.getState().isRecording).toBe(false);
    });
  });

  describe('playback', () => {
    it('sets playing to true', () => {
      useVoiceStore.getState().setPlaying(true);
      expect(useVoiceStore.getState().isPlaying).toBe(true);
    });

    it('sets playing to false', () => {
      useVoiceStore.getState().setPlaying(true);
      useVoiceStore.getState().setPlaying(false);
      expect(useVoiceStore.getState().isPlaying).toBe(false);
    });
  });

  describe('audio level', () => {
    it('sets audio level', () => {
      useVoiceStore.getState().setAudioLevel(0.75);
      expect(useVoiceStore.getState().audioLevel).toBe(0.75);
    });

    it('clamps audio level update', () => {
      useVoiceStore.getState().setAudioLevel(0);
      expect(useVoiceStore.getState().audioLevel).toBe(0);
    });
  });

  describe('transcript', () => {
    it('adds a transcript segment', () => {
      useVoiceStore.getState().addTranscriptSegment(mockSegment);
      expect(useVoiceStore.getState().transcript).toHaveLength(1);
      expect(useVoiceStore.getState().transcript[0]?.id).toBe('seg-1');
    });

    it('adds multiple segments in order', () => {
      const seg2: TranscriptSegment = { ...mockSegment, id: 'seg-2', startTimeMs: 2500, endTimeMs: 5000 };
      useVoiceStore.getState().addTranscriptSegment(mockSegment);
      useVoiceStore.getState().addTranscriptSegment(seg2);
      const transcript = useVoiceStore.getState().transcript;
      expect(transcript).toHaveLength(2);
      expect(transcript[0]?.id).toBe('seg-1');
      expect(transcript[1]?.id).toBe('seg-2');
    });

    it('updates a transcript segment', () => {
      useVoiceStore.getState().addTranscriptSegment({ ...mockSegment, isFinal: false });
      useVoiceStore.getState().updateTranscriptSegment('seg-1', { isFinal: true, text: 'Final text' });
      const seg = useVoiceStore.getState().transcript[0];
      expect(seg?.isFinal).toBe(true);
      expect(seg?.text).toBe('Final text');
    });

    it('clears transcript', () => {
      useVoiceStore.getState().addTranscriptSegment(mockSegment);
      useVoiceStore.getState().clearTranscript();
      expect(useVoiceStore.getState().transcript).toHaveLength(0);
    });
  });

  describe('voice settings', () => {
    it('sets selected voice', () => {
      useVoiceStore.getState().setVoice('alloy');
      expect(useVoiceStore.getState().selectedVoice).toBe('alloy');
    });

    it('sets language', () => {
      useVoiceStore.getState().setLanguage('fr-FR');
      expect(useVoiceStore.getState().language).toBe('fr-FR');
    });
  });

  describe('error handling', () => {
    it('sets error message', () => {
      useVoiceStore.getState().setError('Microphone access denied');
      expect(useVoiceStore.getState().errorMessage).toBe('Microphone access denied');
    });

    it('clears error message', () => {
      useVoiceStore.getState().setError('Some error');
      useVoiceStore.getState().setError(null);
      expect(useVoiceStore.getState().errorMessage).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useVoiceStore.getState().setSessionId('session-xyz');
      useVoiceStore.getState().setStatus('connected');
      useVoiceStore.getState().setRecording(true);
      useVoiceStore.getState().addTranscriptSegment(mockSegment);
      useVoiceStore.getState().setError('oops');

      useVoiceStore.getState().reset();

      const state = useVoiceStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.isRecording).toBe(false);
      expect(state.transcript).toHaveLength(0);
      expect(state.errorMessage).toBeNull();
    });
  });
});
