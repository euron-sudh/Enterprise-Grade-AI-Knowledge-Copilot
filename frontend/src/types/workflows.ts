export interface WorkflowStep {
  type: 'search_knowledge' | 'ai_summarize' | 'ai_qa' | 'slack_webhook' | 'http_webhook';
  label: string;
  config: Record<string, string | number | boolean>;
}

export type WorkflowStatus = 'active' | 'paused' | 'draft';
export type WorkflowTrigger = 'manual' | 'document_upload';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed';
  triggerData: Record<string, unknown>;
  stepResults: StepResult[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface StepResult {
  step: number;
  label: string;
  type: string;
  status: 'success' | 'failed';
  output?: string;
  outputs?: Record<string, unknown>;
  error?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggerType: WorkflowTrigger;
  triggerConfig: Record<string, string>;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  recentRuns: WorkflowRun[];
}
