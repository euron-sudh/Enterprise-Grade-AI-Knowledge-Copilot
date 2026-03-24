import { create } from 'zustand';
import type { Workflow } from '@/types/workflows';

interface WorkflowStore {
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  addWorkflow: (workflow) => set((s) => ({ workflows: [workflow, ...s.workflows] })),
  updateWorkflow: (id, updates) =>
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),
  removeWorkflow: (id) => set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),
}));
