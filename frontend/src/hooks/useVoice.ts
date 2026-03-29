'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useVoiceStore } from '@/stores/voiceStore';
import type { AudioDeviceInfo } from '@/types';

export function useMediaDevices() {
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices: AudioDeviceInfo[] = mediaDevices
        .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Device ${i + 1}`,
          kind: d.kind as 'audioinput' | 'audiooutput',
          isDefault: d.deviceId === 'default',
        }));
      setDevices(audioDevices);
    } catch (err) {
      setError((err as Error).message);
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    void requestPermission();
  }, [requestPermission]);

  return { devices, hasPermission, error, requestPermission };
}

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { setRecording, setAudioLevel, setStatus } = useVoiceStore();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);
      };

      recorder.start(100);
      setRecording(true);
      setStatus('recording');

      // Audio level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      animFrameRef.current = requestAnimationFrame(updateLevel);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setStatus('error');
    }
  }, [setRecording, setAudioLevel, setStatus]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setStatus('processing');
    }
  }, [setRecording, setStatus]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    chunksRef.current = [];
  }, []);

  return { startRecording, stopRecording, clearRecording, audioBlob };
}

export function useVAD(silenceThresholdMs = 1500) {
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { audioLevel } = useVoiceStore();

  const onSilence = useCallback(
    (callback: () => void) => {
      if (audioLevel < 0.02) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            callback();
            silenceTimerRef.current = null;
          }, silenceThresholdMs);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
    },
    [audioLevel, silenceThresholdMs]
  );

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return { onSilence };
}
