from typing import List, Optional
from pydantic import BaseModel


class TimeSeriesDataPoint(BaseModel):
    date: str
    value: float


# Keep old TimeSeriesPoint for backward compat with usage endpoint
class TimeSeriesPoint(BaseModel):
    date: str
    queries: int
    users: int


class ModelUsage(BaseModel):
    model: str
    queryCount: int
    tokenCount: int = 0
    costUsd: float = 0.0
    percentage: float = 0.0


class HourlyUsage(BaseModel):
    hour: int
    count: int


class UserUsage(BaseModel):
    userId: str
    userName: str
    avatarUrl: Optional[str] = None
    queryCount: int
    lastActive: str


class UsageMetrics(BaseModel):
    totalQueries: int
    queriesChange: float = 0.0
    activeUsers: int
    activeUsersChange: float = 0.0
    documentsIndexed: int = 0
    documentsChange: float = 0.0
    avgResponseTimeMs: int
    responseTimeChange: float = 0.0
    timeSeries: List[TimeSeriesPoint] = []
    queryVolume: List[TimeSeriesDataPoint] = []
    userActivity: List[TimeSeriesDataPoint] = []
    topModels: List[ModelUsage] = []
    topUsers: List[UserUsage] = []
    peakHours: List[HourlyUsage] = []


class ErrorBreakdown(BaseModel):
    type: str
    count: int
    percentage: float


class AIPerformanceMetrics(BaseModel):
    avgQualityScore: float = 0.87
    citationAccuracy: float = 0.92
    hallucenationRate: float = 0.03
    tokenCostUsd: float = 0.0
    successRate: float = 0.87
    feedbackPositiveRate: float = 0.0
    feedbackNegativeRate: float = 0.0
    avgSourcesPerAnswer: float = 0.0
    avgLatencyMs: int = 1200
    latencyP95Ms: int = 1800
    latencyP99Ms: int = 2400
    errorRate: float = 0.03
    modelBreakdown: List[dict] = []
    latencyTrend: List[TimeSeriesDataPoint] = []
    feedbackTrend: List[TimeSeriesDataPoint] = []
    errorBreakdown: List[ErrorBreakdown] = []


class DocumentAccess(BaseModel):
    documentId: str
    documentName: str
    accessCount: int
    lastAccessed: str


class TopicCoverage(BaseModel):
    topic: str
    documentCount: int
    percentage: float


class ConnectorHealthSummary(BaseModel):
    connectorId: str
    connectorName: str
    connectorType: str
    status: str = "healthy"
    syncSuccessRate: float = 1.0
    lastSyncAt: str


class KnowledgeMetrics(BaseModel):
    totalDocuments: int = 0
    indexedDocuments: int = 0
    pendingDocuments: int = 0
    failedDocuments: int = 0
    storageUsedGb: float = 0.0
    storageQuotaGb: float = 100.0
    staleDocuments: int = 0
    coverageScore: float = 0.0
    mostAccessedDocuments: List[DocumentAccess] = []
    knowledgeCoverage: List[TopicCoverage] = []
    connectorHealth: List[ConnectorHealthSummary] = []
    indexingTrend: List[TimeSeriesDataPoint] = []
    gapTopics: List[dict] = []
    topDocuments: List[dict] = []


class AnalyticsDashboard(BaseModel):
    usage: UsageMetrics
    aiPerformance: AIPerformanceMetrics
    knowledge: KnowledgeMetrics
    generatedAt: str = ""


# Legacy aliases kept for existing imports
class GapTopic(BaseModel):
    topic: str
    count: int


class TopDocument(BaseModel):
    id: str
    name: str
    views: int


class ModelBreakdown(BaseModel):
    model: str
    queries: int
    avgLatencyMs: int


class TopModel(BaseModel):
    model: str
    queryCount: int


class PeakHour(BaseModel):
    hour: int
    count: int
