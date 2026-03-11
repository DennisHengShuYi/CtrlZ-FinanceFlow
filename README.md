## Quick Terminal Commands (Backend + Frontend + AHTN)

Run these from project root:

### 1) Backend setup (first time)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Frontend setup (first time)
```bash
cd frontend
npm install
```

### 3) Build AHTN vector database (one-time / when AHTN data changes)
```bash
cd backend
source .venv/bin/activate
powershell activation(.\.venv\Scripts\Activate.ps1 )
python3 -m scripts.pillar2.build_ahtn_vector_db
```

### 4) Run backend (Terminal 1)
```bash
cd backend
source .venv/bin/activate
python3 -m app.main
```

### 5) Run frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

### 6) Optional AHTN tests
```bash
cd backend
source .venv/bin/activate
python3 -m scripts.pillar2.test_ahtn
python3 -m scripts.pillar2.test_prevet
python3 -m scripts.pillar2.test_prevet --all
```

---

# FinanceFlow — Manual Run Guide

## Project Layout

```
antigravity-minhan/
├── .env                        ← All API keys (Clerk, Supabase, Gemini)
├── frontend/                   ← React + Vite (TypeScript)
└── backend/                    ← FastAPI (Python)
    ├── app/
    │   ├── main.py             ← API entry point
    │   └── routers/
    │       ├── fintech.py      ← Readiness, Compliance, CTOS, Registry APIs
    │       ├── invoices.py
    │       ├── payments.py
    │       ├── clients.py
    │       └── whatsapp.py
    └── scripts/
        └── fintech-utils/      ← Debug/utility scripts



---

## Prerequisites

Make sure you have installed:
- **Node.js** v18+ → `node --version`
- **Python** 3.10+ → `python --version`
- **pip** (comes with Python)

---

## Step 1 — Set Up Environment Variables

The `.env` file in the root is already configured. It covers all three services:

```
# Clerk (Authentication)
VITE_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Supabase (Database)
USE_SUPABASE=true
SUPABASE_URL=https://opgddwdrijiuwvdccvyr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Gemini AI (CTOS Analysis)
GEMINI_API_KEY=...

# Backend port
PORT=8000
```

> If you need to reset, copy from `.env.example` → `.env`

---

## Step 2 — Install Dependencies (First Time Only)

### Backend
```powershell
cd backend
pip install fastapi uvicorn supabase python-dotenv google-genai python-multipart python-jose PyJWT pydantic numpy python-dateutil reportlab openai openpyxl
```

### Frontend
```powershell
cd frontend
npm install
```

---

## Step 3 — Run the Backend (Terminal 1)

Open a terminal in the project root and run:

```powershell
cd backend
python -m app.main
```

**Expected output:**
```
✅ Instagram: Gemini client initialized
✅ Instagram: Supabase connected
Connected to Supabase
INFO: Started server process [XXXXX]
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

Backend API is now available at: **http://localhost:8000**

---

## Step 4 — Run the Frontend (Terminal 2)

Open a **second** terminal in the project root and run:

```powershell
cd frontend
npm run dev
```

**Expected output:**
```
VITE v7.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

Open your browser at: **http://localhost:5173**

---

## Pages Available

| URL | Description |
|-----|-------------|
| `/` | Login page (Clerk auth) |
| `/dashboard` | Overview — invoices, payments, revenue summary |
| `/dashboard/invoices` | Invoice management |
| `/dashboard/clients` | Client management |
| `/dashboard/inventory` | Inventory tracking |
| `/dashboard/payments` | Payment records |
| `/dashboard/scan-receipt` | AI receipt scanning |
| `/dashboard/readiness` | **Loan Readiness Analytics** (Supabase live) |
| `/dashboard/ctos` | **AI CTOS Credit Report** (Gemini AI) |
| `/dashboard/registry` | **SSM Registration Hub** (AI-prefilled) |
| `/dashboard/compliance` | **Tax & Statutory Center** (LHDN) |
| `/dashboard/whatsapp` | WhatsApp invoice bot |
| `/dashboard/settings` | Account settings |

---

## API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analysis` | Loan readiness score + all metrics |
| GET | `/api/revenue` | Monthly revenue breakdown |
| GET | `/api/compliance` | Tax, payroll, SSM data |
| GET | `/api/ctos` | AI-generated CTOS credit report |
| GET | `/api/company` | Company name from Supabase |
| GET | `/api/staff/directors` | Directors for SSM prefill |
| POST | `/api/ssm/register` | Submit SSM registration |
| POST | `/api/ssm/annual-return` | File SSM annual return |
| GET | `/api/invoices/` | All invoices |
| GET | `/api/payments/` | All payments |

---

## Troubleshooting

### "Cannot connect to backend"
- Make sure backend is running on port 8000
- Check CORS: backend allows `localhost:5173` and `localhost:5174`

### "Readiness / Compliance page blank"
- Backend must be running first
- Open DevTools → Network tab — check if `/api/analysis` returns 200

### "Supabase not connected"
- Check `.env` has `USE_SUPABASE=true`
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### "framer-motion not found"
```powershell
cd frontend
npm install framer-motion
```

### Backend import errors on startup
```powershell
cd backend
pip install python-dateutil numpy reportlab openai openpyxl
```
