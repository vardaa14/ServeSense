from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas import DonationCampaignCreate, DonationCreate, DonationComplete
from app.deps import get_current_user, assert_coordinator
from app.services import donation_service
from app.services.payment_service import payment_service

router = APIRouter(tags=["donations"])


@router.get("/donation-campaigns")
def list_campaigns(db: Session = Depends(get_db)):
    rows = db.query(models.DonationCampaign).filter(
        models.DonationCampaign.status.in_(["active", "completed"])
    ).all()
    return [donation_service.serialize_campaign(db, c) for c in rows]


@router.get("/donation-campaigns/{campaign_id}")
def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    campaign = db.get(models.DonationCampaign, campaign_id)
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    return donation_service.serialize_campaign(db, campaign)


@router.post("/donation-campaigns")
def create_campaign(payload: DonationCampaignCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not db.get(models.Organization, payload.organization_id):
        raise HTTPException(404, "Organization not found")
    assert_coordinator(user, payload.organization_id)
    obj = donation_service.create_campaign(db, payload.model_dump())
    return donation_service.serialize_campaign(db, obj)


@router.post("/donations")
def create_donation(payload: DonationCreate, db: Session = Depends(get_db)):
    result, error = donation_service.initiate_donation(db, payload.model_dump())
    if error:
        raise HTTPException(400 if "not accepting" in error else 404, error)
    donation = result["donation"]
    return {
        "donation_id": donation.id,
        "payment_status": donation.payment_status,
        "transaction_reference": donation.transaction_reference,
        "amount": float(donation.amount),
        "currency": donation.currency,
        "payment": result["payment"],
        "next_step": "POST /donations/{id}/complete with mock success or failure",
    }


@router.post("/donations/{donation_id}/complete")
def complete_donation(donation_id: str, payload: DonationComplete, db: Session = Depends(get_db)):
    donation = db.get(models.Donation, donation_id)
    if not donation:
        raise HTTPException(404, "Donation not found")
    if donation.payment_status != "pending":
        raise HTTPException(400, "Donation is already finalized")
    updated = donation_service.complete_donation(db, donation, payload.success)
    return {
        "donation_id": updated.id,
        "payment_status": updated.payment_status,
        "campaign": donation_service.serialize_campaign(db, updated.campaign),
    }


@router.post("/payments/webhook")
def payment_webhook(payload: dict, db: Session = Depends(get_db)):
    result = payment_service.handle_webhook(payload)
    donation_id = payload.get("donation_id")
    if donation_id:
        donation = db.get(models.Donation, donation_id)
        if donation and donation.payment_status == "pending":
            donation_service.complete_donation(db, donation, result.get("status") == "successful")
    return result


@router.get("/donation-campaigns/{campaign_id}/donations")
def campaign_donations(campaign_id: str, db: Session = Depends(get_db)):
    campaign = db.get(models.DonationCampaign, campaign_id)
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    return [
        {
            "id": d.id,
            "donor_name": "Anonymous" if d.is_anonymous else (d.donor_name or "Supporter"),
            "amount": float(d.amount),
            "currency": d.currency,
            "payment_status": d.payment_status,
            "created_at": d.created_at,
        }
        for d in campaign.donations
        if d.payment_status == "successful"
    ]
