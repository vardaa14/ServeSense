from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app.schemas import VolunteerProfileUpdate, AvailabilityUpdate, AssignmentRespond
from app.deps import get_current_user, assert_volunteer_self
from app.services import dashboard_service, matching_service, notification_service
from app.matching import haversine_km

router = APIRouter(tags=["volunteers"])


def _load_volunteer(db: Session, volunteer_id: str):
    volunteer = (
        db.query(models.Volunteer)
        .options(
            joinedload(models.Volunteer.user),
            joinedload(models.Volunteer.skills).joinedload(models.VolunteerSkill.skill),
            joinedload(models.Volunteer.certifications),
            joinedload(models.Volunteer.availability_slots),
            joinedload(models.Volunteer.assignments).joinedload(models.Assignment.task),
        )
        .filter(models.Volunteer.id == volunteer_id)
        .first()
    )
    if not volunteer:
        raise HTTPException(404, "Volunteer not found")
    return volunteer


@router.get("/volunteers/{volunteer_id}/dashboard")
def volunteer_dashboard(volunteer_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    return dashboard_service.volunteer_dashboard(db, _load_volunteer(db, volunteer_id))


@router.get("/volunteers/{volunteer_id}/recommendations")
def volunteer_recommendations(volunteer_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    return matching_service.volunteer_task_recommendations(db, _load_volunteer(db, volunteer_id))


@router.get("/volunteers/{volunteer_id}/nearby")
def volunteer_nearby(volunteer_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    volunteer = _load_volunteer(db, volunteer_id)
    rows = []
    for task in db.query(models.Task).filter(models.Task.status == "open").all():
        d = haversine_km(volunteer.home_lat, volunteer.home_lng, task.lat, task.lng)
        if d is None:
            continue
        rows.append({
            "task_id": task.id,
            "title": task.title,
            "organization": task.organization.name if task.organization else None,
            "distance_km": round(d, 1),
            "urgency_level": task.urgency_level,
            "start_time": task.start_time,
            "location": task.community.name if task.community else None,
        })
    rows.sort(key=lambda x: x["distance_km"])
    return rows


@router.get("/volunteers/{volunteer_id}/assignments")
def volunteer_assignments(volunteer_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    volunteer = _load_volunteer(db, volunteer_id)
    return [dashboard_service.serialize_assignment(a) for a in volunteer.assignments]


@router.get("/volunteers/{volunteer_id}/impact")
def volunteer_impact(volunteer_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    return dashboard_service.volunteer_impact(db, _load_volunteer(db, volunteer_id))


@router.get("/volunteers/{volunteer_id}/availability")
def volunteer_availability(volunteer_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    volunteer = _load_volunteer(db, volunteer_id)
    return [dashboard_service.serialize_availability(s) for s in volunteer.availability_slots]


@router.patch("/volunteers/{volunteer_id}")
def update_volunteer(volunteer_id: str, payload: VolunteerProfileUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    volunteer = _load_volunteer(db, volunteer_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(volunteer, key, value)
    db.commit()
    db.refresh(volunteer)
    return dashboard_service.volunteer_profile(volunteer)




@router.patch("/availability/{slot_id}")
def update_availability(slot_id: str, payload: AvailabilityUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    slot = db.get(models.AvailabilitySlot, slot_id)
    if not slot:
        raise HTTPException(404, "Availability not found")
    assert_volunteer_self(slot.volunteer_id, user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(slot, key, value)
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/availability/{slot_id}")
def delete_availability(slot_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    slot = db.get(models.AvailabilitySlot, slot_id)
    if not slot:
        raise HTTPException(404, "Availability not found")
    assert_volunteer_self(slot.volunteer_id, user, db)
    db.delete(slot)
    db.commit()
    return {"ok": True}


@router.post("/assignments/{assignment_id}/accept")
def accept_assignment(assignment_id: str, payload: AssignmentRespond | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assert_volunteer_self(assignment.volunteer_id, user, db)
    assignment.status = "accepted"
    assignment.responded_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    org_users = [m.user_id for m in assignment.task.organization.members] if assignment.task and assignment.task.organization else []
    notification_service.notify_users(
        db, org_users, "volunteer_accepted_assignment",
        {
            "title": "Volunteer accepted assignment",
            "body": f"{assignment.volunteer.user.full_name} accepted {assignment.task.title}.",
            "assignment_id": assignment.id,
            "task_id": assignment.task_id,
        },
    )
    notification_service.create_notification(
        db, assignment.volunteer.user_id, "assignment_accepted",
        {"title": "Assignment accepted", "body": f"You accepted {assignment.task.title}.", "assignment_id": assignment.id},
    )
    return assignment


@router.post("/assignments/{assignment_id}/decline")
def decline_assignment(assignment_id: str, payload: AssignmentRespond | None = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assert_volunteer_self(assignment.volunteer_id, user, db)
    if assignment.status not in ("offered", "accepted"):
        raise HTTPException(400, "Assignment cannot be declined")
    previous = assignment.status
    assignment.status = "declined"
    assignment.responded_at = datetime.utcnow()
    task = assignment.task
    if previous in ("offered", "accepted") and task and task.filled_headcount > 0:
        task.filled_headcount -= 1
        if task.status == "filled":
            task.status = "open"
    db.commit()
    db.refresh(assignment)
    org_users = [m.user_id for m in task.organization.members] if task and task.organization else []
    notification_service.notify_users(
        db, org_users, "volunteer_declined_assignment",
        {
            "title": "Volunteer declined assignment",
            "body": f"A volunteer declined {task.title if task else 'a task'}.",
            "assignment_id": assignment.id,
            "task_id": assignment.task_id,
        },
    )
    return assignment


@router.post("/volunteers/{volunteer_id}/tasks/{task_id}/volunteer")
def volunteer_for_task(volunteer_id: str, task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(volunteer_id, user, db)
    volunteer = _load_volunteer(db, volunteer_id)
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status not in ("open",):
        raise HTTPException(400, "Task is not open for volunteers")
    existing = db.query(models.Assignment).filter(
        models.Assignment.task_id == task_id,
        models.Assignment.volunteer_id == volunteer_id,
        models.Assignment.status.in_(["offered", "accepted"]),
    ).first()
    if existing:
        raise HTTPException(400, "You are already assigned to this task")
    if task.filled_headcount >= task.required_headcount:
        raise HTTPException(400, "Task is already fully staffed")
    obj = models.Assignment(
        task_id=task_id,
        volunteer_id=volunteer_id,
        status="accepted",
        responded_at=datetime.utcnow(),
    )
    db.add(obj)
    task.filled_headcount += 1
    if task.filled_headcount >= task.required_headcount:
        task.status = "filled"
    db.commit()
    db.refresh(obj)
    org_users = [m.user_id for m in task.organization.members] if task.organization else []
    notification_service.notify_users(
        db, org_users, "new_volunteer_application",
        {
            "title": "New volunteer application",
            "body": f"{volunteer.user.full_name} volunteered for {task.title}.",
            "task_id": task.id,
            "assignment_id": obj.id,
        },
    )
    notification_service.create_notification(
        db, volunteer.user_id, "assignment_accepted",
        {"title": "You volunteered", "body": f"You joined {task.title}.", "task_id": task.id, "assignment_id": obj.id},
    )
    return obj
