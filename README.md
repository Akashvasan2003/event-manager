# GoPratle Requirement Posting Flow

A full-stack application where event organizers post what they need — an **event planner**, a **performer**, or **crew** — through a guided multi-step form. The form dynamically changes based on the selected category, validates input on both the client and server, and stores clean, category-specific documents in MongoDB.

## Overview

Posting an event requirement is different depending on what you need: a planner cares about budget and guest count, a performer cares about genre and duration, crew coordinators care about roles and shift hours. GoPratle handles this with a 4-step wizard whose Steps 2 and 3 are rendered from the category chosen in Step 1 — no irrelevant fields are ever shown, validated, or stored.

```
User → Next.js wizard → Express REST API → Mongoose → MongoDB
```

## Features

- 4-step wizard: Event Basics → Category Requirements → Details → Review & Submit
- One-day / multi-day date handling with range validation
- Dynamic category-driven steps (planner / performer / crew), with stale category data wiped on category change
- Per-category client-side and server-side validation
- Centralized Express error handling with meaningful JSON errors and proper HTTP codes (200/201/400/404/500)
- Loading, error, and success states; duplicate-submission guard
- Success screen showing event name, category, and MongoDB `_id`
- Responsive, accessible UI (labels, `aria-invalid`, `role="alert"`, keyboard-friendly)

## Tech Stack

**Frontend:** Next.js 15 (App Router), React 19, plain CSS (no UI library)
**Backend:** Node.js, Express 4, MongoDB, Mongoose 8
**Testing:** self-contained API smoke test (`mongodb-memory-server`)

## Architecture

```
User
 ↓
Next.js wizard (src/app, src/components)
 ↓  fetch (src/services/requirementApi.js)
Express REST API (src/routes → src/controllers)
 ↓  validation (src/validation) + coercion
Mongoose model (src/models/Requirement.js)
 ↓
MongoDB (requirements collection)
```

## Project Structure

```
GoPratle-Assignment/
├── frontend/
│   └── src/
│       ├── app/                 # Next.js app router (page.jsx owns wizard state)
│       ├── components/
│       │   ├── Fields.jsx       # reusable inputs (text/number/select/radio/checkbox)
│       │   ├── Stepper.jsx      # progress indicator
│       │   ├── SuccessScreen.jsx
│       │   ├── forms/           # 6 category-specific step components
│       │   │   ├── PlannerStepTwo.jsx / PlannerStepThree.jsx
│       │   │   ├── PerformerStepTwo.jsx / PerformerStepThree.jsx
│       │   │   └── CrewStepTwo.jsx / CrewStepThree.jsx
│       │   └── steps/           # step 1 + step 4 (review)
│       ├── services/requirementApi.js   # all fetch calls live here
│       └── styles/globals.css
└── backend/
    ├── src/
    │   ├── config/db.js
    │   ├── controllers/requirementController.js
    │   ├── models/Requirement.js
    │   ├── routes/requirementRoutes.js
    │   ├── validation/requirementValidation.js   # per-category rule tables
    │   ├── middleware/errorHandler.js
    │   ├── app.js
    │   └── server.js
    └── scripts/test-endpoints.js                 # API smoke test
```

## Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/gopratle-assignment.git
   cd gopratle-assignment
   ```
2. **Install backend dependencies**
   ```bash
   cd backend && npm install
   ```
3. **Install frontend dependencies**
   ```bash
   cd ../frontend && npm install
   ```
4. **Configure environment** (see below): copy `.env.example` → `.env` in `backend/`, and `.env.local.example` → `.env.local` in `frontend/`.
5. **Start MongoDB** — either a local `mongod` on port 27017, or paste an Atlas connection string into `MONGODB_URI`.
6. **Start the backend**
   ```bash
   cd backend && npm run dev     # http://localhost:5000
   ```
7. **Start the frontend**
   ```bash
   cd frontend && npm run dev    # http://localhost:3000
   ```

## Environment Variables

**backend/.env** (never committed — see `.env.example`):

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/gopratle` |
| `PORT` | API port | `5000` |
| `CLIENT_URL` | CORS allowlist for frontend origins (comma-separated) | `http://localhost:3000` |

**frontend/.env.local:**

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API | `http://localhost:5000` |

The MongoDB URI exists only in the backend environment — it is never sent to or read by the frontend.

## API Documentation

Base URL: `http://localhost:5000`

### POST /api/requirements

Creates a requirement.

```json
{
  "eventBasics": {
    "eventName": "Rohit–Ananya Wedding",
    "eventType": "Wedding",
    "dateMode": "range",
    "startDate": "2026-12-10",
    "endDate": "2026-12-12",
    "location": "Jaipur",
    "venue": "Rambagh Palace",
    "category": "planner"
  },
  "categoryDetails": {
    "planningScope": "full",
    "guestCount": 300,
    "budgetMin": 500000,
    "budgetMax": 1500000,
    "servicesRequired": ["venue-sourcing", "decor"],
    "planningTimeline": "3-6-months",
    "coordinatorsNeeded": 2,
    "vendorCoordination": true,
    "onSiteCoordination": true
  },
  "additionalNotes": "Prefer venues with in-house catering."
}
```

**201 Response:**
```json
{
  "success": true,
  "message": "Requirement submitted successfully",
  "data": { "_id": "65f...", "eventBasics": { ... }, "categoryDetails": { ... }, "createdAt": "..." }
}
```

**400 Response (validation failure):**
```json
{ "success": false, "message": "Validation failed", "errors": ["Location is required.", "Select at least one planning services required."] }
```

### GET /api/requirements

Returns the 100 most recent requirements. Optional filter: `?category=planner|performer|crew`.

```json
{ "success": true, "count": 2, "data": [ ... ] }
```

### GET /api/requirements/:id

Returns one requirement, `404` if missing, `400` if the id is malformed.

## Validation

**Frontend** (per step, inline): required fields, event-name minimum length, date order (end ≥ start, end required for multi-day), category-specific required fields (scope, guest count, budget, services, roles, durations, etc.). Errors appear next to fields with `role="alert"`; navigation is blocked until the step is valid.

**Backend** (mandatory — the server never trusts the client): `backend/src/validation/requirementValidation.js` holds one rule table per category (`PLANNER_RULES`, `PERFORMER_RULES`, `CREW_RULES`) describing each field's type (`str`/`num`/`oneOf`/`multi`/`bool`), label, bounds, and required-ness. Only the table matching the submitted `category` is applied — cross-category data is dropped by the controller's coercion step and rejected if required fields are missing. Mongoose schema constraints (`required`, `enum`, dates) act as a final backstop.

## Category Logic

Step 1 stores `category` as `planner` / `performer` / `crew`. `page.jsx` maps each category to its own Step 2 and Step 3 components, so the fields shown (validated, and stored) always match the category:

| | Step 2 | Step 3 |
|---|---|---|
| **planner** | scope, guests, budget range, services, theme, special requirements | timeline, coordinators, vendor/on-site coordination |
| **performer** | performance type, genre, count, duration, budget, requirements | sound/lighting/stage/travel/accommodation, special requests |
| **crew** | roles, count, experience, working hours, rate, responsibilities | equipment, setup/breakdown/travel, technical requirements |

Changing the category in Step 1 resets `categoryDetails`, so data from one category can never be submitted under another. The Step 4 preview renders sections conditionally from the same data, with Edit buttons back to Step 1/2.

## Testing

```bash
cd backend
node scripts/test-endpoints.js
```

Boots an **in-memory MongoDB**, starts the real Express app on a random port, and exercises the full request cycle — 11 automated checks covering: health, valid planner/crew submissions (with string→number/boolean coercion), invalid payloads (400 with messages), cross-category field rejection, invalid category, category-filtered listing, get-by-id, unknown-id 404, and malformed JSON. The frontend is verified with `npm run build` (compile + lint) and manual browser flows for each category, error states, and mobile widths.

## Deployment

**Frontend → Vercel**
1. Push the repo to GitHub, then import it in Vercel (root: `frontend`).
2. Set env var `NEXT_PUBLIC_API_URL` to the deployed backend URL (e.g. `https://gopratle-api.onrender.com`).
3. Deploy.

**Backend → Render / Railway / Fly.io** (any Node host)
1. Create a Web Service from the repo (root: `backend`), start command `npm start`.
2. Set env vars `MONGODB_URI`, `CLIENT_URL` (the Vercel URL), and `PORT`.
3. Deploy.

**MongoDB → Atlas**: create a free cluster, add a database user, allow the backend host's network access, and paste the SRV string into `MONGODB_URI`.

The deployed frontend must call the deployed backend (both env vars point at production URLs), and `CLIENT_URL` must match the Vercel domain exactly or CORS will reject requests.

## Limitations

- No authentication — anyone with the URL can post or list requirements.
- No draft saving; a page refresh clears the form.
- Server validation errors show as a banner rather than mapped to individual fields.
- `categoryDetails` is schema-less (`Mixed`) on the backend — field-level typo protection there is weaker than typed sub-schemas.
- No pagination on the listing endpoint (capped at 100).

## Future Improvements

- Authentication and per-user requirement ownership
- Draft autosave (localStorage or server-side)
- Admin dashboard to triage requirements by category/status
- File uploads (event briefs, rider documents)
- Location autocomplete (Google Places)
- Email/WhatsApp notifications when requirements are posted
- Search and filtering on the listing endpoint
