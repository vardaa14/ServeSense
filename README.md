# ServeSense — MVP

A volunteer-to-need matching platform for NGOs, communities, and donors.

## Stack
- Backend: FastAPI + SQLAlchemy + SQLite
- Frontend: React + Vite + React Router
- Matching: explainable weighted scoring + hard constraints
- Auth: demo role switcher (`X-User-Id`) — not production authentication
- API docs: FastAPI `/docs`

## Features
- Volunteer dashboard with recommendations, nearby tasks, assignments, availability, and impact
- NGO dashboard with task creation, volunteer matching, assignments, alerts, and impact
- Explainable matching (skills, availability, distance, reliability)
- Assignments with accept / decline
- Attendance and impact records
- Donation campaigns with mock payments
- Local intelligence (need score, volunteer gaps, resource map)
- In-app notifications, with email / SMS / push channel stubs
- Demo seed data

## Run

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173`.

API: `http://127.0.0.1:8000`  
Swagger: `http://127.0.0.1:8000/docs`

## Demo data
```bash
curl -X POST http://127.0.0.1:8000/demo/seed
```

Then use the navbar role switcher:
- **Maya Volunteer** — volunteer dashboard
- **Aarav Coordinator** — NGO dashboard
- **Public / donor** — donation portal

## Main routes
- `/` public landing
- `/volunteer/dashboard`
- `/ngo/dashboard`
- `/donations`
- `/campaign/:id`
- `/ngo/:id`
- `/intelligence`
- `/notifications`

## Matching
Score = `0.40 skill + 0.25 availability + 0.20 distance + 0.15 reliability`, with a small service-gap adjustment. Mandatory certifications remain hard filters.

## Local need score
Need = `0.35 vulnerability + 0.30 service gap + 0.20 urgency + 0.15 unfilled demand` (all 0–1).

## Payments
MVP uses `PaymentService` with a mock provider. No card numbers, CVVs, or bank credentials are collected or stored.

## Tests
```bash
cd backend
source .venv/bin/activate
python -m pytest tests/test_platform.py -q
```
`pytest` is optional; the same checks can be run with the FastAPI `TestClient`.
