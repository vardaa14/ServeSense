from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import NotificationCreate, MarkAllRead
from app.deps import get_current_user
from app.services import notification_service

router = APIRouter(tags=["notifications"])


def _guard_user(requested_id: str, user):
    if user is None or user.role == "admin":
        return
    if user.id != requested_id:
        raise HTTPException(403, "You can only access your own notifications")


@router.get("/notifications/{user_id}")
def list_notifications(user_id: str, unread_only: bool = False, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _guard_user(user_id, user)
    rows = notification_service.list_notifications(db, user_id, unread_only=unread_only)
    return {
        "items": [notification_service.serialize_notification(r) for r in rows],
        "unread_count": notification_service.unread_count(db, user_id),
    }


@router.post("/notifications")
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user and user.role == "volunteer" and user.id != payload.user_id:
        raise HTTPException(403, "Volunteers cannot notify other users")
    row = notification_service.create_notification(
        db, payload.user_id, payload.template_key, payload.payload, payload.channel
    )
    return notification_service.serialize_notification(row)


@router.patch("/notifications/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = notification_service.mark_read(db, notification_id, user.id if user else None)
    if not row:
        raise HTTPException(404, "Notification not found")
    return notification_service.serialize_notification(row)


@router.post("/notifications/mark-all-read")
def mark_all(payload: MarkAllRead, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _guard_user(payload.user_id, user)
    updated = notification_service.mark_all_read(db, payload.user_id)
    return {"updated": updated}
