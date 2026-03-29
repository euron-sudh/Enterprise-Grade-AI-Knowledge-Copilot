"""
WebSocket server for real-time features:
  /ws/notifications     — per-user notification push stream
  /ws/chat/{conv_id}    — typing indicators and presence
  /ws/health            — quick ping/pong health check
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


# ── Connection managers ───────────────────────────────────────────────────────

class NotificationManager:
    """Manages per-user WebSocket connections for notification push."""

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self._connections.get(user_id, set())
        conns.discard(ws)
        if not conns:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, event: dict):
        conns = list(self._connections.get(user_id, set()))
        dead = []
        for ws in conns:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.get(user_id, set()).discard(ws)

    async def broadcast(self, event: dict):
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, event)

    @property
    def connected_user_count(self) -> int:
        return len(self._connections)


class ChatPresenceManager:
    """Tracks who is typing/online in each conversation."""

    def __init__(self):
        self._rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def join(self, conversation_id: str, user_id: str, ws: WebSocket):
        await ws.accept()
        self._rooms.setdefault(conversation_id, {})[user_id] = ws
        await self._broadcast_presence(conversation_id, exclude=user_id)

    def leave(self, conversation_id: str, user_id: str):
        room = self._rooms.get(conversation_id, {})
        room.pop(user_id, None)
        if not room:
            self._rooms.pop(conversation_id, None)

    async def _broadcast_presence(self, conversation_id: str, exclude: str = ""):
        room = self._rooms.get(conversation_id, {})
        event = {
            "type": "presence",
            "conversation_id": conversation_id,
            "online_users": [uid for uid in room if uid != exclude],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        dead = []
        for uid, ws in list(room.items()):
            if uid == exclude:
                continue
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(uid)
        for uid in dead:
            room.pop(uid, None)

    async def broadcast_typing(self, conversation_id: str, user_id: str, is_typing: bool):
        room = self._rooms.get(conversation_id, {})
        event = {
            "type": "typing",
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        dead = []
        for uid, ws in list(room.items()):
            if uid == user_id:
                continue
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(uid)
        for uid in dead:
            room.pop(uid, None)


notification_manager = NotificationManager()
chat_presence_manager = ChatPresenceManager()


# ── Token validation ──────────────────────────────────────────────────────────

def _decode_token(token: str) -> str | None:
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ── WebSocket endpoints ───────────────────────────────────────────────────────

@router.websocket("/ws/notifications")
async def notifications_ws(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Real-time notification stream.
    Client sends: {"type": "ping"}
    Server sends: {"type": "pong"} | {"type": "notification", ...} | {"type": "connected"}
    """
    user_id = _decode_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await notification_manager.connect(user_id, websocket)
    try:
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                msg = json.loads(raw)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.debug("Notification WS closed user=%s: %s", user_id, e)
    finally:
        notification_manager.disconnect(user_id, websocket)


@router.websocket("/ws/chat/{conversation_id}")
async def chat_presence_ws(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(...),
):
    """
    Chat presence and typing indicators.
    Client sends: {"type": "typing", "is_typing": true|false} | {"type": "ping"}
    Server sends: {"type": "presence", "online_users": [...]} | {"type": "typing", ...}
    """
    user_id = _decode_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await chat_presence_manager.join(conversation_id, user_id, websocket)
    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                msg = json.loads(raw)
                if msg.get("type") == "typing":
                    await chat_presence_manager.broadcast_typing(
                        conversation_id, user_id, bool(msg.get("is_typing", False))
                    )
                elif msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.debug("Chat WS closed user=%s conv=%s: %s", user_id, conversation_id, e)
    finally:
        chat_presence_manager.leave(conversation_id, user_id)


@router.websocket("/ws/health")
async def ws_health(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({
        "status": "ok",
        "connected_users": notification_manager.connected_user_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    await websocket.close()


# ── Helper — push notifications from any module ───────────────────────────────

async def push_notification(
    user_id: str,
    title: str,
    body: str,
    notification_type: str = "info",
    data: dict = None,
):
    """Push a real-time notification to a user. Safe to call from any router."""
    await notification_manager.send_to_user(user_id, {
        "type": "notification",
        "id": str(uuid.uuid4()),
        "notification_type": notification_type,
        "title": title,
        "body": body,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data or {},
    })
