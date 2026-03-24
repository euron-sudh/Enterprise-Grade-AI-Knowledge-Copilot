import apiClient from './client';
import type { Workflow, WorkflowRun, WorkflowStep, WorkflowTrigger } from '@/types/workflows';

function toWorkflow(raw: Record<string, unknown>): Workflow {
  return {
    id: raw['id'] as string,
    name: raw['name'] as string,
    description: raw['description'] as string | undefined,
    triggerType: raw['trigger_type'] as WorkflowTrigger,
    triggerConfig: (raw['trigger_config'] ?? {}) as Record<string, string>,
    steps: (raw['steps'] ?? []) as WorkflowStep[],
    status: raw['status'] as Workflow['status'],
    runCount: raw['run_count'] as number,
    lastRunAt: raw['last_run_at'] as string | undefined,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
    recentRuns: ((raw['recent_runs'] ?? []) as Record<string, unknown>[]).map(toRun),
  };
}

function toRun(raw: Record<string, unknown>): WorkflowRun {
  return {
    id: raw['id'] as string,
    workflowId: raw['workflow_id'] as string,
    status: raw['status'] as WorkflowRun['status'],
    triggerData: (raw['trigger_data'] ?? {}) as Record<string, unknown>,
    stepResults: (raw['step_results'] ?? []) as WorkflowRun['stepResults'],
    error: raw['error'] as string | undefined,
    startedAt: raw['started_at'] as string,
    completedAt: raw['completed_at'] as string | undefined,
  };
}

export async function listWorkflows(): Promise<Workflow[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>('/workflows');
  return data.map(toWorkflow);
}

export async function createWorkflow(payload: {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, string>;
  steps: WorkflowStep[];
  status?: string;
}): Promise<Workflow> {
  const { data } = await apiClient.post<Record<string, unknown>>('/workflows', payload);
  return toWorkflow(data);
}

export async function updateWorkflow(id: string, payload: Partial<{
  name: string;
  description: string;
  status: string;
  steps: WorkflowStep[];
}>): Promise<Workflow> {
  const { data } = await apiClient.patch<Record<string, unknown>>(`/workflows/${id}`, payload);
  return toWorkflow(data);
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiClient.delete(`/workflows/${id}`);
}

export async function pauseWorkflow(id: string): Promise<Workflow> {
  const { data } = await apiClient.post<Record<string, unknown>>(`/workflows/${id}/pause`);
  return toWorkflow(data);
}

export async function resumeWorkflow(id: string): Promise<Workflow> {
  const { data } = await apiClient.post<Record<string, unknown>>(`/workflows/${id}/resume`);
  return toWorkflow(data);
}

export async function runWorkflow(id: string): Promise<WorkflowRun> {
  const { data } = await apiClient.post<Record<string, unknown>>(`/workflows/${id}/run`);
  return toRun(data);
}

export async function listRuns(id: string): Promise<WorkflowRun[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`/workflows/${id}/runs`);
  return data.map(toRun);
}
