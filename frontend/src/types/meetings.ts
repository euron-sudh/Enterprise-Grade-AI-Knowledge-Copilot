export type MeetingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'ended'
  | 'cancelled';

export type MeetingPlatform = 'knowledgeforge' | 'zoom' | 'teams' | 'meet';

export interface MeetingParticipant {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'host' | 'co-host' | 'participant';
  joinedAt?: string;
  leftAt?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  organizerId: string;
  organizerName: string;
  status: MeetingStatus;
  platform: MeetingPlatform;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  participants: MeetingParticipant[];
  maxParticipants: number;
  isRecorded: boolean;
  recordingUrl?: string;
  meetingUrl: string;
  joinCode: string;
  agenda?: string;
  tags: string[];
  createdAt: string;
}

export interface MeetingTranscript {
  id: string;
  meetingId: string;
  segments: TranscriptEntry[];
  generatedAt: string;
  language: string;
}

export interface TranscriptEntry {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

export interface MeetingRecap {
  meetingId: string;
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  generatedAt: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  participantEmails: string[];
  isRecorded: boolean;
  agenda?: string;
}
