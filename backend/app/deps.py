from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app import models


def get_current_user(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Demo identity. Production auth is intentionally not claimed here."""
    if not x_user_id:
        return None
    user = db.get(models.User, x_user_id)
    if not user:
        raise HTTPException(401, "Unknown demo user")
    return user


def assert_volunteer_self(volunteer_id: str, user: Optional[models.User], db: Session):
    if user is None or user.role == "admin":
        return
    volunteer = db.get(models.Volunteer, volunteer_id)
    if not volunteer:
        raise HTTPException(404, "Volunteer not found")
    if user.role == "volunteer" and volunteer.user_id != user.id:
        raise HTTPException(403, "You can only access your own volunteer record")


def assert_coordinator(user: Optional[models.User], organization_id: Optional[str] = None):
    if user is None:
        return
    if user.role in ("admin", "coordinator"):
        if organization_id and user.role == "coordinator":
            member_orgs = {m.organization_id for m in user.organization_memberships}
            if member_orgs and organization_id not in member_orgs:
                raise HTTPException(403, "Not a member of this organization")
        return
    raise HTTPException(403, "Coordinator access required")
