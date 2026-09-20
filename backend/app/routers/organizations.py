from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app.deps import get_current_user, assert_coordinator
from app.services import dashboard_service

router = APIRouter(tags=["organizations"])


@router.get("/organizations/{organization_id}/dashboard")
def org_dashboard(organization_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    org = db.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, organization_id)
    return dashboard_service.organization_dashboard(db, org)


@router.get("/organizations/{organization_id}/tasks")
def org_tasks(organization_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    org = db.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, organization_id)
    return [dashboard_service.serialize_task(t) for t in org.tasks]


@router.get("/organizations/{organization_id}/volunteers")
def org_volunteers(organization_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    org = db.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, organization_id)
    seen = {}
    for task in org.tasks:
        for assignment in task.assignments:
            vol = assignment.volunteer
            if not vol or vol.id in seen:
                if vol and vol.id in seen:
                    seen[vol.id]["assignments"] += 1
                continue
            card = dashboard_service.public_volunteer_card(vol, assignment_count=1)
            seen[vol.id] = card
    return list(seen.values())


@router.get("/organizations/{organization_id}/impact")
def org_impact(organization_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    org = db.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, organization_id)
    return dashboard_service.organization_dashboard(db, org)["impact"]


@router.get("/organizations/{organization_id}/alerts")
def org_alerts(organization_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    org = db.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, organization_id)
    return dashboard_service.organization_dashboard(db, org)["alerts"]


@router.get("/ngo/{organization_id}")
def public_org(organization_id: str, db: Session = Depends(get_db)):
    org = db.get(models.Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    campaigns = [
        {
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "raised_amount": float(c.raised_amount or 0),
            "target_amount": float(c.target_amount or 0),
            "currency": c.currency,
        }
        for c in org.donation_campaigns
        if c.status in ("active", "completed")
    ]
    return {
        "id": org.id,
        "name": org.name,
        "type": org.type,
        "address": org.address,
        "description": org.description,
        "verified": bool(org.verified),
        "lat": float(org.lat) if org.lat is not None else None,
        "lng": float(org.lng) if org.lng is not None else None,
        "campaigns": campaigns,
        "active_tasks": [
            {
                "id": t.id,
                "title": t.title,
                "category": t.category,
                "urgency_level": t.urgency_level,
                "status": t.status,
            }
            for t in org.tasks if t.status == "open"
        ],
    }


