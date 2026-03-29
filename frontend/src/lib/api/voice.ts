import apiClient from './client';

import type {
  SpeechGenerationRequest,
  VoiceConfig,
  VoicePersona,
  VoiceSession,
} from '@/types';

export async function createVoiceSession(config: VoiceConfig): Promise<VoiceSession> {
  const { data } = await apiClient.post<VoiceSession>('/voice/sessions', config);
  return data;
}

export async function endVoiceSession(sessionId: string): Promise<VoiceSession> {
  const { data } = await apiClient.post<VoiceSession>(`/voice/sessions/${sessionId}/end`);
  return data;
}

export async function generateSpeech(request: SpeechGenerationRequest): Promise<Blob> {
  const response = await apiClient.post('/voice/synthesize', request, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function listVoices(): Promise<
  Array<{ id: VoicePersona; name: string; description: string; previewUrl: string }>
> {
  const { data } = await apiClient.get('/voice/voices');
  return data as Array<{ id: VoicePersona; name: string; description: string; previewUrl: string }>;
}

export async function transcribeAudio(audioBlob: Blob, language?: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  if (language) formData.append('language', language);

  const { data } = await apiClient.post<{ text: string }>('/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.text;
}

export async function getVoiceSession(sessionId: string): Promise<VoiceSession> {
  const { data } = await apiClient.get<VoiceSession>(`/voice/sessions/${sessionId}`);
  return data;
}

export async function askVoiceQuestion(question: string): Promise<string> {
  const { data } = await apiClient.post<{ answer: string }>('/voice/ask', { question });
  return data.answer;
}
