# ServeSense — MVP

A volunteer-to-need matching and resource allocation platform for NGOs, communities, volunteers, and donors.

ServeSense combines explainable volunteer matching, local need intelligence, predictive volunteer-demand forecasting, NGO coordination, and donations into a single platform.

## Stack

- Backend: FastAPI + SQLAlchemy + SQLite
- Frontend: React + Vite + React Router
- Machine Learning: LightGBM + Scikit-learn + Pandas + NumPy
- Matching: Explainable weighted scoring + hard constraints
- Demand Prediction: LightGBM-based volunteer demand forecasting
- Auth: Demo role switcher (`X-User-Id`) — not production authentication
- API docs: FastAPI `/docs`

## Features

### Volunteer Dashboard

- Personalized volunteer recommendations
- Nearby tasks
- Skill and availability matching
- Assignment management
- Accept / decline assignments
- Availability management
- Volunteer impact tracking

### NGO Dashboard

- Task creation and management
- Volunteer recommendations
- Explainable matching scores
- Assignment management
- Volunteer gap identification
- Smart alerts
- Impact tracking

### Explainable Volunteer Matching

Volunteers are ranked using an explainable weighted scoring system based on:

- Skills
- Availability
- Distance
- Reliability
- Service-gap considerations

Mandatory certifications and other hard requirements are applied as constraints before ranking.

### Local Intelligence

ServeSense provides location-based intelligence to identify:

- Communities with higher levels of need
- Vulnerability levels
- Service gaps
- Open and urgent tasks
- Unfilled volunteer positions
- Available volunteer capacity
- Relief centers and organizations
- Volunteer-to-need gaps

The platform also provides a resource map showing communities, tasks, volunteers, organizations, and relief centers.

### Predictive Volunteer Intelligence

ServeSense uses a LightGBM machine-learning model to forecast volunteer demand for a region.

The prediction pipeline combines:

- Historical task volume over the last 7 days
- Historical task volume over the last 30 days
- Unfulfilled task ratio
- Disaster severity
- Event radius
- Population density
- Vulnerability index
- Weekend information
- Seasonal/month information

The model produces:

- Predicted number of volunteers required
- Demand classification:
  - `LOW`
  - `MODERATE`
  - `HIGH`
  - `CRITICAL`

Historical task metrics are retrieved from the database and combined with contextual inputs before inference.

### Donations

- Donation campaigns
- Campaign pages
- Mock payment provider
- No card numbers, CVVs, or bank credentials are collected or stored

### Notifications

- In-app notifications
- Email channel stubs
- SMS channel stubs
- Push notification channel stubs
- Smart alert infrastructure

### Attendance & Impact

- Volunteer attendance records
- Task completion tracking
- Beneficiary impact records
- Response-time tracking
- Service completion metrics

### Demo Data

The platform includes seed data for demonstrating:

- Volunteers
- NGOs
- Communities
- Tasks
- Assignments
- Donation campaigns
- Notifications
- Local intelligence

---

## Architecture

```text
                         ServeSense
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   Volunteer App        NGO Dashboard       Donation Portal
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                        FastAPI Backend
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
   Matching Engine     Local Intelligence    Notification
       │                     │                     │
       │                     ├── Need Scoring
       │                     ├── Gap Analysis
       │                     ├── Resource Map
       │                     └── Demand Prediction
       │                              │
       │                         LightGBM Model
       │                              │
       └──────────────────────────────┼──────────────
                                      │
                                SQLite Database
