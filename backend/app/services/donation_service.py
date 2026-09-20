from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.services.payment_service import payment_service
from app.services import notification_service


def _f(value):
    return float(value or 0)


def campaign_progress(campaign: models.DonationCampaign):
    target = _f(campaign.target_amount)
    raised = _f(campaign.raised_amount)
    pct = round((raised / target) * 100, 1) if target else 0
    estimated_supported = None
    if campaign.beneficiary_count and target:
        estimated_supported = int(round(campaign.beneficiary_count * min(1.0, raised / target)))
    return {
        "target_amount": target,
        "raised_amount": raised,
        "currency": campaign.currency or "INR",
        "percent_funded": min(100.0, pct),
        "beneficiary_count": campaign.beneficiary_count,
        "estimated_supported": estimated_supported,
        "impact_tiers": campaign.impact_tiers or [],
    }


def serialize_campaign(db: Session, campaign: models.DonationCampaign, include_donors: bool = True):
    org = campaign.organization
    progress = campaign_progress(campaign)
    related_tasks = 0
    if org:
        q = db.query(models.Task).filter(models.Task.organization_id == org.id)
        if campaign.category:
            q = q.filter(models.Task.category == campaign.category)
        related_tasks = q.count()

    recent = []
    if include_donors:
        rows = (
            db.query(models.Donation)
            .filter(
                models.Donation.campaign_id == campaign.id,
                models.Donation.payment_status == "successful",
            )
            .order_by(models.Donation.created_at.desc())
            .limit(8)
            .all()
        )
        for d in rows:
            recent.append({
                "id": d.id,
                "donor_name": "Anonymous" if d.is_anonymous else (d.donor_name or "Supporter"),
                "amount": _f(d.amount),
                "currency": d.currency,
                "created_at": d.created_at,
            })

    return {
        "id": campaign.id,
        "organization_id": campaign.organization_id,
        "organization_name": org.name if org else None,
        "organization_verified": bool(org.verified) if org else False,
        "title": campaign.title,
        "description": campaign.description,
        "category": campaign.category,
        "location": campaign.location,
        "lat": float(campaign.lat) if campaign.lat is not None else None,
        "lng": float(campaign.lng) if campaign.lng is not None else None,
        "status": campaign.status,
        "start_date": campaign.start_date,
        "end_date": campaign.end_date,
        "tasks_supported": related_tasks,
        "recent_donations": recent,
        **progress,
    }


def create_campaign(db: Session, payload: dict):
    obj = models.DonationCampaign(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def initiate_donation(db: Session, payload: dict):
    campaign = db.get(models.DonationCampaign, payload["campaign_id"])
    if not campaign:
        return None, "Campaign not found"
    if campaign.status not in ("active",):
        return None, "Campaign is not accepting donations"

    payment = payment_service.create_payment(
        amount=payload["amount"],
        currency=payload.get("currency") or campaign.currency or "INR",
        metadata={"campaign_id": campaign.id},
    )
    donation = models.Donation(
        campaign_id=campaign.id,
        donor_name=payload.get("donor_name"),
        donor_email=payload.get("donor_email"),
        amount=payload["amount"],
        currency=payload.get("currency") or campaign.currency or "INR",
        payment_status="pending",
        transaction_reference=payment["payment_id"],
        is_anonymous=bool(payload.get("is_anonymous")),
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return {"donation": donation, "payment": payment}, None


def _milestone_keys(percent: float):
    keys = []
    if percent >= 50:
        keys.append("50")
    if percent >= 100:
        keys.append("100")
    return keys


def complete_donation(db: Session, donation: models.Donation, success: bool):
    result = payment_service.verify_payment(donation.transaction_reference, success=success)
    status = result["status"]
    donation.payment_status = status
    campaign = donation.campaign
    if status == "successful":
        campaign.raised_amount = _f(campaign.raised_amount) + _f(donation.amount)
        progress = campaign_progress(campaign)
        if progress["percent_funded"] >= 100:
            campaign.status = "completed"
        org_users = [
            m.user_id for m in campaign.organization.members
        ] if campaign.organization else []
        notification_service.notify_users(
            db,
            org_users,
            "new_donation",
            {
                "title": "New donation received",
                "body": f"{donation.currency} {int(_f(donation.amount)):,} added to {campaign.title}",
                "campaign_id": campaign.id,
                "donation_id": donation.id,
            },
        )
        before = _f(campaign.raised_amount) - _f(donation.amount)
        target = _f(campaign.target_amount) or 1
        prev_pct = (before / target) * 100
        new_pct = progress["percent_funded"]
        for mark in _milestone_keys(new_pct):
            if (prev_pct < int(mark) <= new_pct) or (mark == "100" and prev_pct < 100 <= new_pct):
                notification_service.notify_users(
                    db,
                    org_users,
                    "donation_campaign_milestone",
                    {
                        "title": f"Campaign reached {mark}%",
                        "body": f"{campaign.title} is now {new_pct}% funded.",
                        "campaign_id": campaign.id,
                    },
                )
    db.commit()
    db.refresh(donation)
    return donation


def org_donation_total(db: Session, organization_id: str):
    total = (
        db.query(func.coalesce(func.sum(models.DonationCampaign.raised_amount), 0))
        .filter(models.DonationCampaign.organization_id == organization_id)
        .scalar()
    )
    return float(total or 0)
