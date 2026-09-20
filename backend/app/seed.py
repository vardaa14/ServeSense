from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app import models
from app.services import notification_service
from app.services.intelligence_service import dispatch_smart_alerts


def _get_or_create_user(db: Session, email, full_name, role, phone=None):
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user, False
    user = models.User(email=email, full_name=full_name, role=role, phone=phone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True


def _get_or_create_org(db, name, **kwargs):
    obj = db.query(models.Organization).filter(models.Organization.name == name).first()
    if obj:
        return obj
    obj = models.Organization(name=name, **kwargs)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _get_or_create_community(db, name, **kwargs):
    obj = db.query(models.Community).filter(models.Community.name == name).first()
    if obj:
        return obj
    obj = models.Community(name=name, **kwargs)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _get_or_create_skill(db, name, category):
    obj = db.query(models.Skill).filter(models.Skill.name == name).first()
    if obj:
        return obj
    obj = models.Skill(name=name, category=category)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def seed_demo(db: Session):
    """Additive demo dataset. Existing rows are reused by unique name/email."""
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    day = timedelta(days=1)

    coordinator, _ = _get_or_create_user(db, "coordinator@servesense.demo", "Aarav Coordinator", "coordinator")
    admin, _ = _get_or_create_user(db, "admin@servesense.demo", "ServeSense Admin", "admin")
    coordinator2, _ = _get_or_create_user(db, "coastal.coordinator@servesense.demo", "Diya Nair", "coordinator")

    volunteer_specs = [
        ("volunteer1@servesense.demo", "Maya Volunteer", 19.0800, 72.8800, 15, 0.92, ["disaster relief", "food"], ["English", "Hindi"], "bike"),
        ("volunteer2@servesense.demo", "Rohan Volunteer", 19.1400, 72.9100, 20, 0.72, ["food"], ["English", "Marathi"], "public transit"),
        ("volunteer3@servesense.demo", "Ananya Shah", 19.0890, 72.8550, 12, 0.88, ["healthcare", "first aid"], ["English", "Gujarati"], "walk"),
        ("volunteer4@servesense.demo", "Kabir Menon", 19.1180, 72.9050, 25, 0.64, ["logistics", "shelter"], ["English", "Malayalam"], "car"),
        ("volunteer5@servesense.demo", "Sara Fernandes", 19.0720, 72.8700, 18, 0.81, ["education", "food"], ["English", "Konkani"], "bike"),
        ("volunteer6@servesense.demo", "Ishaan Patel", 19.0950, 72.8450, 10, 0.55, ["disaster relief"], ["English", "Hindi"], "public transit"),
        ("volunteer7@servesense.demo", "Meera Iyer", 19.1250, 72.9180, 30, 0.90, ["healthcare", "disaster relief"], ["English", "Tamil"], "car"),
        ("volunteer8@servesense.demo", "Arjun Desai", 19.0780, 72.8900, 16, 0.77, ["food", "logistics"], ["English", "Marathi"], "bike"),
    ]
    users = []
    for email, name, lat, lng, travel, rel, causes, langs, transport in volunteer_specs:
        user, _ = _get_or_create_user(db, email, name, "volunteer")
        users.append((user, lat, lng, travel, rel, causes, langs, transport))

    org1 = _get_or_create_org(
        db, "Community Relief Network", type="NGO", address="Mumbai",
        description="Coordinates emergency food, shelter and first-response support across harbour neighbourhoods.",
        verified=True, lat=19.0760, lng=72.8777,
    )
    org2 = _get_or_create_org(
        db, "Coastal Care Alliance", type="NGO", address="Mumbai",
        description="Supports coastal and hillside settlements with medical camps and family relief kits.",
        verified=True, lat=19.1180, lng=72.9000,
    )
    relief_center = _get_or_create_org(
        db, "Harbour Relief Center", type="relief_center", address="Mumbai Harbour",
        description="Staging point for kits, water and volunteer check-in.",
        verified=True, lat=19.0745, lng=72.8740,
    )

    for user, org in ((coordinator, org1), (coordinator2, org2), (admin, org1)):
        exists = db.query(models.OrganizationMember).filter(
            models.OrganizationMember.organization_id == org.id,
            models.OrganizationMember.user_id == user.id,
        ).first()
        if not exists:
            db.add(models.OrganizationMember(
                organization_id=org.id, user_id=user.id,
                member_role="admin" if user.role == "admin" else "coordinator",
            ))
    db.commit()

    harbour = _get_or_create_community(
        db, "Harbour Relief Community", city="Mumbai", lat=19.0760, lng=72.8777,
        vulnerability_score=0.80, population_estimate=12000, last_service_gap_score=0.75,
    )
    riverside = _get_or_create_community(
        db, "Riverside Ward Collective", city="Mumbai", lat=19.0900, lng=72.8500,
        vulnerability_score=0.62, population_estimate=18000, last_service_gap_score=0.48,
    )
    hillside = _get_or_create_community(
        db, "Hillside Settlement", city="Mumbai", lat=19.1200, lng=72.9100,
        vulnerability_score=0.84, population_estimate=9000, last_service_gap_score=0.82,
    )

    food = _get_or_create_skill(db, "Food Distribution", "Relief")
    first_aid = _get_or_create_skill(db, "First Aid", "Healthcare")
    logistics = _get_or_create_skill(db, "Logistics", "Operations")
    shelter = _get_or_create_skill(db, "Shelter Support", "Relief")
    teaching = _get_or_create_skill(db, "Community Teaching", "Education")

    volunteers = []
    for user, lat, lng, travel, rel, causes, langs, transport in users:
        vol = db.query(models.Volunteer).filter(models.Volunteer.user_id == user.id).first()
        if not vol:
            vol = models.Volunteer(
                user_id=user.id, home_lat=lat, home_lng=lng, max_travel_km=travel,
                reliability_score=rel, cause_preferences=causes, languages=langs,
                transport_mode=transport, background_check_status="approved",
            )
            db.add(vol)
            db.commit()
            db.refresh(vol)
        volunteers.append(vol)

    # Maya, Rohan, Ananya, Kabir, Sara, Ishaan, Meera, Arjun
    skill_map = [
        [(food, 5, True), (first_aid, 4, True)],
        [(food, 3, True)],
        [(first_aid, 5, True), (teaching, 3, True)],
        [(logistics, 4, True), (shelter, 4, True)],
        [(teaching, 5, True), (food, 2, False)],
        [(food, 2, False), (logistics, 3, True)],
        [(first_aid, 5, True), (shelter, 3, True)],
        [(food, 4, True), (logistics, 4, True)],
    ]
    for vol, skills in zip(volunteers, skill_map):
        for skill, level, verified in skills:
            exists = db.query(models.VolunteerSkill).filter(
                models.VolunteerSkill.volunteer_id == vol.id,
                models.VolunteerSkill.skill_id == skill.id,
            ).first()
            if not exists:
                db.add(models.VolunteerSkill(
                    volunteer_id=vol.id, skill_id=skill.id,
                    proficiency_level=level, verified_flag=verified,
                ))
    db.commit()

    if not volunteers[0].certifications:
        db.add(models.Certification(
            volunteer_id=volunteers[0].id, cert_type="First Aid",
            issuer="Mumbai Red Cross", expires_at=date(2026, 10, 5),
            verification_status="verified",
        ))
        db.add(models.Certification(
            volunteer_id=volunteers[2].id, cert_type="First Aid",
            issuer="City Health Dept", expires_at=date(2027, 3, 1),
            verification_status="verified",
        ))
        db.add(models.Certification(
            volunteer_id=volunteers[6].id, cert_type="First Aid",
            issuer="State EMS", expires_at=date(2027, 1, 12),
            verification_status="verified",
        ))
        db.commit()

    windows = [
        (now + day, now + day + timedelta(hours=8)),
        (now + day, now + day + timedelta(hours=6)),
        (now + 2 * day, now + 2 * day + timedelta(hours=6)),
        (now + 3 * day, now + 3 * day + timedelta(hours=8)),
        (now + day, now + 4 * day),
        (now + 5 * day, now + 5 * day + timedelta(hours=4)),
        (now + day, now + 2 * day + timedelta(hours=10)),
        (now + day, now + day + timedelta(hours=10)),
    ]
    for vol, (start, end) in zip(volunteers, windows):
        if not vol.availability_slots:
            db.add(models.AvailabilitySlot(volunteer_id=vol.id, start_time=start, end_time=end))
    db.commit()

    def ensure_task(**kwargs):
        obj = db.query(models.Task).filter(models.Task.title == kwargs["title"]).first()
        if obj:
            for key in ("required_headcount", "status", "urgency_level", "estimated_beneficiaries", "description"):
                if key in kwargs:
                    setattr(obj, key, kwargs[key])
            db.commit()
            return obj
        obj = models.Task(**kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    t1 = ensure_task(
        organization_id=org1.id, community_id=harbour.id,
        title="Emergency Food Distribution",
        description="Distribute food kits to families affected by a local emergency.",
        category="food", urgency_level=5,
        start_time=now + day + timedelta(hours=10),
        end_time=now + day + timedelta(hours=14),
        required_headcount=10, filled_headcount=0,
        lat=19.0760, lng=72.8777, status="open",
        estimated_beneficiaries=100, created_by=coordinator.id,
    )
    t2 = ensure_task(
        organization_id=org1.id, community_id=harbour.id,
        title="Harbour First Aid Desk",
        description="Staff a first-aid desk near the relief center.",
        category="healthcare", urgency_level=4,
        start_time=now + 2 * day + timedelta(hours=9),
        end_time=now + 2 * day + timedelta(hours=13),
        required_headcount=4, filled_headcount=0,
        lat=19.0748, lng=72.8745, status="open",
        estimated_beneficiaries=40, created_by=coordinator.id,
    )
    t3 = ensure_task(
        organization_id=org2.id, community_id=hillside.id,
        title="Hillside Shelter Setup",
        description="Assemble family tents and register displaced households.",
        category="shelter", urgency_level=5,
        start_time=now + 3 * day + timedelta(hours=8),
        end_time=now + 3 * day + timedelta(hours=16),
        required_headcount=8, filled_headcount=0,
        lat=19.1200, lng=72.9100, status="open",
        estimated_beneficiaries=80, created_by=coordinator2.id,
    )
    t4 = ensure_task(
        organization_id=org2.id, community_id=riverside.id,
        title="Riverside Learning Circle",
        description="After-school support for children in temporary housing.",
        category="education", urgency_level=2,
        start_time=now + 4 * day + timedelta(hours=16),
        end_time=now + 4 * day + timedelta(hours=18),
        required_headcount=3, filled_headcount=0,
        lat=19.0900, lng=72.8500, status="open",
        estimated_beneficiaries=25, created_by=coordinator2.id,
    )
    t5 = ensure_task(
        organization_id=org1.id, community_id=riverside.id,
        title="Kit Logistics Night Shift",
        description="Sort and load relief kits for next-day distribution.",
        category="logistics", urgency_level=3,
        start_time=now + 5 * day + timedelta(hours=18),
        end_time=now + 5 * day + timedelta(hours=22),
        required_headcount=6, filled_headcount=0,
        lat=19.0888, lng=72.8520, status="open",
        estimated_beneficiaries=60, created_by=coordinator.id,
    )
    t6 = ensure_task(
        organization_id=org1.id, community_id=harbour.id,
        title="Completed Water Distribution",
        description="Historical completed water drop used for impact history.",
        category="food", urgency_level=3,
        start_time=now - 5 * day, end_time=now - 5 * day + timedelta(hours=4),
        required_headcount=2, filled_headcount=2,
        lat=19.0765, lng=72.8780, status="completed",
        estimated_beneficiaries=50, created_by=coordinator.id,
    )

    def ensure_req(task, skill, level=3, cert=None, mandatory=True):
        q = db.query(models.TaskRequirement).filter(models.TaskRequirement.task_id == task.id)
        if skill:
            q = q.filter(models.TaskRequirement.skill_id == skill.id)
        if cert:
            q = q.filter(models.TaskRequirement.certification_type == cert)
        if q.first():
            return
        db.add(models.TaskRequirement(
            task_id=task.id, skill_id=skill.id if skill else None,
            certification_type=cert, minimum_level=level, mandatory_flag=mandatory,
        ))

    ensure_req(t1, food, 3)
    ensure_req(t2, first_aid, 3, cert="First Aid")
    ensure_req(t3, shelter, 3)
    ensure_req(t3, logistics, 2, mandatory=False)
    ensure_req(t4, teaching, 3)
    ensure_req(t5, logistics, 3)
    ensure_req(t6, food, 2)
    db.commit()

    # Partially fill food task and fully fill completed task.
    def ensure_assignment(task, volunteer, status="offered"):
        existing = db.query(models.Assignment).filter(
            models.Assignment.task_id == task.id,
            models.Assignment.volunteer_id == volunteer.id,
        ).first()
        if existing:
            return existing
        obj = models.Assignment(task_id=task.id, volunteer_id=volunteer.id, status=status)
        if status in ("accepted", "completed", "offered"):
            pass
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    a1 = ensure_assignment(t1, volunteers[0], "offered")
    a2 = ensure_assignment(t1, volunteers[7], "accepted")
    t1.filled_headcount = 2
    ensure_assignment(t6, volunteers[0], "completed")
    ensure_assignment(t6, volunteers[1], "completed")
    db.commit()

    if not t6.impact_records:
        db.add(models.ImpactRecord(
            task_id=t6.id, beneficiaries_served=48, response_time_minutes=35,
            service_completion_rate=0.96, underserved_area_flag=True, impact_score=82.4,
        ))
        db.commit()

    def ensure_campaign(**kwargs):
        obj = db.query(models.DonationCampaign).filter(
            models.DonationCampaign.title == kwargs["title"]
        ).first()
        if obj:
            return obj
        obj = models.DonationCampaign(**kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    c1 = ensure_campaign(
        organization_id=org1.id, title="Emergency Relief Fund",
        description="Food kits, drinking water and first-response supplies for harbour families.",
        category="food", target_amount=1000000, raised_amount=850000, currency="INR",
        beneficiary_count=400, location="Mumbai", lat=19.0760, lng=72.8777,
        status="active", start_date=date(2026, 9, 1), end_date=date(2026, 10, 15),
        impact_tiers=[
            {"amount": 500, "supports": "an emergency food kit for 1 family"},
            {"amount": 1000, "supports": "clean water for 5 households for a week"},
            {"amount": 5000, "supports": "a community kitchen shift feeding 50 people"},
        ],
    )
    c2 = ensure_campaign(
        organization_id=org2.id, title="Hillside Family Shelter Drive",
        description="Tents, tarpaulins and household kits for hillside households.",
        category="shelter", target_amount=600000, raised_amount=180000, currency="INR",
        beneficiary_count=120, location="Hillside Settlement", lat=19.1200, lng=72.9100,
        status="active", start_date=date(2026, 9, 10), end_date=date(2026, 11, 1),
        impact_tiers=[
            {"amount": 500, "supports": "bedding for 1 displaced family"},
            {"amount": 1000, "supports": "a waterproof shelter kit"},
            {"amount": 5000, "supports": "materials for 3 family tents"},
        ],
    )
    c3 = ensure_campaign(
        organization_id=org1.id, title="Riverside Learning Supplies",
        description="Books and learning kits for children in temporary housing.",
        category="education", target_amount=150000, raised_amount=150000, currency="INR",
        beneficiary_count=60, location="Riverside Ward", lat=19.0900, lng=72.8500,
        status="completed", start_date=date(2026, 8, 1), end_date=date(2026, 9, 10),
        impact_tiers=[
            {"amount": 500, "supports": "school supplies for 2 children"},
            {"amount": 1000, "supports": "a week of learning-circle materials"},
            {"amount": 5000, "supports": "a classroom kit for 25 students"},
        ],
    )

    if db.query(models.Donation).count() == 0:
        db.add_all([
            models.Donation(
                campaign_id=c1.id, donor_name="Neha Kapoor", donor_email="neha@example.com",
                amount=25000, currency="INR", payment_status="successful",
                transaction_reference="mock_seed_1", is_anonymous=False,
            ),
            models.Donation(
                campaign_id=c1.id, donor_name="Anonymous", donor_email=None,
                amount=5000, currency="INR", payment_status="successful",
                transaction_reference="mock_seed_2", is_anonymous=True,
            ),
            models.Donation(
                campaign_id=c2.id, donor_name="Vikram Joshi", donor_email="vikram@example.com",
                amount=10000, currency="INR", payment_status="successful",
                transaction_reference="mock_seed_3", is_anonymous=False,
            ),
        ])
        db.commit()

    if db.query(models.Notification).count() == 0:
        notification_service.create_notification(
            db, volunteers[0].user_id, "task_recommendation",
            {"title": "You have a new 92% matched opportunity", "body": "Emergency Food Distribution is a strong match.", "task_id": t1.id, "match_percentage": 92},
        )
        notification_service.create_notification(
            db, volunteers[0].user_id, "assignment_offered",
            {"title": "Assignment offered", "body": "You have been offered Emergency Food Distribution.", "task_id": t1.id, "assignment_id": a1.id},
        )
        notification_service.create_notification(
            db, volunteers[0].user_id, "certification_expiration",
            {"title": "Your First Aid certification expires soon", "body": "Renew before 5 Oct 2026 to stay eligible for medical desks."},
        )
        notification_service.create_notification(
            db, coordinator.id, "task_understaffed",
            {"title": "Task under-staffed", "body": "Emergency Food Distribution still needs 8 volunteers.", "task_id": t1.id},
        )
        notification_service.create_notification(
            db, coordinator.id, "new_donation",
            {"title": "New donation received", "body": "INR 25,000 added to Emergency Relief Fund.", "campaign_id": c1.id},
        )

    dispatch_smart_alerts(db)

    return {
        "message": "Demo data ready",
        "organizations": 3,
        "communities": 3,
        "volunteers": len(volunteers),
        "tasks": 6,
        "campaigns": 3,
        "coordinator_user_id": coordinator.id,
        "volunteer_user_id": volunteers[0].user_id,
        "volunteer_id": volunteers[0].id,
        "organization_id": org1.id,
        "task_id": t1.id,
    }
