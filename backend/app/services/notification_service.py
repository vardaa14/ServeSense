from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app import models

SUPPORTED_CHANNELS = ("in_app", "email", "sms", "push")


def serialize_notification(row: models.Notification):
    return {
        "id": row.id,
        "user_id": row.user_id,
        "channel": row.channel,
        "template_key": row.template_key,
        "payload": row.payload_json or {},
        "delivery_status": row.delivery_status,
        "read_at": row.read_at,
        "created_at": row.created_at,
    }


class NotificationChannel:
    channel = "in_app"

    def deliver(self, notification: models.Notification):
        notification.delivery_status = "sent"


class InAppChannel(NotificationChannel):
    channel = "in_app"


class EmailChannel(NotificationChannel):
    channel = "email"

    def deliver(self, notification: models.Notification):
        # Architected for later SMTP/provider integration.
        notification.delivery_status = "queued"


class SmsChannel(NotificationChannel):
    channel = "sms"

    def deliver(self, notification: models.Notification):
        notification.delivery_status = "queued"


class PushChannel(NotificationChannel):
    channel = "push"

    def deliver(self, notification: models.Notification):
        notification.delivery_status = "queued"


CHANNELS = {
    "in_app": InAppChannel(),
    "email": EmailChannel(),
    "sms": SmsChannel(),
    "push": PushChannel(),
}


def create_notification(
    db: Session,
    user_id: str,
    template_key: str,
    payload: Optional[Dict[str, Any]] = None,
    channel: str = "in_app",
):
    if channel not in SUPPORTED_CHANNELS:
        channel = "in_app"
    row = models.Notification(
        user_id=user_id,
        channel=channel,
        template_key=template_key,
        payload_json=payload or {},
        delivery_status="queued",
    )
    CHANNELS[channel].deliver(row)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def notify_users(db: Session, user_ids, template_key: str, payload: Optional[Dict[str, Any]] = None):
    rows = []
    for user_id in {uid for uid in user_ids if uid}:
        rows.append(create_notification(db, user_id, template_key, payload))
    return rows


def list_notifications(db: Session, user_id: str, unread_only: bool = False):
    q = db.query(models.Notification).filter(models.Notification.user_id == user_id)
    if unread_only:
        q = q.filter(models.Notification.read_at.is_(None))
    return q.order_by(models.Notification.created_at.desc()).all()


def unread_count(db: Session, user_id: str):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.read_at.is_(None),
    ).count()


def mark_read(db: Session, notification_id: str, user_id: Optional[str] = None):
    row = db.get(models.Notification, notification_id)
    if not row:
        return None
    if user_id and row.user_id != user_id:
        return None
    row.read_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def mark_all_read(db: Session, user_id: str):
    rows = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.read_at.is_(None),
    ).all()
    now = datetime.utcnow()
    for row in rows:
        row.read_at = now
    db.commit()
    return len(rows)
