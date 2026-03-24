'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Video,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckSquare,
  Play,
  Zap,
  Plus,
  Mic,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type MeetingTab = 'upcoming' | 'past';

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  status: string;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number | null;
  status: string;
  participantCount: number;
  hasRecap: boolean;
  hasTranscript: boolean;
}

interface MeetingRecap {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  keyTopics: string[];
}

const PARTICIPANT_COLORS = [
  'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600',
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function MeetingsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<MeetingTab>('upcoming');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [recap, setRecap] = useState<MeetingRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [creating, setCreating] = useState(false);

  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const fetchMeetings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/backend/meetings?tab=${tab}`, {
        headers: authHeader,
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : data.meetings || []);
    } catch {
      setError('Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, [tab]);

  const loadRecap = async (meetingId: string) => {
    if (selectedMeeting === meetingId) { setSelectedMeeting(null); setRecap(null); return; }
    setSelectedMeeting(meetingId);
    setRecapLoading(true);
    try {
      const res = await fetch(`/api/backend/meetings/${meetingId}/recap`, {
        headers: authHeader,
      });
      if (!res.ok) throw new Error('No recap');
      const data = await res.json();
      setRecap(data);
    } catch {
      setRecap(null);
    } finally {
      setRecapLoading(false);
    }
  };

  const createMeeting = async () => {
    if (!newTitle.trim() || !newDate) return;
    setCreating(true);
    try {
      const res = await fetch('/api/backend/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ title: newTitle, scheduled_at: new Date(newDate).toISOString() }),
      });
      if (!res.ok) throw new Error('Create failed');
      setShowCreate(false);
      setNewTitle('');
      setNewDate('');
      fetchMeetings();
    } catch {
      setError('Failed to create meeting.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetings</h1>
          <p className="mt-1 text-sm text-gray-400">AI-powered meeting intelligence and recaps</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMeetings} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Schedule New Meeting</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Meeting title"
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="datetime-local"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={createMeeting} disabled={creating || !newTitle.trim() || !newDate}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg border border-gray-800 bg-gray-900 p-1 w-fit">
        {(['upcoming', 'past'] as MeetingTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Meeting list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <Video className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No {tab} meetings</p>
          {tab === 'upcoming' && (
            <button onClick={() => setShowCreate(true)} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
              Schedule your first meeting →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => (
            <div key={m.id} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${PARTICIPANT_COLORS[0]}`}>
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{m.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(m.scheduledAt)}</span>
                      {m.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.duration} min</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{m.participantCount} participants</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    m.status === 'scheduled' ? 'bg-blue-900/50 text-blue-300' :
                    m.status === 'live' ? 'bg-red-900/50 text-red-300' :
                    'bg-gray-800 text-gray-400'}`}>
                    {m.status}
                  </span>
                  {m.status === 'scheduled' && (
                    <button className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700">
                      <Play className="h-3 w-3" /> Join
                    </button>
                  )}
                  {tab === 'past' && (
                    <button onClick={() => loadRecap(m.id)}
                      className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">
                      <Zap className="h-3 w-3" /> {selectedMeeting === m.id ? 'Hide Recap' : 'AI Recap'}
                    </button>
                  )}
                </div>
              </div>

              {/* Recap panel */}
              {selectedMeeting === m.id && (
                <div className="border-t border-gray-800 bg-gray-950 p-4">
                  {recapLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading recap...
                    </div>
                  ) : recap ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Summary</h4>
                        <p className="text-sm text-gray-300">{recap.summary}</p>
                      </div>
                      {recap.keyTopics?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Key Topics</h4>
                          <div className="flex flex-wrap gap-1">
                            {recap.keyTopics.map((t, i) => (
                              <span key={i} className="rounded-full bg-indigo-900/50 px-2 py-0.5 text-xs text-indigo-300">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {recap.actionItems?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" /> Action Items
                          </h4>
                          <div className="space-y-1">
                            {recap.actionItems.map(ai => (
                              <div key={ai.id} className="flex items-start gap-2 text-sm text-gray-300">
                                <span className="mt-0.5 h-4 w-4 rounded border border-gray-600 flex-shrink-0" />
                                <span>{ai.description} {ai.assignee && <span className="text-gray-500">— {ai.assignee}</span>}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {recap.decisions?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Decisions
                          </h4>
                          <ul className="space-y-1">
                            {recap.decisions.map((d, i) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="text-indigo-400 flex-shrink-0">•</span> {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No recap available for this meeting.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
