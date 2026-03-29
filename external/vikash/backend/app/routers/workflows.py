"""Workflows router — CRUD + execution engine."""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.workflow import RunStatus, Workflow, WorkflowRun, WorkflowStatus
from app.schemas.workflows import WorkflowCreate, WorkflowOut, WorkflowRunOut, WorkflowUpdate

router = APIRouter()


# ── helpers ───────────────────────────────────────────────────────────────────

async def _get_workflow(wf_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Workflow:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.id == wf_id, Workflow.user_id == user_id)
        .options(selectinload(Workflow.runs))
    )
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


def _to_out(wf: Workflow) -> WorkflowOut:
    recent = sorted(wf.runs, key=lambda r: r.started_at, reverse=True)[:5]
    return WorkflowOut(
        id=wf.id,
        name=wf.name,
        description=wf.description,
        trigger_type=wf.trigger_type.value if hasattr(wf.trigger_type, "value") else wf.trigger_type,
        trigger_config=wf.trigger_config or {},
        steps=wf.steps or [],
        status=wf.status.value if hasattr(wf.status, "value") else wf.status,
        run_count=wf.run_count,
        last_run_at=wf.last_run_at,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
        recent_runs=[WorkflowRunOut.model_validate(r, from_attributes=True) for r in recent],
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[WorkflowOut])
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workflow)
        .where(Workflow.user_id == current_user.id)
        .options(selectinload(Workflow.runs))
        .order_by(Workflow.created_at.desc())
    )
    return [_to_out(wf) for wf in result.scalars().all()]


@router.post("", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = Workflow(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        trigger_type=body.trigger_type,
        trigger_config=body.trigger_config,
        steps=[s.model_dump() for s in body.steps],
        status=body.status,
    )
    db.add(wf)
    await db.flush()
    # Re-fetch with selectinload so _to_out can access wf.runs without lazy-loading
    result = await db.execute(
        select(Workflow)
        .where(Workflow.id == wf.id)
        .options(selectinload(Workflow.runs))
    )
    wf = result.scalar_one()
    return _to_out(wf)


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return _to_out(await _get_workflow(workflow_id, current_user.id, db))


@router.patch("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow(workflow_id, current_user.id, db)
    if body.name is not None:
        wf.name = body.name
    if body.description is not None:
        wf.description = body.description
    if body.trigger_type is not None:
        wf.trigger_type = body.trigger_type
    if body.trigger_config is not None:
        wf.trigger_config = body.trigger_config
    if body.steps is not None:
        wf.steps = [s.model_dump() for s in body.steps]
    if body.status is not None:
        wf.status = body.status
    await db.flush()
    return _to_out(wf)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow(workflow_id, current_user.id, db)
    await db.delete(wf)
    await db.flush()


# ── Pause / Resume ────────────────────────────────────────────────────────────

@router.post("/{workflow_id}/pause", response_model=WorkflowOut)
async def pause_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow(workflow_id, current_user.id, db)
    wf.status = WorkflowStatus.paused
    await db.flush()
    return _to_out(wf)


@router.post("/{workflow_id}/resume", response_model=WorkflowOut)
async def resume_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow(workflow_id, current_user.id, db)
    wf.status = WorkflowStatus.active
    await db.flush()
    return _to_out(wf)


# ── Run ───────────────────────────────────────────────────────────────────────

@router.post("/{workflow_id}/run", response_model=WorkflowRunOut)
async def run_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a workflow run."""
    from app.services.workflow_service import execute_workflow

    wf = await _get_workflow(workflow_id, current_user.id, db)
    if wf.status == WorkflowStatus.paused:
        raise HTTPException(status_code=400, detail="Workflow is paused")

    run = WorkflowRun(
        workflow_id=wf.id,
        user_id=current_user.id,
        status=RunStatus.running,
        trigger_data={"trigger": "manual", "triggered_by": str(current_user.id)},
        step_results=[],
    )
    db.add(run)
    await db.flush()

    try:
        step_results = await execute_workflow(
            workflow_id=str(wf.id),
            user_id=str(current_user.id),
            steps=wf.steps or [],
            trigger_data=run.trigger_data,
            db=db,
        )
        run.status = RunStatus.success
        run.step_results = step_results
    except Exception as exc:
        run.status = RunStatus.failed
        run.error = str(exc)
        run.step_results = run.step_results or []

    run.completed_at = datetime.now(timezone.utc)
    wf.run_count = (wf.run_count or 0) + 1
    wf.last_run_at = run.completed_at
    await db.flush()

    return WorkflowRunOut.model_validate(run, from_attributes=True)


@router.get("/{workflow_id}/runs", response_model=List[WorkflowRunOut])
async def list_runs(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow(workflow_id, current_user.id, db)
    return [WorkflowRunOut.model_validate(r, from_attributes=True) for r in wf.runs[:20]]
