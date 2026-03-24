import apiClient from './client';

import type { AIPerformanceMetrics, AnalyticsDashboard, KnowledgeMetrics, UsageMetrics } from '@/types';

export async function getUsageAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  granularity?: 'day' | 'week' | 'month';
}): Promise<UsageMetrics> {
  const { data } = await apiClient.get<UsageMetrics>('/analytics/usage', { params });
  return data;
}

export async function getAIPerformance(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AIPerformanceMetrics> {
  const { data } = await apiClient.get<AIPerformanceMetrics>('/analytics/ai-performance', {
    params,
  });
  return data;
}

export async function getKnowledgeIntelligence(): Promise<KnowledgeMetrics> {
  const { data } = await apiClient.get<KnowledgeMetrics>('/analytics/knowledge');
  return data;
}

export async function getDashboard(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsDashboard> {
  const { data } = await apiClient.get<AnalyticsDashboard>('/analytics/dashboard', { params });
  return data;
}
