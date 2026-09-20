from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    Text, ForeignKey, JSON, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255))
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    role = Column(String(20), default="volunteer")
    status = Column(String(20), default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    volunteer = relationship("Volunteer", back_populates="user", uselist=False)
    organization_memberships = relationship("OrganizationMember", back_populates="user")
    created_tasks = relationship("Task", back_populates="creator")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="actor")

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(100))
    address = Column(Text)
    lat = Column(Numeric(10, 7))
    lng = Column(Numeric(10, 7))
    created_at = Column(DateTime, server_default=func.now())

    description = Column(Text)
    verified = Column(Boolean, default=True)
    members = relationship("OrganizationMember", back_populates="organization")
    tasks = relationship("Task", back_populates="organization")
    donation_campaigns = relationship("DonationCampaign", back_populates="organization")

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    member_role = Column(String(20), default="coordinator")
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="organization_memberships")

class Volunteer(Base):
    __tablename__ = "volunteers"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    home_lat = Column(Numeric(10, 7))
    home_lng = Column(Numeric(10, 7))
    max_travel_km = Column(Integer, default=20)
    reliability_score = Column(Numeric(3, 2), default=0.50)
    cause_preferences = Column(JSON, default=list)
    languages = Column(JSON, default=list)
    transport_mode = Column(String(50))
    background_check_status = Column(String(20), default="pending")
    active_flag = Column(Boolean, default=True)

    user = relationship("User", back_populates="volunteer")
    skills = relationship("VolunteerSkill", back_populates="volunteer")
    certifications = relationship("Certification", back_populates="volunteer")
    availability_slots = relationship("AvailabilitySlot", back_populates="volunteer")
    recommendations = relationship("AssignmentRecommendation", back_populates="volunteer")
    assignments = relationship("Assignment", back_populates="volunteer")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(100))
    volunteer_skills = relationship("VolunteerSkill", back_populates="skill")
    task_requirements = relationship("TaskRequirement", back_populates="skill")

class VolunteerSkill(Base):
    __tablename__ = "volunteer_skills"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    volunteer_id = Column(String(36), ForeignKey("volunteers.id"), nullable=False)
    skill_id = Column(String(36), ForeignKey("skills.id"), nullable=False)
    proficiency_level = Column(Integer, default=3)
    verified_flag = Column(Boolean, default=False)
    volunteer = relationship("Volunteer", back_populates="skills")
    skill = relationship("Skill", back_populates="volunteer_skills")

class Certification(Base):
    __tablename__ = "certifications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    volunteer_id = Column(String(36), ForeignKey("volunteers.id"), nullable=False)
    cert_type = Column(String(100), nullable=False)
    issuer = Column(String(255))
    expires_at = Column(Date)
    document_url = Column(Text)
    verification_status = Column(String(20), default="pending")
    volunteer = relationship("Volunteer", back_populates="certifications")

class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    volunteer_id = Column(String(36), ForeignKey("volunteers.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    recurrence_rule = Column(String(255))
    status = Column(String(20), default="open")
    volunteer = relationship("Volunteer", back_populates="availability_slots")

class Community(Base):
    __tablename__ = "communities"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    city = Column(String(255))
    lat = Column(Numeric(10, 7))
    lng = Column(Numeric(10, 7))
    vulnerability_score = Column(Numeric(3, 2), default=0.50)
    population_estimate = Column(Integer)
    last_service_gap_score = Column(Numeric(3, 2), default=0.50)
    tasks = relationship("Task", back_populates="community")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    community_id = Column(String(36), ForeignKey("communities.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    urgency_level = Column(Integer, default=3)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    required_headcount = Column(Integer, default=1)
    filled_headcount = Column(Integer, default=0)
    lat = Column(Numeric(10, 7))
    lng = Column(Numeric(10, 7))
    status = Column(String(30), default="open")
    estimated_beneficiaries = Column(Integer)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="tasks")
    community = relationship("Community", back_populates="tasks")
    creator = relationship("User", back_populates="created_tasks")
    requirements = relationship("TaskRequirement", back_populates="task")
    recommendations = relationship("AssignmentRecommendation", back_populates="task")
    assignments = relationship("Assignment", back_populates="task")
    impact_records = relationship("ImpactRecord", back_populates="task")

class TaskRequirement(Base):
    __tablename__ = "task_requirements"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    skill_id = Column(String(36), ForeignKey("skills.id"))
    certification_type = Column(String(100))
    minimum_level = Column(Integer, default=1)
    mandatory_flag = Column(Boolean, default=True)
    task = relationship("Task", back_populates="requirements")
    skill = relationship("Skill", back_populates="task_requirements")

class AssignmentRecommendation(Base):
    __tablename__ = "assignment_recommendations"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    volunteer_id = Column(String(36), ForeignKey("volunteers.id"), nullable=False)
    total_score = Column(Numeric(5, 3))
    skill_score = Column(Numeric(5, 3))
    availability_score = Column(Numeric(5, 3))
    distance_score = Column(Numeric(5, 3))
    reliability_score = Column(Numeric(5, 3))
    fairness_adjustment = Column(Numeric(5, 3), default=0)
    no_show_risk = Column(Numeric(4, 3))
    explainability_json = Column(JSON)
    generated_at = Column(DateTime, server_default=func.now())
    rank_position = Column(Integer)
    task = relationship("Task", back_populates="recommendations")
    volunteer = relationship("Volunteer", back_populates="recommendations")
    assignments = relationship("Assignment", back_populates="recommendation")

class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    volunteer_id = Column(String(36), ForeignKey("volunteers.id"), nullable=False)
    recommendation_id = Column(String(36), ForeignKey("assignment_recommendations.id"))
    status = Column(String(30), default="offered")
    assigned_at = Column(DateTime, server_default=func.now())
    responded_at = Column(DateTime)
    backup_order = Column(Integer)
    final_role = Column(String(100))
    task = relationship("Task", back_populates="assignments")
    volunteer = relationship("Volunteer", back_populates="assignments")
    recommendation = relationship("AssignmentRecommendation", back_populates="assignments")
    attendance = relationship("AttendanceRecord", back_populates="assignment", uselist=False)

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), unique=True, nullable=False)
    check_in_time = Column(DateTime)
    check_out_time = Column(DateTime)
    attendance_status = Column(String(20))
    coordinator_note = Column(Text)
    assignment = relationship("Assignment", back_populates="attendance")

class ImpactRecord(Base):
    __tablename__ = "impact_records"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    beneficiaries_served = Column(Integer)
    response_time_minutes = Column(Integer)
    service_completion_rate = Column(Numeric(4, 3))
    underserved_area_flag = Column(Boolean, default=False)
    impact_score = Column(Numeric(5, 2))
    recorded_at = Column(DateTime, server_default=func.now())
    task = relationship("Task", back_populates="impact_records")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    channel = Column(String(20))
    template_key = Column(String(100))
    payload_json = Column(JSON)
    delivery_status = Column(String(20), default="queued")
    read_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_user_id = Column(String(36), ForeignKey("users.id"))
    entity_type = Column(String(100))
    entity_id = Column(String(36))
    action = Column(String(100))
    change_summary = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    actor = relationship("User", back_populates="audit_logs")


class DonationCampaign(Base):
    __tablename__ = "donation_campaigns"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    target_amount = Column(Numeric(12, 2), default=0)
    raised_amount = Column(Numeric(12, 2), default=0)
    currency = Column(String(10), default="INR")
    beneficiary_count = Column(Integer)
    location = Column(String(255))
    lat = Column(Numeric(10, 7))
    lng = Column(Numeric(10, 7))
    status = Column(String(20), default="active")
    start_date = Column(Date)
    end_date = Column(Date)
    impact_tiers = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="donation_campaigns")
    donations = relationship("Donation", back_populates="campaign")


class Donation(Base):
    __tablename__ = "donations"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    campaign_id = Column(String(36), ForeignKey("donation_campaigns.id"), nullable=False)
    donor_name = Column(String(255))
    donor_email = Column(String(255))
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR")
    payment_status = Column(String(20), default="pending")
    transaction_reference = Column(String(255))
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    campaign = relationship("DonationCampaign", back_populates="donations")
