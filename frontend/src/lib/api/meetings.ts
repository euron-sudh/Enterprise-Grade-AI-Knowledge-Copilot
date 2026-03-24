import apiClient from './client';

import type {
  ActionItem,
  CreateMeetingPayload,
  Meeting,
  MeetingRecap,
  MeetingTranscript,
  PaginatedResponse,
} from '@/types';

export async function listMeetings(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  upcoming?: boolean;
}): Promise<PaginatedResponse<Meeting>> {
  const { data } = await apiClient.get<PaginatedResponse<Meeting>>('/meetings', { params });
  return data;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(`/meetings/${id}`);
  return data;
}

export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>('/meetings', payload);
  return data;
}

export async function updateMeeting(
  id: string,
  payload: Partial<CreateMeetingPayload>
): Promise<Meeting> {
  const { data } = await apiClient.patch<Meeting>(`/meetings/${id}`, payload);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await apiClient.delete(`/meetings/${id}`);
}

export async function joinMeeting(id: string): Promise<{ token: string; roomUrl: string }> {
  const { data } = await apiClient.post<{ token: string; roomUrl: string }>(
    `/meetings/${id}/join`
  );
  return data;
}

export async function startRecording(id: string): Promise<void> {
  await apiClient.post(`/meetings/${id}/recording/start`);
}

export async function stopRecording(id: string): Promise<void> {
  await apiClient.post(`/meetings/${id}/recording/stop`);
}

export async function getMeetingTranscript(id: string): Promise<MeetingTranscript> {
  const { data } = await apiClient.get<MeetingTranscript>(`/meetings/${id}/transcript`);
  return data;
}

export async function getMeetingRecap(id: string): Promise<MeetingRecap> {
  const { data } = await apiClient.get<MeetingRecap>(`/meetings/${id}/recap`);
  return data;
}

export async function getActionItems(
  meetingId: string
): Promise<ActionItem[]> {
  const { data } = await apiClient.get<ActionItem[]>(`/meetings/${meetingId}/action-items`);
  return data;
}

export async function updateActionItem(
  id: string,
  payload: Partial<ActionItem>
): Promise<ActionItem> {
  const { data } = await apiClient.patch<ActionItem>(`/action-items/${id}`, payload);
  return data;
}
