# ServeSense

> **Match people to needs when it matters.**

ServeSense is a need-based volunteer resource allocation platform
designed to connect volunteers with NGOs and community organizations
during disasters, emergencies, and other situations where coordinated
human resources are required.

The platform converts an organization's requirements into structured
tasks and uses an explainable matching engine to recommend suitable
volunteers based on skills, availability, distance, reliability, and
service-gap considerations.

------------------------------------------------------------------------

## 1. Problem Statement

During natural disasters and social emergencies, NGOs and relief
organizations often need volunteers quickly. At the same time, many
people are willing to help but do not know:

-   Where help is needed
-   Which organizations need volunteers
-   What skills are required
-   Whether they are suitable for a particular task
-   When and where they should report

Organizations may also struggle to manually identify and coordinate the
right volunteers.

ServeSense addresses this coordination problem by creating a centralized
system where:

**Organizations create needs → the platform understands requirements →
volunteers are matched → assignments are tracked → impact is measured.**

------------------------------------------------------------------------

## 2. Proposed Solution

ServeSense provides two sides of the platform:

### For organizations / NGOs

Organizations can:

-   Create an organization profile
-   Define communities they serve
-   Create volunteer tasks
-   Specify required skills
-   Specify mandatory certifications
-   Set urgency and required headcount
-   View recommended volunteers
-   Assign volunteers
-   Track attendance
-   Record impact

### For volunteers

Volunteers can:

-   Create a profile
-   Specify skills
-   Specify skill proficiency
-   Add languages
-   Add causes they prefer
-   Specify transport mode
-   Set maximum travel distance
-   Provide availability
-   Maintain reliability information
-   Add certifications

The matching engine then produces ranked and explainable
recommendations.

------------------------------------------------------------------------

## 3. Core Workflow

``` text
                    ┌─────────────────────┐
                    │   NGO / Organization│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Create a Task / Need│
                    │ • Location          │
                    │ • Time              │
                    │ • Skills            │
                    │ • Urgency            │
                    │ • Headcount          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Matching Engine      │
                    │                     │
                    │ Skill Match         │
                    │ Availability        │
                    │ Distance            │
                    │ Reliability         │
                    │ Fairness            │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Ranked Volunteers    │
                    │ + Explanation        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Volunteer Assignment │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Attendance Tracking  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Impact Measurement   │
                    └─────────────────────┘
```

------------------------------------------------------------------------

# 4. Technology Stack

## Backend

-   Python
-   FastAPI
-   SQLAlchemy
-   SQLite
-   Pydantic
-   Uvicorn

## Frontend

-   React
-   Vite
-   JavaScript
-   CSS

## Matching / Intelligence

-   Rule-based weighted scoring
-   Haversine distance calculation
-   Constraint filtering
-   Explainable recommendation generation

------------------------------------------------------------------------

# 5. System Architecture

``` text
┌─────────────────────────────────────────────────────┐
│                    ServeSense                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  React Frontend                                     │
│       │                                             │
│       │ REST API                                    │
│       ▼                                             │
│  FastAPI Backend                                    │
│       │                                             │
│       ├──────────────► Task Management              │
│       │                                             │
│       ├──────────────► Volunteer Management         │
│       │                                             │
│       ├──────────────► Organization Management      │
│       │                                             │
│       ├──────────────► Matching Engine              │
│       │                                             │
│       ├──────────────► Assignment Management        │
│       │                                             │
│       ├──────────────► Attendance & Impact          │
│       │                                             │
│       ▼                                             │
│  SQLAlchemy ORM                                     │
│       │                                             │
│       ▼                                             │
│  SQLite Database                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 6. Database Design

The database is organized around volunteers, organizations, tasks,
matching, assignments, and impact.

## Main entities

### User

Stores basic user information.

Important fields:

-   `id`
-   `email`
-   `full_name`
-   `phone`
-   `role`
-   `status`

Roles include:

-   volunteer
-   coordinator
-   admin

------------------------------------------------------------------------

### Organization

Represents an NGO, nonprofit, or community organization.

Important fields:

-   `name`
-   `type`
-   `address`
-   `lat`
-   `lng`

------------------------------------------------------------------------

### OrganizationMember

Connects users to organizations.

Possible member roles:

-   coordinator
-   org_admin
-   viewer

------------------------------------------------------------------------

### Volunteer

Stores volunteer-specific information.

Important fields:

-   home location
-   maximum travel distance
-   reliability score
-   cause preferences
-   languages
-   transport mode
-   background-check status
-   active status

------------------------------------------------------------------------

### Skill

Stores available skills.

Examples:

-   Food Distribution
-   First Aid
-   Teaching
-   Logistics
-   Medical Assistance

------------------------------------------------------------------------

### VolunteerSkill

Creates the many-to-many relationship between volunteers and skills.

Each skill can have:

``` text
Proficiency level: 1–5
Verified: true / false
```

------------------------------------------------------------------------

### Certification

Stores volunteer certifications.

Examples:

-   CPR
-   First Aid
-   Food Handling

Certifications can have:

-   issuer
-   expiration date
-   document URL
-   verification status

------------------------------------------------------------------------

### AvailabilitySlot

Stores when a volunteer is available.

``` text
start_time
end_time
status
recurrence_rule
```

------------------------------------------------------------------------

### Community

Represents the community or geographical area receiving support.

Important fields include:

-   location
-   vulnerability score
-   population estimate
-   service-gap score

------------------------------------------------------------------------

### Task

A task represents a specific need created by an organization.

Examples:

-   Emergency food distribution
-   Medical assistance
-   Donation collection
-   Community outreach
-   Disaster relief

Important fields:

-   title
-   description
-   category
-   urgency
-   start/end time
-   required headcount
-   location
-   estimated beneficiaries
-   status

------------------------------------------------------------------------

### TaskRequirement

Defines what a task requires.

A requirement can specify:

-   skill
-   minimum proficiency
-   certification
-   whether it is mandatory

------------------------------------------------------------------------

### AssignmentRecommendation

Stores the output of the matching engine.

It records:

-   total score
-   skill score
-   availability score
-   distance score
-   reliability score
-   fairness adjustment
-   no-show risk
-   explanation
-   rank

This makes the recommendation process auditable and explainable.

------------------------------------------------------------------------

### Assignment

Represents the actual assignment of a volunteer to a task.

Possible statuses:

-   offered
-   accepted
-   declined
-   canceled
-   completed
-   no_show

------------------------------------------------------------------------

### AttendanceRecord

Tracks whether the volunteer attended.

Possible attendance statuses:

-   attended
-   late
-   partial
-   absent

------------------------------------------------------------------------

### ImpactRecord

Measures the result of a completed task.

Metrics include:

-   beneficiaries served
-   response time
-   service completion rate
-   underserved-area flag
-   impact score

------------------------------------------------------------------------

### Notification

Stores notification information.

Supported channels in the model include:

-   email
-   SMS
-   push
-   in-app

------------------------------------------------------------------------

### AuditLog

Records important system actions.

Examples:

-   create
-   update
-   assign
-   override

------------------------------------------------------------------------

# 7. Matching Algorithm

The core intelligence of the MVP is an explainable volunteer
recommendation engine.

A volunteer first passes through eligibility checks.

## Step 1 --- Certification filtering

If a task requires a mandatory certification, volunteers without a valid
verified certification are excluded.

------------------------------------------------------------------------

## Step 2 --- Skill matching

The engine checks whether the volunteer possesses the skills required by
the task.

For mandatory skills, failure to satisfy the requirement makes the
volunteer ineligible.

------------------------------------------------------------------------

## Step 3 --- Availability matching

The volunteer must have an availability slot covering the entire task
duration.

Example:

``` text
Task:
10:00 AM → 2:00 PM

Volunteer:
09:00 AM → 4:00 PM

Availability = 100%
```

------------------------------------------------------------------------

## Step 4 --- Distance calculation

The system calculates geographical distance using the Haversine formula.

Conceptually:

``` text
Volunteer location
        ↓
Haversine distance
        ↓
Distance in kilometres
        ↓
Distance score
```

The score decreases as the distance approaches the volunteer's maximum
travel radius.

------------------------------------------------------------------------

## Step 5 --- Reliability

Each volunteer has a reliability score between 0 and 1.

For example:

``` text
0.90 = 90% reliability
0.65 = 65% reliability
```

This can later be calculated from historical attendance, cancellations,
and completed assignments.

------------------------------------------------------------------------

## Step 6 --- Fairness / service-gap adjustment

If a task belongs to a community with a high service gap, the current
MVP applies a small adjustment to the recommendation score.

This is intended to prevent resource allocation from focusing only on
already well-served areas.

------------------------------------------------------------------------

# 8. Match Score

The MVP uses the following weighted formula:

``` text
Match Score =

    0.40 × Skill Score
  + 0.25 × Availability Score
  + 0.20 × Distance Score
  + 0.15 × Reliability Score
  + Fairness Adjustment
```

The result is constrained to a maximum of `1.0`.

The individual components are retained so that the system can explain
the recommendation instead of only showing a final number.

------------------------------------------------------------------------

# 9. Explainability

Instead of simply saying:

``` text
Volunteer A = 92%
```

ServeSense can explain:

``` text
Skill match: 100%
Availability: 100%
Distance: 2.1 km
Reliability: 92%
Small service-gap adjustment applied
```

This is useful for NGO coordinators because they can understand why a
volunteer was recommended.

------------------------------------------------------------------------

# 10. Backend API

The FastAPI backend exposes endpoints for the major platform functions.

## General

``` http
GET /
GET /health
```

## Users

``` http
POST /users
GET /users
```

## Organizations

``` http
POST /organizations
GET /organizations
```

## Communities

``` http
POST /communities
GET /communities
```

## Skills

``` http
POST /skills
GET /skills
```

## Volunteers

``` http
POST /volunteers
GET /volunteers
POST /volunteer-skills
POST /availability
```

## Tasks

``` http
POST /tasks
GET /tasks
GET /tasks/{task_id}
POST /task-requirements
```

## Matching

Generate recommendations:

``` http
POST /tasks/{task_id}/recommendations
```

Retrieve recommendations:

``` http
GET /tasks/{task_id}/recommendations
```

## Assignments

``` http
POST /assignments
```

## Attendance

``` http
POST /attendance
```

## Impact

``` http
POST /impact
```

## Dashboard

``` http
GET /dashboard
```

## Demo

``` http
POST /demo/seed
```

------------------------------------------------------------------------

# 11. Frontend

The frontend provides a lightweight operational dashboard.

The current MVP includes:

### Dashboard statistics

-   Number of volunteers
-   Number of organizations
-   Open tasks
-   Assignments
-   Beneficiaries served

### Open needs

Displays available tasks with:

-   task title
-   description
-   category
-   urgency

### Volunteer matching

The coordinator can select:

**Find Volunteers**

and receive ranked recommendations.

Each recommendation displays:

-   overall match percentage
-   skill score
-   availability score
-   distance score
-   reliability score
-   explanation

------------------------------------------------------------------------

# 12. Installation

## Requirements

Install:

-   Python 3.10+
-   Node.js 18+

------------------------------------------------------------------------

## Backend setup

``` bash
cd backend

python -m venv .venv
```

### macOS / Linux

``` bash
source .venv/bin/activate
```

### Windows

``` powershell
.venv\Scripts\activate
```

Install dependencies:

``` bash
pip install -r requirements.txt
```

Start the API:

``` bash
uvicorn app.main:app --reload
```

The backend will be available at:

``` text
http://127.0.0.1:8000
```

Interactive API documentation:

``` text
http://127.0.0.1:8000/docs
```

------------------------------------------------------------------------

# 13. Frontend Setup

Open another terminal:

``` bash
cd frontend
npm install
npm run dev
```

Vite will provide a local development URL, normally:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# 14. Demo Data

After starting the backend:

``` bash
curl -X POST http://127.0.0.1:8000/demo/seed
```

The demo creates:

-   1 organization
-   1 community
-   2 volunteers
-   multiple skills
-   volunteer availability
-   an emergency food-distribution task
-   a mandatory skill requirement

The frontend can then generate recommendations for the task.

------------------------------------------------------------------------

# 15. Example Use Case

Consider an emergency food-distribution task.

### Organization requirement

``` text
Task:
Emergency Food Distribution

Location:
Mumbai

Urgency:
5/5

Required volunteers:
2

Required skill:
Food Distribution — Level 3+

Duration:
10:00 AM – 2:00 PM
```

### Volunteer A

``` text
Food Distribution: Level 5
Availability: 9 AM – 4 PM
Distance: 2 km
Reliability: 92%
```

### Volunteer B

``` text
Food Distribution: Level 3
Availability: 10 AM – 2 PM
Distance: 8 km
Reliability: 72%
```

The matching engine evaluates these attributes and produces an
explainable ranking.

The coordinator can then assign suitable volunteers.

------------------------------------------------------------------------

# 16. Impact Measurement

After completing a task, the organization can record:

``` text
Beneficiaries served
Response time
Service completion rate
Underserved-area flag
```

An impact score can then be generated.

The current MVP uses:

``` text
Impact Score =

    50% × Completion
  + 30% × Beneficiary Component
  + 20% × Response-Time Component
```

The score is stored with the task's impact record.

------------------------------------------------------------------------

# 17. Future AI / ML Layer

The current matching engine is intentionally explainable and
deterministic.

For a hackathon or future production version, the system can be extended
with machine learning.

Potential models include:

### Volunteer no-show prediction

Predict the probability that a volunteer will fail to attend.

Possible features:

-   historical attendance
-   cancellation frequency
-   distance
-   task timing
-   previous assignment completion
-   response time

Possible models:

-   Logistic Regression
-   Random Forest
-   XGBoost / LightGBM

------------------------------------------------------------------------

### Demand prediction

Predict where and when volunteer demand will increase.

Potential inputs:

-   historical tasks
-   disaster/event information
-   population
-   vulnerability
-   previous service gaps
-   time of year

------------------------------------------------------------------------

### Intelligent volunteer-task matching

A future model could learn from successful historical assignments and
predict compatibility between:

``` text
Volunteer Profile
        +
Task Profile
        ↓
Compatibility Probability
```

The deterministic scoring layer can remain as a safety and
explainability layer.

------------------------------------------------------------------------

# 18. Potential Future Features

## Volunteer side

-   Volunteer dashboard
-   Mobile-friendly interface
-   Real-time task notifications
-   Accept / reject assignments
-   Digital volunteer ID
-   Volunteer history
-   Certificates
-   Gamification
-   Reputation system

## NGO side

-   NGO verification
-   Task management
-   Volunteer management
-   Bulk volunteer assignment
-   Emergency broadcast
-   Analytics dashboard
-   Resource tracking

## Location intelligence

-   Interactive map
-   Nearby tasks
-   Volunteer heatmap
-   Community vulnerability map
-   Route estimation

## Notifications

-   Email
-   SMS
-   WhatsApp
-   Push notifications

## Donations

The platform can later include a donation portal allowing donors to
contribute money or resources to verified organizations and active
relief efforts.

------------------------------------------------------------------------

# 19. Security Considerations

For production deployment, the MVP should be extended with:

-   Secure authentication
-   Password hashing
-   JWT/session management
-   Role-based access control
-   NGO verification
-   Input validation
-   Rate limiting
-   HTTPS
-   Secure file uploads
-   Audit logging
-   Encryption of sensitive information
-   Database backups

The current demo authentication is intentionally minimal and should not
be treated as production authentication.

------------------------------------------------------------------------

# 20. Production Architecture

A future production deployment could look like:

``` text
                    Users
                      │
                      ▼
               React / Next.js
                      │
                      ▼
                API Gateway
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    FastAPI Services        Authentication
          │
          ├───────────────┐
          ▼               ▼
     PostgreSQL       Redis / Queue
          │               │
          ▼               ▼
      Matching       Notifications
       Engine
          │
          ▼
     ML Services
          │
          ▼
    Analytics / BI
```

------------------------------------------------------------------------

# 21. Project Structure

``` text
ServeSense/
│
├── README.md
│
├── backend/
│   ├── requirements.txt
│   │
│   └── app/
│       ├── __init__.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── matching.py
│       └── main.py
│
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    │
    └── src/
        ├── main.jsx
        └── styles.css
```

------------------------------------------------------------------------

# 22. Why ServeSense?

ServeSense focuses on a key problem in disaster and community response:

> **The problem is not always a lack of people willing to help. It is
> often a lack of coordination between available people and the needs
> that exist.**

The platform creates a structured bridge between:

``` text
People willing to help
          ↓
      ServeSense
          ↓
Organizations
          ↓
Specific community needs
```

The matching engine makes this process more systematic, while
explainability allows coordinators to understand the reasoning behind
recommendations.

------------------------------------------------------------------------

# 23. Current MVP vs Future Version

  Capability                    Current MVP   Future
  --------------------------- ------------- --------
  Volunteer profiles                     ✅ 
  NGO profiles                           ✅ 
  Community records                      ✅ 
  Skills                                 ✅ 
  Certifications                         ✅ 
  Availability                           ✅ 
  Task creation                          ✅ 
  Explainable matching                   ✅ 
  Distance matching                      ✅ 
  Reliability score                      ✅ 
  Assignments                            ✅ 
  Attendance                             ✅ 
  Impact tracking                        ✅ 
  Dashboard                              ✅ 
  Production authentication                       🔜
  Real-time notifications                         🔜
  Maps                                            🔜
  Donations                                       🔜
  ML prediction                                   🔜
  Demand forecasting                              🔜
  Mobile app                                      🔜
  Cloud deployment                                🔜

------------------------------------------------------------------------

# 24. License

This project can be adapted for educational, hackathon, research, and
prototype purposes.
