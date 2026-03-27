'use client';

import { useState } from 'react';
import { ArrowRight, Zap, Mail, MessageSquare, Database, Globe, FileText, Bell, GitBranch, Clock, Plus, X, ChevronRight } from 'lucide-react';

const TRIGGERS = [
  { id: 'new_document', icon: FileText, label: 'New Document Uploaded', category: 'Knowledge' },
  { id: 'new_message', icon: MessageSquare, label: 'New Slack Message', category: 'Communication' },
  { id: 'schedule', icon: Clock, label: 'Scheduled (CRON)', category: 'Time' },
  { id: 'webhook', icon: Globe, label: 'Webhook Received', category: 'API' },
  { id: 'email', icon: Mail, label: 'Email Received', category: 'Communication' },
  { id: 'database', icon: Database, label: 'Database Row Created', category: 'Data' },
];

const ACTIONS = [
  { id: 'ai_summarize', icon: Zap, label: 'AI Summarize', category: 'AI' },
  { id: 'send_email', icon: Mail, label: 'Send Email', category: 'Communication' },
  { id: 'slack_notify', icon: MessageSquare, label: 'Send Slack Message', category: 'Communication' },
  { id: 'create_ticket', icon: Database, label: 'Create Jira Ticket', category: 'Project Mgmt' },
  { id: 'api_call', icon: Globe, label: 'HTTP Request', category: 'API' },
  { id: 'condition', icon: GitBranch, label: 'Condition / Branch', category: 'Logic' },
  { id: 'notify', icon: Bell, label: 'In-App Notification', category: 'Communication' },
];

type Step = { id: string; type: string; label: string; icon: React.ElementType; isTrigger: boolean };

export default function WorkflowCreatePage() {
  const [name, setName] = useState('New Workflow');
  const [steps, setSteps] = useState<Step[]>([]);
  const [showTrigger, setShowTrigger] = useState(false);
  const [showAction, setShowAction] = useState(false);

  const addTrigger = (item: typeof TRIGGERS[0]) => {
    setSteps([{ id: Math.random().toString(36).slice(2), type: item.id, label: item.label, icon: item.icon, isTrigger: true }]);
    setShowTrigger(false);
  };

  const addAction = (item: typeof ACTIONS[0]) => {
    setSteps(s => [...s, { id: Math.random().toString(36).slice(2), type: item.id, label: item.label, icon: item.icon, isTrigger: false }]);
    setShowAction(false);
  };

  const hasTrigger = steps.some(s => s.isTrigger);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-gray-950/50">
        <input value={name} onChange={e => setName(e.target.value)} className="text-white font-bold text-lg bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none transition-colors px-1 py-0.5" />
        <div className="flex-1" />
        <button className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl text-sm border border-white/10 transition-colors">Save Draft</button>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">Publish</button>
      </div>

      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 p-8 overflow-auto bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_70%)]">
          <div className="max-w-lg mx-auto space-y-2">
            {steps.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-white font-semibold">Start building your workflow</h3>
                <p className="text-gray-500 text-sm mt-2">Choose a trigger to begin</p>
              </div>
            )}

            {/* Trigger */}
            {!hasTrigger ? (
              <button onClick={() => setShowTrigger(true)} className="w-full border-2 border-dashed border-white/15 hover:border-indigo-500/60 rounded-2xl p-5 text-center transition-colors group">
                <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-indigo-400 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Trigger</span>
                </div>
              </button>
            ) : null}

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.id}>
                  <div className={`bg-gray-900 border rounded-2xl p-4 flex items-center gap-3 group ${step.isTrigger ? 'border-indigo-500/40' : 'border-white/10'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${step.isTrigger ? 'bg-indigo-500/20' : 'bg-gray-800'}`}>
                      <Icon className={`w-4 h-4 ${step.isTrigger ? 'text-indigo-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{step.isTrigger ? 'Trigger' : `Step ${i}`}</div>
                      <div className="text-white text-sm font-medium">{step.label}</div>
                    </div>
                    <button onClick={() => setSteps(s => s.filter(x => x.id !== step.id))} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex justify-center my-1">
                      <div className="w-0.5 h-6 bg-white/10 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}

            {hasTrigger && (
              <>
                <div className="flex justify-center my-1">
                  <div className="w-0.5 h-6 bg-white/10 rounded-full" />
                </div>
                <button onClick={() => setShowAction(true)} className="w-full border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-xl p-4 text-center transition-colors group">
                  <div className="flex items-center justify-center gap-2 text-gray-600 group-hover:text-violet-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Action</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Picker panels */}
        {(showTrigger || showAction) && (
          <div className="w-72 border-l border-white/5 bg-gray-950/50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Choose {showTrigger ? 'Trigger' : 'Action'}</h3>
              <button onClick={() => { setShowTrigger(false); setShowAction(false); }} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {(showTrigger ? TRIGGERS : ACTIONS).map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => showTrigger ? addTrigger(item) : addAction(item)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-white/5 hover:border-white/15 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{item.label}</div>
                      <div className="text-gray-600 text-xs">{item.category}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
