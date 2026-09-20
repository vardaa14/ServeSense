from math import radians, sin, cos, sqrt, atan2
from sqlalchemy.orm import Session
from app.models import (
    Task, Volunteer, AssignmentRecommendation
)


def haversine_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    R = 6371.0
    dlat = radians(float(lat2) - float(lat1))
    dlon = radians(float(lon2) - float(lon1))
    a = sin(dlat/2)**2 + cos(radians(float(lat1))) * cos(radians(float(lat2))) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))


def availability_score(volunteer, task):
    for slot in volunteer.availability_slots:
        if slot.status != "open":
            continue
        if slot.start_time <= task.start_time and slot.end_time >= task.end_time:
            return 1.0
    return 0.0


def skill_score(volunteer, task):
    reqs = [r for r in task.requirements if r.skill_id]
    if not reqs:
        return 1.0
    scores = []
    for req in reqs:
        matching = [
            vs for vs in volunteer.skills
            if vs.skill_id == req.skill_id and vs.proficiency_level >= req.minimum_level
        ]
        score = 1.0 if matching else 0.0
        if req.mandatory_flag and score == 0:
            return 0.0
        scores.append(score)
    return sum(scores) / len(scores) if scores else 1.0


def certification_ok(volunteer, task):
    cert_reqs = [r for r in task.requirements if r.certification_type]
    for req in cert_reqs:
        if not any(
            c.cert_type.lower() == req.certification_type.lower()
            and c.verification_status == "verified"
            and (c.expires_at is None or c.expires_at >= task.start_time.date())
            for c in volunteer.certifications
        ):
            if req.mandatory_flag:
                return False
    return True


def distance_score(volunteer, task):
    d = haversine_km(volunteer.home_lat, volunteer.home_lng, task.lat, task.lng)
    if d is None:
        return 0.5, None
    max_km = max(float(volunteer.max_travel_km or 20), 1)
    return max(0.0, min(1.0, 1 - d / max_km)), d


def cause_relevance(volunteer, task):
    prefs = [str(p).lower() for p in (volunteer.cause_preferences or [])]
    if not prefs:
        return False
    haystack = " ".join(filter(None, [task.category, task.title, task.description])).lower()
    return any(p in haystack or haystack in p for p in prefs)


def volunteer_facing_reasons(volunteer, task, s_skill, s_avail, distance, fairness):
    reasons = []
    reqs = [r for r in task.requirements if r.skill]
    if s_skill >= 1 and reqs:
        names = ", ".join(sorted({r.skill.name for r in reqs}))
        reasons.append(f"Your {names} skill matches")
    elif s_skill > 0:
        reasons.append("Partial skill match")
    else:
        reasons.append("Skill requirements are not fully met")

    if s_avail >= 1:
        reasons.append("You are available")
    else:
        reasons.append("No overlapping availability window")

    max_km = float(volunteer.max_travel_km or 20)
    if distance is None:
        reasons.append("Distance could not be calculated")
    elif distance <= max_km:
        reasons.append("Within your travel radius")
    else:
        reasons.append(f"Outside your {int(max_km)} km travel radius")

    if cause_relevance(volunteer, task):
        reasons.append("High relevance to your selected causes")
    if fairness:
        reasons.append("Serves a high service-gap community")
    return reasons


def coordinator_facing_reasons(s_skill, s_avail, distance, s_rel, fairness):
    reasons = []
    reasons.append(f"Skill match: {round(s_skill*100)}%")
    reasons.append(f"Availability: {round(s_avail*100)}%")
    reasons.append(
        f"Distance: {round(distance, 1)} km" if distance is not None
        else "Distance: unavailable"
    )
    reasons.append(f"Reliability: {round(s_rel*100)}%")
    if fairness:
        reasons.append("Small service-gap adjustment applied")
    return reasons


def score_volunteer_task(volunteer, task):
    """Shared explainable score used by task-to-volunteer and volunteer-to-task matching."""
    if not certification_ok(volunteer, task):
        return None

    s_skill = skill_score(volunteer, task)
    s_avail = availability_score(volunteer, task)
    s_dist, distance = distance_score(volunteer, task)
    s_rel = float(volunteer.reliability_score or 0.5)

    total = (
        0.40 * s_skill +
        0.25 * s_avail +
        0.20 * s_dist +
        0.15 * s_rel
    )

    fairness = 0.0
    if task.community and float(task.community.last_service_gap_score or 0) >= 0.7:
        fairness = 0.05
        total = min(1.0, total + fairness)

    no_show_risk = max(0.0, min(1.0, 1.0 - s_rel))
    return {
        "volunteer": volunteer,
        "task": task,
        "total": total,
        "skill": s_skill,
        "availability": s_avail,
        "distance": s_dist,
        "reliability": s_rel,
        "fairness": fairness,
        "no_show_risk": no_show_risk,
        "distance_km": distance,
        "reasons": coordinator_facing_reasons(s_skill, s_avail, distance, s_rel, fairness),
        "volunteer_reasons": volunteer_facing_reasons(
            volunteer, task, s_skill, s_avail, distance, fairness
        ),
    }


def recommend(db: Session, task: Task):
    volunteers = db.query(Volunteer).filter(Volunteer.active_flag == True).all()
    results = []

    for v in volunteers:
        item = score_volunteer_task(v, task)
        if item is None:
            continue
        results.append(item)

    results.sort(key=lambda x: x["total"], reverse=True)

    for rank, item in enumerate(results, start=1):
        rec = AssignmentRecommendation(
            task_id=task.id,
            volunteer_id=item["volunteer"].id,
            total_score=item["total"],
            skill_score=item["skill"],
            availability_score=item["availability"],
            distance_score=item["distance"],
            reliability_score=item["reliability"],
            fairness_adjustment=item["fairness"],
            no_show_risk=item["no_show_risk"],
            explainability_json={
                "reasons": item["reasons"],
                "volunteer_reasons": item["volunteer_reasons"],
                "distance_km": item["distance_km"],
            },
            rank_position=rank,
        )
        db.add(rec)
        db.flush()
        item["recommendation_id"] = rec.id

    db.commit()
    return results


def recommend_tasks_for_volunteer(db: Session, volunteer: Volunteer, tasks=None):
    assigned_ids = {a.task_id for a in volunteer.assignments}
    if tasks is None:
        tasks = db.query(Task).filter(Task.status.in_(["open", "filled"])).all()
    results = []
    for task in tasks:
        if task.id in assigned_ids:
            continue
        if task.status not in ("open",):
            continue
        item = score_volunteer_task(volunteer, task)
        if item is None:
            continue
        results.append(item)
    results.sort(key=lambda x: x["total"], reverse=True)
    return results
