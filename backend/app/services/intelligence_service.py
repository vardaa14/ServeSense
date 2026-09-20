from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app import models
from app.matching import haversine_km, score_volunteer_task
from app.services import notification_service

NEED_WEIGHTS = {
    "vulnerability": 0.35,
    "service_gap": 0.30,
    "urgency": 0.20,
    "unfilled_demand": 0.15,
}


def _f(value, default=0.0):
    if value is None:
        return default
    return float(value)


def community_task_stats(community: models.Community):
    tasks = list(community.tasks or [])
    active = [t for t in tasks if t.status in ("open", "filled")]
    open_tasks = [t for t in tasks if t.status == "open"]
    urgent = [t for t in open_tasks if (t.urgency_level or 0) >= 4]
    required = sum(t.required_headcount or 0 for t in open_tasks)
    filled = sum(min(t.filled_headcount or 0, t.required_headcount or 0) for t in open_tasks)
    unfilled = max(0, required - filled)
    beneficiaries = sum(t.estimated_beneficiaries or 0 for t in active)
    avg_urgency = (
        sum((t.urgency_level or 0) / 5 for t in open_tasks) / len(open_tasks)
        if open_tasks else 0.0
    )
    demand = min(1.0, unfilled / required) if required else 0.0
    return {
        "active_tasks": len(active),
        "open_tasks": len(open_tasks),
        "urgent_tasks": len(urgent),
        "required_volunteers": required,
        "assigned_volunteers": filled,
        "unfilled_positions": unfilled,
        "beneficiaries_affected": beneficiaries,
        "urgency_norm": avg_urgency,
        "unfilled_demand_norm": demand,
    }


def explain_need(vulnerability, service_gap, urgency, demand):
    reasons = []
    if vulnerability >= 0.7:
        reasons.append("High vulnerability")
    elif vulnerability >= 0.4:
        reasons.append("Moderate vulnerability")
    if service_gap >= 0.7:
        reasons.append("Large service gap")
    elif service_gap >= 0.4:
        reasons.append("Notable service gap")
    if urgency >= 0.6:
        reasons.append("Multiple urgent tasks")
    elif urgency >= 0.3:
        reasons.append("Active task urgency")
    if demand >= 0.5:
        reasons.append("Volunteer shortage")
    elif demand >= 0.2:
        reasons.append("Some unfilled volunteer demand")
    if not reasons:
        reasons.append("Need is currently moderate")
    return reasons


def community_intelligence(db: Session, community: models.Community):
    stats = community_task_stats(community)
    vulnerability = min(1.0, max(0.0, _f(community.vulnerability_score)))
    service_gap = min(1.0, max(0.0, _f(community.last_service_gap_score)))
    urgency = min(1.0, max(0.0, stats["urgency_norm"]))
    demand = min(1.0, max(0.0, stats["unfilled_demand_norm"]))
    need_score = (
        NEED_WEIGHTS["vulnerability"] * vulnerability
        + NEED_WEIGHTS["service_gap"] * service_gap
        + NEED_WEIGHTS["urgency"] * urgency
        + NEED_WEIGHTS["unfilled_demand"] * demand
    )
    volunteer_count = 0
    if community.lat is not None and community.lng is not None:
        for v in db.query(models.Volunteer).filter(models.Volunteer.active_flag == True).all():
            d = haversine_km(v.home_lat, v.home_lng, community.lat, community.lng)
            if d is not None and d <= float(v.max_travel_km or 20):
                volunteer_count += 1

    return {
        "id": community.id,
        "name": community.name,
        "city": community.city,
        "lat": float(community.lat) if community.lat is not None else None,
        "lng": float(community.lng) if community.lng is not None else None,
        "population_estimate": community.population_estimate,
        "vulnerability_score": round(vulnerability, 3),
        "service_gap_score": round(service_gap, 3),
        "urgency_score": round(urgency, 3),
        "unfilled_demand_score": round(demand, 3),
        "need_score": round(need_score, 3),
        "need_level": "high" if need_score >= 0.65 else "moderate" if need_score >= 0.4 else "low",
        "reasons": explain_need(vulnerability, service_gap, urgency, demand),
        "weights": NEED_WEIGHTS,
        "volunteer_count": volunteer_count,
        **stats,
    }


def task_gaps(db: Session, organization_id=None):
    q = db.query(models.Task).options(
        joinedload(models.Task.organization),
        joinedload(models.Task.community),
    )
    if organization_id:
        q = q.filter(models.Task.organization_id == organization_id)
    rows = []
    for task in q.all():
        required = task.required_headcount or 0
        assigned = task.filled_headcount or 0
        gap = max(0, required - assigned)
        rows.append({
            "task_id": task.id,
            "title": task.title,
            "organization": task.organization.name if task.organization else None,
            "community": task.community.name if task.community else None,
            "community_id": task.community_id,
            "status": task.status,
            "urgency_level": task.urgency_level,
            "required": required,
            "assigned": assigned,
            "gap": gap,
            "lat": float(task.lat) if task.lat is not None else None,
            "lng": float(task.lng) if task.lng is not None else None,
        })
    rows.sort(key=lambda x: (x["gap"], x["urgency_level"] or 0), reverse=True)
    return rows


def map_payload(db: Session):
    communities = [community_intelligence(db, c) for c in db.query(models.Community).all()]
    tasks = []
    for t in db.query(models.Task).options(joinedload(models.Task.organization)).all():
        tasks.append({
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "urgency_level": t.urgency_level,
            "kind": "urgent_task" if (t.urgency_level or 0) >= 4 else "task",
            "lat": float(t.lat) if t.lat is not None else None,
            "lng": float(t.lng) if t.lng is not None else None,
            "organization": t.organization.name if t.organization else None,
        })
    volunteers = []
    for v in db.query(models.Volunteer).options(joinedload(models.Volunteer.user)).all():
        if v.home_lat is None or v.home_lng is None:
            continue
        volunteers.append({
            "id": v.id,
            "lat": float(v.home_lat),
            "lng": float(v.home_lng),
            "active": v.active_flag,
        })
    orgs = []
    for o in db.query(models.Organization).all():
        if o.lat is None or o.lng is None:
            continue
        orgs.append({
            "id": o.id,
            "name": o.name,
            "type": o.type,
            "kind": "relief_center" if (o.type or "").lower() in ("relief_center", "relief centre") else "organization",
            "lat": float(o.lat),
            "lng": float(o.lng),
        })
    return {
        "communities": communities,
        "tasks": tasks,
        "volunteers": volunteers,
        "organizations": orgs,
    }


def nearby(db: Session, lat: float, lng: float, radius_km: float = 15):
    payload = map_payload(db)
    def within(item):
        d = haversine_km(lat, lng, item.get("lat"), item.get("lng"))
        if d is None:
            return None
        item = dict(item)
        item["distance_km"] = round(d, 1)
        return item if d <= radius_km else None

    return {
        "communities": sorted(filter(None, (within(c) for c in payload["communities"])), key=lambda x: x["distance_km"]),
        "tasks": sorted(filter(None, (within(t) for t in payload["tasks"])), key=lambda x: x["distance_km"]),
        "organizations": sorted(filter(None, (within(o) for o in payload["organizations"])), key=lambda x: x["distance_km"]),
    }


def organization_alerts(db: Session, organization: models.Organization):
    gaps = task_gaps(db, organization.id)
    unfilled = sum(g["gap"] for g in gaps if g["status"] == "open")
    urgent = [g for g in gaps if g["status"] == "open" and (g["urgency_level"] or 0) >= 4]
    high_gap_communities = []
    seen = set()
    for g in gaps:
        if not g["community_id"] or g["community_id"] in seen:
            continue
        comm = db.get(models.Community, g["community_id"])
        if comm and _f(comm.last_service_gap_score) >= 0.7:
            seen.add(comm.id)
            high_gap_communities.append(comm.name)

    nearby_volunteers = 0
    origin = (organization.lat, organization.lng)
    if origin[0] is None:
        open_task = next((t for t in organization.tasks if t.lat is not None), None)
        if open_task:
            origin = (open_task.lat, open_task.lng)
    if origin[0] is not None:
        for v in db.query(models.Volunteer).filter(models.Volunteer.active_flag == True).all():
            d = haversine_km(v.home_lat, v.home_lng, origin[0], origin[1])
            if d is not None and d <= 10:
                nearby_volunteers += 1

    alerts = []
    if unfilled:
        alerts.append({
            "level": "warning",
            "code": "unfilled_positions",
            "message": f"{unfilled} volunteer positions remain unfilled",
        })
    if high_gap_communities:
        alerts.append({
            "level": "warning",
            "code": "service_gap",
            "message": f"Community service gap remains high in {', '.join(high_gap_communities)}",
        })
    if urgent:
        alerts.append({
            "level": "danger",
            "code": "urgent_tasks",
            "message": f"{len(urgent)} urgent tasks require attention",
        })
    if nearby_volunteers:
        alerts.append({
            "level": "success",
            "code": "nearby_volunteers",
            "message": f"{nearby_volunteers} volunteers available within 10 km",
        })
    return alerts


def dispatch_smart_alerts(db: Session, need_threshold: float = 0.65):
    """Notify only volunteers who reasonably match a high-need open task."""
    created = 0
    communities = db.query(models.Community).all()
    for community in communities:
        intel = community_intelligence(db, community)
        if intel["need_score"] < need_threshold:
            continue
        open_tasks = [t for t in community.tasks if t.status == "open"]
        for task in open_tasks:
            for volunteer in db.query(models.Volunteer).filter(models.Volunteer.active_flag == True).all():
                scored = score_volunteer_task(volunteer, task)
                if scored is None:
                    continue
                distance = scored["distance_km"]
                if distance is None or distance > float(volunteer.max_travel_km or 20):
                    continue
                if scored["skill"] < 1.0:
                    continue
                if scored["availability"] < 1.0:
                    continue
                if scored["total"] < 0.7:
                    continue
                existing = db.query(models.Notification).filter(
                    models.Notification.user_id == volunteer.user_id,
                    models.Notification.template_key == "local_emergency",
                ).all()
                if any((n.payload_json or {}).get("task_id") == task.id for n in existing):
                    continue
                notification_service.create_notification(
                    db,
                    volunteer.user_id,
                    "local_emergency",
                    {
                        "title": "Urgent opportunity near you",
                        "body": (
                            f"An organization needs volunteers for {task.title} "
                            f"{distance:.1f} km from your location. "
                            f"You match {round(scored['total']*100)}% of the requirements."
                        ),
                        "task_id": task.id,
                        "match_percentage": round(scored["total"] * 100),
                        "distance_km": round(distance, 1),
                    },
                )
                created += 1
        org_ids = {t.organization_id for t in community.tasks}
        for org_id in org_ids:
            org = db.get(models.Organization, org_id)
            if not org:
                continue
            user_ids = [m.user_id for m in org.members]
            for uid in user_ids:
                exists = db.query(models.Notification).filter(
                    models.Notification.user_id == uid,
                    models.Notification.template_key == "local_intelligence_alert",
                ).all()
                if any((n.payload_json or {}).get("community_id") == community.id for n in exists):
                    continue
                notification_service.create_notification(
                    db,
                    uid,
                    "local_intelligence_alert",
                    {
                        "title": "Important local intelligence alert",
                        "body": f"{community.name} has a need score of {round(intel['need_score']*100)}%.",
                        "community_id": community.id,
                        "need_score": intel["need_score"],
                    },
                )
                created += 1
    return created

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.deps import get_db
from app.services.demand_service import demand_prediction_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

class DemandPredictionRequest(BaseModel):
    region: str
    disaster_severity_score: Optional[float] = 0.0
    event_radius_km: Optional[float] = 0.0
    population_density_sqkm: Optional[float] = 5000.0
    vulnerability_index: Optional[float] = 0.5
