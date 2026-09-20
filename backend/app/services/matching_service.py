from datetime import datetime
from sqlalchemy.orm import Session
from app import models
from app.matching import recommend as matching_recommend, recommend_tasks_for_volunteer


def generate_task_recommendations(db: Session, task: models.Task):
    db.query(models.AssignmentRecommendation).filter(
        models.AssignmentRecommendation.task_id == task.id
    ).delete()
    db.commit()
    return matching_recommend(db, task)


def serialize_coordinator_match(item):
    volunteer = item["volunteer"]
    return {
        "recommendation_id": item.get("recommendation_id"),
        "volunteer_id": volunteer.id,
        "name": volunteer.user.full_name if volunteer.user else None,
        "score": round(item["total"], 3),
        "skill_score": round(item["skill"], 3),
        "availability_score": round(item["availability"], 3),
        "distance_score": round(item["distance"], 3),
        "reliability_score": round(item["reliability"], 3),
        "distance_km": round(item["distance_km"], 1) if item["distance_km"] is not None else None,
        "reasons": item["reasons"],
        "background_check_status": volunteer.background_check_status,
        "skills": [
            {"name": vs.skill.name, "level": vs.proficiency_level}
            for vs in volunteer.skills if vs.skill
        ],
    }


def serialize_volunteer_match(item):
    task = item["task"]
    org = task.organization
    return {
        "task_id": task.id,
        "title": task.title,
        "description": task.description,
        "organization": org.name if org else None,
        "organization_id": task.organization_id,
        "category": task.category,
        "location": (task.community.name if task.community else None) or (org.address if org else None),
        "lat": float(task.lat) if task.lat is not None else None,
        "lng": float(task.lng) if task.lng is not None else None,
        "start_time": task.start_time,
        "end_time": task.end_time,
        "urgency_level": task.urgency_level,
        "estimated_beneficiaries": task.estimated_beneficiaries,
        "required_headcount": task.required_headcount,
        "filled_headcount": task.filled_headcount,
        "match_percentage": round(item["total"] * 100),
        "score": round(item["total"], 3),
        "skill_score": round(item["skill"], 3),
        "availability_score": round(item["availability"], 3),
        "distance_score": round(item["distance"], 3),
        "reliability_score": round(item["reliability"], 3),
        "distance_km": round(item["distance_km"], 1) if item["distance_km"] is not None else None,
        "reasons": item["volunteer_reasons"],
    }


def volunteer_task_recommendations(db: Session, volunteer: models.Volunteer):
    return [serialize_volunteer_match(x) for x in recommend_tasks_for_volunteer(db, volunteer)]
