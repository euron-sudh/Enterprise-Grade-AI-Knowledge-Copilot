import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { Workflow } from '@/types/workflows';

const mockWorkflow: Workflow = {
  id: 'wf-1',
  name: 'Slack Digest',
  description: 'Daily summary',
  triggerType: 'schedule',
  triggerConfig: { cron: '0 9 * * MON-FRI' },
  steps: [],
  status: 'active',
  runCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('workflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.setState({ workflows: [] });
  });

  it('initialises with empty workflows', () => {
    expect(useWorkflowStore.getState().workflows).toHaveLength(0);
  });

  it('sets workflows', () => {
    useWorkflowStore.getState().setWorkflows([mockWorkflow]);
    expect(useWorkflowStore.getState().workflows).toHaveLength(1);
  });

  it('adds a workflow at the front', () => {
    const wf2: Workflow = { ...mockWorkflow, id: 'wf-2', name: 'Second' };
    useWorkflowStore.getState().setWorkflows([mockWorkflow]);
    useWorkflowStore.getState().addWorkflow(wf2);
    const workflows = useWorkflowStore.getState().workflows;
    expect(workflows).toHaveLength(2);
    expect(workflows[0]?.id).toBe('wf-2');
  });

  it('updates a workflow', () => {
    useWorkflowStore.getState().setWorkflows([mockWorkflow]);
    useWorkflowStore.getState().updateWorkflow('wf-1', { name: 'Renamed', status: 'inactive' });
    const wf = useWorkflowStore.getState().workflows[0];
    expect(wf?.name).toBe('Renamed');
    expect(wf?.status).toBe('inactive');
  });

  it('does not update non-matching workflows', () => {
    const wf2: Workflow = { ...mockWorkflow, id: 'wf-2', name: 'Other' };
    useWorkflowStore.getState().setWorkflows([mockWorkflow, wf2]);
    useWorkflowStore.getState().updateWorkflow('wf-1', { name: 'Only First' });
    expect(useWorkflowStore.getState().workflows[1]?.name).toBe('Other');
  });

  it('removes a workflow', () => {
    useWorkflowStore.getState().setWorkflows([mockWorkflow]);
    useWorkflowStore.getState().removeWorkflow('wf-1');
    expect(useWorkflowStore.getState().workflows).toHaveLength(0);
  });

  it('removes only the targeted workflow', () => {
    const wf2: Workflow = { ...mockWorkflow, id: 'wf-2', name: 'Keep Me' };
    useWorkflowStore.getState().setWorkflows([mockWorkflow, wf2]);
    useWorkflowStore.getState().removeWorkflow('wf-1');
    expect(useWorkflowStore.getState().workflows).toHaveLength(1);
    expect(useWorkflowStore.getState().workflows[0]?.id).toBe('wf-2');
  });

  it('replaces workflows on setWorkflows', () => {
    useWorkflowStore.getState().setWorkflows([mockWorkflow]);
    const newWf: Workflow = { ...mockWorkflow, id: 'wf-new', name: 'Brand new' };
    useWorkflowStore.getState().setWorkflows([newWf]);
    expect(useWorkflowStore.getState().workflows).toHaveLength(1);
    expect(useWorkflowStore.getState().workflows[0]?.id).toBe('wf-new');
  });
});
