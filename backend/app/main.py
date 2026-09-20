from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime

from app.database import get_db, ensure_schema
from app import models
from app.schemas import *
from app.seed import seed_demo
from app.services.dashboard_service import serialize_task
from app.services.matching_service import generate_task_recommendations, serialize_coordinator_match
from app.services import notification_service
from app.deps import get_current_user, assert_volunteer_self, assert_coordinator
from app.routers import volunteers, organizations, donations, intelligence, notifications

ensure_schema()

app = FastAPI(
    title="ServeSense API",
    version="1.1.0",
    description="Volunteer-to-need matching platform with donations, local intelligence and notifications",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(volunteers.router)
app.include_router(organizations.router)
app.include_router(donations.router)
app.include_router(intelligence.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {"name": "ServeSense", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/demo/identities")
def demo_identities(db: Session = Depends(get_db)):
    rows = []
    for user in db.query(models.User).order_by(models.User.role, models.User.full_name).all():
        volunteer = db.query(models.Volunteer).filter(models.Volunteer.user_id == user.id).first()
        membership = (
            db.query(models.OrganizationMember)
            .filter(models.OrganizationMember.user_id == user.id)
            .first()
        )
        rows.append({
            "user_id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "volunteer_id": volunteer.id if volunteer else None,
            "organization_id": membership.organization_id if membership else None,
            "organization_name": membership.organization.name if membership and membership.organization else None,
        })
    return rows


@app.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        return existing
    user = models.User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/users")
def users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.post("/organizations")
def create_org(payload: OrganizationCreate, db: Session = Depends(get_db)):
    obj = models.Organization(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.get("/organizations")
def organizations_list(db: Session = Depends(get_db)):
    return db.query(models.Organization).all()


@app.post("/communities")
def create_community(payload: CommunityCreate, db: Session = Depends(get_db)):
    obj = models.Community(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.get("/communities")
def communities(db: Session = Depends(get_db)):
    return db.query(models.Community).all()


@app.post("/skills")
def create_skill(payload: SkillCreate, db: Session = Depends(get_db)):
    obj = models.Skill(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.get("/skills")
def skills(db: Session = Depends(get_db)):
    return db.query(models.Skill).all()


@app.post("/volunteers")
def create_volunteer(payload: VolunteerCreate, db: Session = Depends(get_db)):
    if not db.query(models.User).filter(models.User.id == payload.user_id).first():
        raise HTTPException(404, "User not found")
    obj = models.Volunteer(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.get("/volunteers")
def volunteers_list(db: Session = Depends(get_db)):
    return db.query(models.Volunteer).all()


@app.post("/volunteer-skills")
def add_volunteer_skill(payload: VolunteerSkillCreate, db: Session = Depends(get_db)):
    obj = models.VolunteerSkill(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.post("/availability")
def add_availability(payload: AvailabilityCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    assert_volunteer_self(payload.volunteer_id, user, db)
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "Availability end must be after start")
    obj = models.AvailabilitySlot(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.post("/tasks")
def create_task(payload: TaskCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not db.query(models.Organization).filter(models.Organization.id == payload.organization_id).first():
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, payload.organization_id)
    data = payload.model_dump()
    requirements = data.pop("requirements", [])
    obj = models.Task(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    for req in requirements:
        db.add(models.TaskRequirement(task_id=obj.id, **req))
    db.commit()
    db.refresh(obj)
    return serialize_task(obj)


@app.get("/tasks")
def tasks(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Task)
        .options(
            joinedload(models.Task.organization),
            joinedload(models.Task.community),
            joinedload(models.Task.requirements).joinedload(models.TaskRequirement.skill),
        )
        .order_by(models.Task.created_at.desc())
        .all()
    )
    return [serialize_task(t) for t in rows]


@app.get("/tasks/{task_id}")
def task(task_id: str, db: Session = Depends(get_db)):
    obj = db.get(models.Task, task_id)
    if not obj:
        raise HTTPException(404, "Task not found")
    return serialize_task(obj)


@app.post("/task-requirements")
def add_requirement(payload: TaskRequirementCreate, db: Session = Depends(get_db)):
    obj = models.TaskRequirement(**payload.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.post("/tasks/{task_id}/recommendations")
def generate_recommendations(task_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    results = generate_task_recommendations(db, task)
    matches = [serialize_coordinator_match(x) for x in results[:20]]
    for item in matches[:5]:
        volunteer = db.get(models.Volunteer, item["volunteer_id"])
        if volunteer and item["score"] >= 0.7:
            existing = db.query(models.Notification).filter(
                models.Notification.user_id == volunteer.user_id,
                models.Notification.template_key == "task_recommendation",
            ).all()
            if not any((n.payload_json or {}).get("task_id") == task.id for n in existing):
                notification_service.create_notification(
                    db, volunteer.user_id, "task_recommendation",
                    {
                        "title": f"You have a new {round(item['score']*100)}% matched opportunity",
                        "body": f"{task.title} is a strong match based on your profile.",
                        "task_id": task.id,
                        "match_percentage": round(item["score"] * 100),
                    },
                )
    return matches


@app.get("/tasks/{task_id}/recommendations")
def get_recommendations(task_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.AssignmentRecommendation)
        .options(joinedload(models.AssignmentRecommendation.volunteer).joinedload(models.Volunteer.user))
        .filter(models.AssignmentRecommendation.task_id == task_id)
        .order_by(models.AssignmentRecommendation.rank_position)
        .all()
    )
    return [
        {
            "rank": r.rank_position,
            "recommendation_id": r.id,
            "volunteer_id": r.volunteer_id,
            "name": r.volunteer.user.full_name if r.volunteer and r.volunteer.user else None,
            "score": float(r.total_score or 0),
            "skill_score": float(r.skill_score or 0),
            "availability_score": float(r.availability_score or 0),
            "distance_score": float(r.distance_score or 0),
            "reliability_score": float(r.reliability_score or 0),
            "no_show_risk": float(r.no_show_risk or 0),
            "reasons": (r.explainability_json or {}).get("reasons", []),
        }
        for r in rows
    ]


@app.post("/assignments")
def create_assignment(payload: AssignmentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    task = db.get(models.Task, payload.task_id)
    volunteer = db.get(models.Volunteer, payload.volunteer_id)
    if not task or not volunteer:
        raise HTTPException(404, "Task or volunteer not found")
    if task.organization_id:
        assert_coordinator(user, task.organization_id)

    existing = db.query(models.Assignment).filter(
        models.Assignment.task_id == payload.task_id,
        models.Assignment.volunteer_id == payload.volunteer_id,
        models.Assignment.status.in_(["offered", "accepted"]),
    ).first()
    if existing:
        raise HTTPException(400, "Volunteer is already assigned to this task")

    if task.filled_headcount >= task.required_headcount:
        raise HTTPException(400, "Task is already fully staffed")

    obj = models.Assignment(**payload.model_dump())
    db.add(obj)
    task.filled_headcount += 1
    if task.filled_headcount >= task.required_headcount:
        task.status = "filled"
    db.commit(); db.refresh(obj)

    notification_service.create_notification(
        db, volunteer.user_id, "assignment_offered",
        {
            "title": "Assignment offered",
            "body": f"You have been offered {task.title}.",
            "task_id": task.id,
            "assignment_id": obj.id,
        },
    )
    org_users = [m.user_id for m in task.organization.members] if task.organization else []
    notification_service.notify_users(
        db, org_users, "new_volunteer_application",
        {
            "title": "Volunteer assigned",
            "body": f"{volunteer.user.full_name} was assigned to {task.title}.",
            "task_id": task.id,
            "assignment_id": obj.id,
        },
    )
    return obj


@app.post("/attendance")
def attendance(payload: AttendanceCreate, db: Session = Depends(get_db)):
    assignment = db.get(models.Assignment, payload.assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    obj = models.AttendanceRecord(**payload.model_dump())
    obj.check_in_time = datetime.utcnow()
    db.add(obj)
    assignment.status = "completed" if payload.attendance_status == "attended" else assignment.status
    db.commit(); db.refresh(obj)
    return obj


@app.post("/impact")
def impact(payload: ImpactCreate, db: Session = Depends(get_db)):
    obj = models.ImpactRecord(**payload.model_dump())
    if obj.impact_score is None:
        completion = float(obj.service_completion_rate or 0)
        beneficiary_component = min(1, (obj.beneficiaries_served or 0) / 100)
        speed = max(0, 1 - (obj.response_time_minutes or 0) / 240)
        obj.impact_score = round((0.5*completion + 0.3*beneficiary_component + 0.2*speed) * 100, 2)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return {
        "volunteers": db.query(models.Volunteer).count(),
        "organizations": db.query(models.Organization).count(),
        "open_tasks": db.query(models.Task).filter(models.Task.status == "open").count(),
        "assignments": db.query(models.Assignment).count(),
        "beneficiaries_served": int(
            db.query(func.coalesce(func.sum(models.ImpactRecord.beneficiaries_served), 0)).scalar() or 0
        ),
        "campaigns": db.query(models.DonationCampaign).count(),
        "donations": db.query(models.Donation).filter(models.Donation.payment_status == "successful").count(),
    }


@app.post("/demo/seed")
def seed(db: Session = Depends(get_db)):
    return seed_demo(db)
