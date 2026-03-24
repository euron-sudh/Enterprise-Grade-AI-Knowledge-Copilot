'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckSquare,
  Clock,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import * as meetingsApi from '@/lib/api/meetings';

interface MeetingRoomPageProps {
  params: { id: string };
}

export default function MeetingRoomPage({ params }: MeetingRoomPageProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activePanel, setActivePanel] = useState('transcript');

  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting', params.id],
    queryFn: () => meetingsApi.getMeeting(params.id),
  });

  const { data: recap } = useQuery({
    queryKey: ['meeting-recap', params.id],
    queryFn: () => meetingsApi.getMeetingRecap(params.id),
    enabled: meeting?.status === 'ended',
  });

  const { data: transcript } = useQuery({
    queryKey: ['meeting-transcript', params.id],
    queryFn: () => meetingsApi.getMeetingTranscript(params.id),
    refetchInterval: meeting?.status === 'in_progress' ? 5000 : false,
  });

  const { data: actionItems } = useQuery({
    queryKey: ['action-items', params.id],
    queryFn: () => meetingsApi.getActionItems(params.id),
  });

  if (meetingLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-surface-500">Meeting not found</p>
      </div>
    );
  }

  const sidePanelTabs = [
    { id: 'transcript', label: 'Transcript', icon: <Mic className="h-4 w-4" /> },
    {
      id: 'actions',
      label: 'Action Items',
      icon: <CheckSquare className="h-4 w-4" />,
      badge: actionItems?.length,
    },
    { id: 'participants', label: 'People', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-100 bg-white px-6 py-3 dark:border-surface-800 dark:bg-surface-950">
        <div>
          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            {meeting.title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(meeting.scheduledAt), 'MMM d, h:mm a')}
            </span>
            <Badge size="sm" variant={meeting.status === 'in_progress' ? 'success' : 'default'}>
              {meeting.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex flex-1 flex-col bg-surface-900">
          <div className="flex flex-1 flex-wrap items-center justify-center gap-3 p-6">
            {meeting.participants.slice(0, 4).map((participant) => (
              <div
                key={participant.id}
                className="relative flex h-40 w-56 items-center justify-center rounded-xl bg-surface-800"
              >
                <Avatar
                  name={participant.name}
                  size="xl"
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1">
                  <span className="text-xs font-medium text-white">{participant.name}</span>
                  {participant.isMuted && <MicOff className="h-3 w-3 text-red-400" />}
                </div>
                {participant.isSpeaking && (
                  <div className="absolute inset-0 rounded-xl ring-2 ring-brand-500" />
                )}
              </div>
            ))}
          </div>

          {/* Meeting controls */}
          {meeting.status === 'in_progress' && (
            <div className="flex items-center justify-center gap-4 py-4">
              <button
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                  isMuted
                    ? 'bg-red-500 text-white'
                    : 'bg-surface-700 text-white hover:bg-surface-600'
                }`}
                onClick={() => setIsMuted((v) => !v)}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                  isVideoOff
                    ? 'bg-red-500 text-white'
                    : 'bg-surface-700 text-white hover:bg-surface-600'
                }`}
                onClick={() => setIsVideoOff((v) => !v)}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex w-80 shrink-0 flex-col border-l border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-950">
          <Tabs
            activeTab={activePanel}
            tabs={sidePanelTabs}
            variant="default"
            onTabChange={setActivePanel}
          >
            {/* Transcript */}
            <TabPanel className="flex-1 overflow-y-auto p-3" id="transcript">
              {transcript?.segments.map((seg) => (
                <div key={seg.id} className="mb-3 flex gap-2">
                  <Avatar name={seg.speakerName} size="xs" />
                  <div>
                    <p className="text-xs font-medium text-surface-600 dark:text-surface-400">
                      {seg.speakerName}
                    </p>
                    <p className="text-sm text-surface-800 dark:text-surface-200">{seg.text}</p>
                  </div>
                </div>
              ))}
              {!transcript && (
                <p className="py-8 text-center text-xs text-surface-400">
                  Transcript will appear here during the meeting
                </p>
              )}
            </TabPanel>

            {/* Action items */}
            <TabPanel className="flex-1 overflow-y-auto p-3" id="actions">
              {recap?.actionItems.map((item) => (
                <Card key={item.id} className="mb-2" padding="sm" variant="bordered">
                  <div className="flex items-start gap-2">
                    <input
                      checked={item.status === 'completed'}
                      className="mt-0.5 h-4 w-4 rounded border-surface-300 text-brand-600"
                      type="checkbox"
                      onChange={() => {}}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                        {item.title}
                      </p>
                      {item.assigneeName && (
                        <p className="mt-0.5 text-xs text-surface-400">
                          Assigned to {item.assigneeName}
                        </p>
                      )}
                      {item.dueDate && (
                        <p className="mt-0.5 text-xs text-surface-400">
                          Due {format(new Date(item.dueDate), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {!recap?.actionItems.length && (
                <p className="py-8 text-center text-xs text-surface-400">
                  Action items will be extracted after the meeting
                </p>
              )}
            </TabPanel>

            {/* Participants */}
            <TabPanel className="flex-1 overflow-y-auto p-3" id="participants">
              {meeting.participants.map((p) => (
                <div key={p.id} className="mb-2 flex items-center gap-3">
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                      {p.name}
                    </p>
                    <p className="text-xs text-surface-400 capitalize">{p.role}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.isMuted && <MicOff className="h-3.5 w-3.5 text-surface-400" />}
                    {!p.isVideoOn && <VideoOff className="h-3.5 w-3.5 text-surface-400" />}
                  </div>
                </div>
              ))}
            </TabPanel>
          </Tabs>

          {/* Summary */}
          {recap?.summary && (
            <div className="border-t border-surface-100 p-4 dark:border-surface-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                AI Summary
              </p>
              <p className="text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                {recap.summary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
