export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface UsageMetrics {
  totalQueries: number;
  queriesChange: number;
  activeUsers: number;
  activeUsersChange: number;
  documentsIndexed: number;
  documentsChange: number;
  avgResponseTimeMs: number;
  responseTimeChange: number;
  queryVolume: TimeSeriesDataPoint[];
  userActivity: TimeSeriesDataPoint[];
  topModels: ModelUsage[];
  topUsers: UserUsage[];
  peakHours: HourlyUsage[];
}

export interface ModelUsage {
  model: string;
  queryCount: number;
  tokenCount: number;
  costUsd: number;
  percentage: number;
}

export interface UserUsage {
  userId: string;
  userName: string;
  avatarUrl?: string;
  queryCount: number;
  lastActive: string;
}

export interface HourlyUsage {
  hour: number;
  count: number;
}

export interface AIPerformanceMetrics {
  avgLatencyMs: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  successRate: number;
  errorRate: number;
  feedbackPositiveRate: number;
  feedbackNegativeRate: number;
  avgSourcesPerAnswer: number;
  latencyTrend: TimeSeriesDataPoint[];
  errorBreakdown: ErrorBreakdown[];
  feedbackTrend: TimeSeriesDataPoint[];
}

export interface ErrorBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface KnowledgeMetrics {
  totalDocuments: number;
  indexedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  storageUsedGb: number;
  storageQuotaGb: number;
  mostAccessedDocuments: DocumentAccess[];
  knowledgeCoverage: TopicCoverage[];
  connectorHealth: ConnectorHealthSummary[];
  indexingTrend: TimeSeriesDataPoint[];
}

export interface DocumentAccess {
  documentId: string;
  documentName: string;
  accessCount: number;
  lastAccessed: string;
}

export interface TopicCoverage {
  topic: string;
  documentCount: number;
  percentage: number;
}

export interface ConnectorHealthSummary {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  status: 'healthy' | 'warning' | 'error';
  syncSuccessRate: number;
  lastSyncAt: string;
}

export interface AnalyticsDashboard {
  usage: UsageMetrics;
  aiPerformance: AIPerformanceMetrics;
  knowledge: KnowledgeMetrics;
  generatedAt: string;
}
