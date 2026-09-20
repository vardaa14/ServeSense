from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str = "volunteer"


class OrganizationCreate(BaseModel):
    name: str
    type: Optional[str] = "NGO"
    address: Optional[str] = None
    description: Optional[str] = None
    verified: bool = True
    lat: Optional[float] = None
    lng: Optional[float] = None


class CommunityCreate(BaseModel):
    name: str
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    vulnerability_score: float = 0.5
    population_estimate: Optional[int] = None
    last_service_gap_score: float = 0.5


class VolunteerCreate(BaseModel):
    user_id: str
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None
    max_travel_km: int = 20
    reliability_score: float = Field(0.5, ge=0, le=1)
    cause_preferences: List[str] = []
    languages: List[str] = []
    transport_mode: Optional[str] = None


class VolunteerProfileUpdate(BaseModel):
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None
    max_travel_km: Optional[int] = None
    cause_preferences: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    transport_mode: Optional[str] = None


class SkillCreate(BaseModel):
    name: str
    category: Optional[str] = None


class VolunteerSkillCreate(BaseModel):
    volunteer_id: str
    skill_id: str
    proficiency_level: int = Field(3, ge=1, le=5)
    verified_flag: bool = False


class AvailabilityCreate(BaseModel):
    volunteer_id: str
    start_time: datetime
    end_time: datetime
    recurrence_rule: Optional[str] = None
    status: str = "open"


class AvailabilityUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    recurrence_rule: Optional[str] = None


class TaskRequirementInput(BaseModel):
    skill_id: Optional[str] = None
    certification_type: Optional[str] = None
    minimum_level: int = 1
    mandatory_flag: bool = True


class TaskCreate(BaseModel):
    organization_id: str
    community_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    urgency_level: int = Field(3, ge=1, le=5)
    start_time: datetime
    end_time: datetime
    required_headcount: int = Field(1, ge=1)
    lat: Optional[float] = None
    lng: Optional[float] = None
    estimated_beneficiaries: Optional[int] = None
    created_by: Optional[str] = None
    requirements: List[TaskRequirementInput] = []


class TaskRequirementCreate(BaseModel):
    task_id: str
    skill_id: Optional[str] = None
    certification_type: Optional[str] = None
    minimum_level: int = 1
    mandatory_flag: bool = True


class AssignmentCreate(BaseModel):
    task_id: str
    volunteer_id: str
    recommendation_id: Optional[str] = None
    final_role: Optional[str] = None


class AssignmentRespond(BaseModel):
    volunteer_id: Optional[str] = None


class AttendanceCreate(BaseModel):
    assignment_id: str
    attendance_status: str
    coordinator_note: Optional[str] = None


class ImpactCreate(BaseModel):
    task_id: str
    beneficiaries_served: int = 0
    response_time_minutes: int = 0
    service_completion_rate: float = 0
    underserved_area_flag: bool = False
    impact_score: Optional[float] = None


class DonationCampaignCreate(BaseModel):
    organization_id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    target_amount: float = Field(..., gt=0)
    currency: str = "INR"
    beneficiary_count: Optional[int] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: str = "active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    impact_tiers: List[Dict[str, Any]] = []


class DonationCreate(BaseModel):
    campaign_id: str
    donor_name: Optional[str] = None
    donor_email: Optional[EmailStr] = None
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    is_anonymous: bool = False


class DonationComplete(BaseModel):
    success: bool = True


class NotificationCreate(BaseModel):
    user_id: str
    channel: str = "in_app"
    template_key: str
    payload: Dict[str, Any] = {}


class MarkAllRead(BaseModel):
    user_id: str
