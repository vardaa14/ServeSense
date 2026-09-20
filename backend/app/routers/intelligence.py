from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.services import intelligence_service

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/communities")
def communities(db: Session = Depends(get_db)):
    return [intelligence_service.community_intelligence(db, c) for c in db.query(models.Community).all()]


@router.get("/communities/{community_id}")
def community(community_id: str, db: Session = Depends(get_db)):
    obj = db.get(models.Community, community_id)
    if not obj:
        raise HTTPException(404, "Community not found")
    return intelligence_service.community_intelligence(db, obj)


@router.get("/nearby")
def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(15),
    db: Session = Depends(get_db),
):
    return intelligence_service.nearby(db, lat, lng, radius_km)


@router.get("/gaps")
def gaps(organization_id: str | None = None, db: Session = Depends(get_db)):
    return intelligence_service.task_gaps(db, organization_id)


@router.get("/map")
def map_data(db: Session = Depends(get_db)):
    return intelligence_service.map_payload(db)


@router.post("/alerts/dispatch")
def dispatch(db: Session = Depends(get_db)):
    created = intelligence_service.dispatch_smart_alerts(db)
    return {"created": created}
