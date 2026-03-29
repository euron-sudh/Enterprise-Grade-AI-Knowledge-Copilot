export type VoicePersona =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

export type VoiceSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'error';

export interface VoiceSession {
  id: string;
  userId: string;
  status: VoiceSessionStatus;
  language: string;
  persona: VoicePersona;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript: TranscriptSegment[];
}

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  speaker: 'user' | 'assistant';
  text: string;
  confidence: number;
  startTimeMs: number;
  endTimeMs: number;
  isFinal: boolean;
}

export interface VoiceConfig {
  persona: VoicePersona;
  language: string;
  speed: number;
  pitch: number;
  enableVAD: boolean;
  silenceThresholdMs: number;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

export interface SpeechGenerationRequest {
  text: string;
  persona: VoicePersona;
  speed?: number;
}
