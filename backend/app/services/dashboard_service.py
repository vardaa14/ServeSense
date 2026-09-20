from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app import models
from app.matching import haversine_km
from app.services.matching_service import volunteer_task_recommendations
from app.services.donation_service import org_donation_total
from app.services.intelligence_service import organization_alerts, task_gaps, community_intelligence


def _hours_for_task(task: models.Task):
    if not task.start_time or not task.end_time:
        return 0.0
    return max(0.0, (task.end_time - task.start_time).total_seconds() / 3600)


def serialize_assignment(assignment: models.Assignment):
    task = assignment.task
    org = task.organization if task else None
    return {
        "id": assignment.id,
        "status": assignment.status,
        "assigned_at": assignment.assigned_at,
        "responded_at": assignment.responded_at,
        "task_id": assignment.task_id,
        "title": task.title if task else None,
        "organization": org.name if org else None,
        "location": task.community.name if task and task.community else (org.address if org else None),
        "start_time": task.start_time if task else None,
        "end_time": task.end_time if task else None,
        "category": task.category if task else None,
    }


def volunteer_impact(db: Session, volunteer: models.Volunteer):
    completed = [
        a for a in volunteer.assignments
        if a.status in ("completed", "accepted") and a.task and a.task.status == "completed"
    ]
    # Include assignments marked completed even if task isn't.
    completed = [a for a in volunteer.assignments if a.status == "completed"]
    hours = 0.0
    beneficiaries = 0
    rows = []
    for a in completed:
        task = a.task
        hrs = _hours_for_task(task) if task else 0
        hours += hrs
        impact = (task.impact_records or [None])[0] if task else None
        served = int(impact.beneficiaries_served or 0) if impact else 0
        # Attribute beneficiaries proportionally when multiple volunteers served.
        if task and task.required_headcount:
            served = round(served / max(task.required_headcount, 1))
        beneficiaries += served
        rows.append({
            "task": task.title if task else None,
            "date": task.start_time if task else None,
            "hours": round(hrs, 1),
            "organization": task.organization.name if task and task.organization else None,
            "beneficiaries_impacted": served,
            "status": a.status,
        })
    return {
        "total_tasks": len(completed),
        "total_hours": round(hours, 1),
        "beneficiaries_helped": beneficiaries,
        "history": rows,
    }


def volunteer_dashboard(db: Session, volunteer: models.Volunteer):
    upcoming = [
        a for a in volunteer.assignments
        if a.status in ("offered", "accepted") and a.task and a.task.end_time >= datetime.utcnow()
    ]
    impact = volunteer_impact(db, volunteer)
    recs = volunteer_task_recommendations(db, volunteer)
    nearby = []
    for task in db.query(models.Task).filter(models.Task.status == "open").all():
        d = haversine_km(volunteer.home_lat, volunteer.home_lng, task.lat, task.lng)
        if d is None:
            continue
        nearby.append({
            "task_id": task.id,
            "title": task.title,
            "organization": task.organization.name if task.organization else None,
            "category": task.category,
            "urgency_level": task.urgency_level,
            "start_time": task.start_time,
            "end_time": task.end_time,
            "location": task.community.name if task.community else None,
            "distance_km": round(d, 1),
            "estimated_beneficiaries": task.estimated_beneficiaries,
        })
    nearby.sort(key=lambda x: x["distance_km"])

    return {
        "volunteer_id": volunteer.id,
        "user_id": volunteer.user_id,
        "name": volunteer.user.full_name if volunteer.user else None,
        "stats": {
            "upcoming_assignments": len(upcoming),
            "completed_tasks": impact["total_tasks"],
            "hours_volunteered": impact["total_hours"],
            "beneficiaries_helped": impact["beneficiaries_helped"],
            "reliability_score": round(float(volunteer.reliability_score or 0) * 100),
        },
        "recommended": recs[:8],
        "nearby": nearby[:8],
        "upcoming_assignments": [serialize_assignment(a) for a in upcoming],
        "profile": volunteer_profile(volunteer),
        "availability": [serialize_availability(s) for s in volunteer.availability_slots],
        "impact": impact,
    }


def volunteer_profile(volunteer: models.Volunteer):
    return {
        "id": volunteer.id,
        "name": volunteer.user.full_name if volunteer.user else None,
        "email": volunteer.user.email if volunteer.user else None,
        "home_lat": float(volunteer.home_lat) if volunteer.home_lat is not None else None,
        "home_lng": float(volunteer.home_lng) if volunteer.home_lng is not None else None,
        "max_travel_km": volunteer.max_travel_km,
        "reliability_score": float(volunteer.reliability_score or 0),
        "cause_preferences": volunteer.cause_preferences or [],
        "languages": volunteer.languages or [],
        "transport_mode": volunteer.transport_mode,
        "background_check_status": volunteer.background_check_status,
        "active_flag": volunteer.active_flag,
        "skills": [
            {
                "id": vs.id,
                "skill_id": vs.skill_id,
                "name": vs.skill.name if vs.skill else None,
                "proficiency_level": vs.proficiency_level,
                "verified": vs.verified_flag,
            }
            for vs in volunteer.skills
        ],
        "certifications": [
            {
                "id": c.id,
                "cert_type": c.cert_type,
                "issuer": c.issuer,
                "expires_at": c.expires_at,
                "verification_status": c.verification_status,
            }
            for c in volunteer.certifications
        ],
    }


def serialize_availability(slot: models.AvailabilitySlot):
    return {
        "id": slot.id,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "recurrence_rule": slot.recurrence_rule,
        "status": slot.status,
    }


def public_volunteer_card(volunteer: models.Volunteer, assignment_count=None):
    return {
        "id": volunteer.id,
        "name": volunteer.user.full_name if volunteer.user else None,
        "reliability_score": round(float(volunteer.reliability_score or 0) * 100),
        "background_check_status": volunteer.background_check_status,
        "languages": volunteer.languages or [],
        "transport_mode": volunteer.transport_mode,
        "skills": [
            {"name": vs.skill.name, "level": vs.proficiency_level}
            for vs in volunteer.skills if vs.skill
        ],
        "assignments": assignment_count,
        "status": "active" if volunteer.active_flag else "inactive",
    }


def organization_dashboard(db: Session, organization: models.Organization):
    tasks = list(organization.tasks or [])
    active = [t for t in tasks if t.status in ("open", "filled")]
    completed = [t for t in tasks if t.status == "completed"]
    assigned_ids = set()
    for t in tasks:
        for a in t.assignments:
            assigned_ids.add(a.volunteer_id)
    open_req = sum(max(0, (t.required_headcount or 0) - (t.filled_headcount or 0)) for t in tasks if t.status == "open")
    beneficiaries = int(
        db.query(func.coalesce(func.sum(models.ImpactRecord.beneficiaries_served), 0))
        .join(models.Task)
        .filter(models.Task.organization_id == organization.id)
        .scalar() or 0
    )
    donations_received = org_donation_total(db, organization.id)

    impact_rows = (
        db.query(models.ImpactRecord)
        .join(models.Task)
        .filter(models.Task.organization_id == organization.id)
        .all()
    )
    avg_response = (
        sum(r.response_time_minutes or 0 for r in impact_rows) / len(impact_rows)
        if impact_rows else 0
    )
    completion_rate = (
        sum(float(r.service_completion_rate or 0) for r in impact_rows) / len(impact_rows)
        if impact_rows else 0
    )
    underserved = sum(1 for r in impact_rows if r.underserved_area_flag)
    impact_score = (
        sum(float(r.impact_score or 0) for r in impact_rows) / len(impact_rows)
        if impact_rows else 0
    )

    communities = {}
    for t in tasks:
        if t.community:
            communities[t.community.id] = t.community

    return {
        "organization_id": organization.id,
        "name": organization.name,
        "verified": bool(organization.verified),
        "stats": {
            "active_tasks": len(active),
            "volunteers_assigned": len(assigned_ids),
            "open_volunteer_requirements": open_req,
            "tasks_completed": len(completed),
            "beneficiaries_served": beneficiaries,
            "donations_received": donations_received,
        },
        "active_tasks": [serialize_task(t) for t in active],
        "alerts": organization_alerts(db, organization),
        "gaps": task_gaps(db, organization.id),
        "impact": {
            "beneficiaries_served": beneficiaries,
            "tasks_completed": len(completed),
            "average_response_time_minutes": round(avg_response, 1),
            "service_completion_rate": round(completion_rate, 3),
            "underserved_communities_reached": underserved,
            "volunteer_participation": len(assigned_ids),
            "impact_score": round(impact_score, 2),
            "records": [
                {
                    "task": r.task.title if r.task else None,
                    "beneficiaries_served": r.beneficiaries_served,
                    "response_time_minutes": r.response_time_minutes,
                    "service_completion_rate": float(r.service_completion_rate or 0),
                    "impact_score": float(r.impact_score or 0),
                    "underserved_area_flag": r.underserved_area_flag,
                }
                for r in impact_rows
            ],
        },
        "communities": [community_intelligence(db, c) for c in communities.values()],
    }


def serialize_task(task: models.Task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "category": task.category,
        "urgency_level": task.urgency_level,
        "start_time": task.start_time,
        "end_time": task.end_time,
        "required_headcount": task.required_headcount,
        "filled_headcount": task.filled_headcount,
        "status": task.status,
        "lat": float(task.lat) if task.lat is not None else None,
        "lng": float(task.lng) if task.lng is not None else None,
        "estimated_beneficiaries": task.estimated_beneficiaries,
        "organization_id": task.organization_id,
        "organization": task.organization.name if task.organization else None,
        "community_id": task.community_id,
        "community": task.community.name if task.community else None,
        "requirements": [
            {
                "id": r.id,
                "skill_id": r.skill_id,
                "skill": r.skill.name if r.skill else None,
                "certification_type": r.certification_type,
                "minimum_level": r.minimum_level,
                "mandatory_flag": r.mandatory_flag,
            }
            for r in task.requirements
        ],
    }
