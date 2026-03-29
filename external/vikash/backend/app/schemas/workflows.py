"""Workflow Pydantic schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


class WorkflowStep(BaseModel):
    type: str  # search_knowledge | ai_summarize | ai_qa | slack_webhook | http_webhook
    label: str
    config: Dict[str, Any] = {}


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str = "manual"
    trigger_config: Dict[str, Any] = {}
    steps: List[WorkflowStep] = []
    status: str = "draft"


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    steps: Optional[List[WorkflowStep]] = None
    status: Optional[str] = None


class WorkflowRunOut(BaseModel):
    id: UUID
    workflow_id: UUID
    status: str
    trigger_data: Dict[str, Any] = {}
    step_results: List[Any] = []
    error: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class WorkflowOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Dict[str, Any] = {}
    steps: List[Any] = []
    status: str
    run_count: int = 0
    last_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    recent_runs: List[WorkflowRunOut] = []

    model_config = {"from_attributes": True}
