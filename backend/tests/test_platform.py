from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)


def test_health_and_seed():
    assert client.get("/health").json()["status"] == "healthy"
    seeded = client.post("/demo/seed").json()
    assert "message" in seeded
    identities = client.get("/demo/identities").json()
    assert len(identities) >= 8


def test_matching_and_assignments():
    client.post("/demo/seed")
    tasks = client.get("/tasks").json()
    food = next(t for t in tasks if t["title"] == "Emergency Food Distribution")
    matches = client.post(f"/tasks/{food['id']}/recommendations").json()
    assert matches
    top = matches[0]
    assert "reasons" in top
    assert top["score"] >= matches[-1]["score"]

    db = SessionLocal()
    try:
        user = client.post("/users", json={
            "email": "far-away@servesense.demo",
            "full_name": "Far Away",
            "role": "volunteer",
        }).json()
        far = db.query(models.Volunteer).filter(models.Volunteer.user_id == user["id"]).first()
        if not far:
            far = models.Volunteer(
                user_id=user["id"],
                home_lat=28.61,
                home_lng=77.20,
                max_travel_km=5,
                reliability_score=0.99,
            )
            db.add(far)
            db.commit()
            db.refresh(far)
        ranked = {m["volunteer_id"]: m for m in client.post(f"/tasks/{food['id']}/recommendations").json()}
        if far.id in ranked:
            assert ranked[far.id]["distance_score"] <= ranked[top["volunteer_id"]]["distance_score"]
    finally:
        db.close()


def test_donations_mock_payment():
    client.post("/demo/seed")
    campaigns = client.get("/donation-campaigns").json()
    campaign = next(c for c in campaigns if c["status"] == "active")
    before = campaign["raised_amount"]
    created = client.post("/donations", json={
        "campaign_id": campaign["id"],
        "donor_name": "Test Donor",
        "donor_email": "donor@example.com",
        "amount": 500,
        "is_anonymous": False,
    }).json()
    assert created["payment_status"] == "pending"
    failed = client.post(f"/donations/{created['donation_id']}/complete", json={"success": False}).json()
    assert failed["payment_status"] == "failed"
    created2 = client.post("/donations", json={
        "campaign_id": campaign["id"],
        "donor_name": "Test Donor",
        "amount": 500,
    }).json()
    ok = client.post(f"/donations/{created2['donation_id']}/complete", json={"success": True}).json()
    assert ok["payment_status"] == "successful"
    after = client.get(f"/donation-campaigns/{campaign['id']}").json()
    assert after["raised_amount"] == before + 500


def test_notifications_and_intelligence():
    client.post("/demo/seed")
    identities = client.get("/demo/identities").json()
    volunteer = next(i for i in identities if i["role"] == "volunteer")
    notes = client.get(f"/notifications/{volunteer['user_id']}").json()
    assert "unread_count" in notes
    if notes["items"]:
        one = notes["items"][0]
        client.patch(f"/notifications/{one['id']}/read")
    client.post("/notifications/mark-all-read", json={"user_id": volunteer["user_id"]})
    after = client.get(f"/notifications/{volunteer['user_id']}").json()
    assert after["unread_count"] == 0
    communities = client.get("/intelligence/communities").json()
    assert len(communities) >= 3
    assert "need_score" in communities[0]
    gaps = client.get("/intelligence/gaps").json()
    assert gaps
    dash = client.get(f"/volunteers/{volunteer['volunteer_id']}/dashboard").json()
    assert "stats" in dash
    coord = next(i for i in identities if i["role"] == "coordinator")
    org_dash = client.get(f"/organizations/{coord['organization_id']}/dashboard").json()
    assert "alerts" in org_dash
