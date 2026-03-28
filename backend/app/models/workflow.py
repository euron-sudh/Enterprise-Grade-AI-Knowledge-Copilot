"""Workflow Automation models."""
import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow():
    return datetime.utcnow()


class WorkflowStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    draft = "draft"


class WorkflowTrigger(str, enum.Enum):
    manual = "manual"
    document_upload = "document_upload"
    schedule = "schedule"
    event = "event"
    webhook = "webhook"


class RunStatus(str, enum.Enum):
    running = "running"
    success = "success"
    failed = "failed"


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    trigger_type: Mapped[WorkflowTrigger] = mapped_column(
        Enum(WorkflowTrigger, name="workflowtrigger"), nullable=False, default=WorkflowTrigger.manual
    )
    trigger_config: Mapped[Any] = mapped_column(JSONB, default=dict, nullable=False)
    # steps: list of {"type": str, "config": dict, "label": str}
    steps: Mapped[Any] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[WorkflowStatus] = mapped_column(
        Enum(WorkflowStatus, name="workflowstatus"), nullable=False, default=WorkflowStatus.draft
    )
    run_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowRun.started_at.desc()"
    )


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus, name="runstatus"), nullable=False, default=RunStatus.running
    )
    trigger_data: Mapped[Any] = mapped_column(JSONB, default=dict, nullable=False)
    step_results: Mapped[Any] = mapped_column(JSONB, default=list, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="runs")
