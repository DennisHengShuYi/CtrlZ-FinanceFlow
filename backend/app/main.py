"""
FastAPI application — main entry point.
  GET /                    → public health-check
  GET /api/protected       → requires valid Clerk JWT
  POST /api/invoice/pre-vet → pre-vet invoice (RAG + LLM + tariff + flags), saves all to Supabase
  GET /api/invoice/hitl-queue → list all pre-vet results (HITL items need approve, others shown as approved)
  POST /api/invoice/{id}/approve → approve HITL item (requires auth, only pending_review)
"""

import json
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_auth
from app.config import PORT, USE_SUPABASE
from app.pillar2.invoice_prevet import pre_vet_invoice
from app.pillar2.schemas import Invoice
from app.supabase_client import approve_prevet_result, get_hitl_queue, save_prevet_result

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "pillar2"
DEMO_INVOICES_DIR = DATA_DIR / "demo_invoices"

app = FastAPI(
    title="CtrlZ-The-ADCB API",
    version="0.1.0",
)

# CORS — allow the Vite frontend (restart backend after changing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ──────────────────────────────────────
# Public route
# ──────────────────────────────────────
@app.get("/")
def health_check():
    return {"message": "Backend server is running!"}


# ──────────────────────────────────────
# Protected route — requires Clerk JWT
# ──────────────────────────────────────
@app.get("/api/protected")
def protected_route(claims: dict[str, Any] = Depends(require_auth)):
    user_id = claims.get("sub", "unknown")
    return {"message": f"Authenticated! Your userId is: {user_id}"}


# ──────────────────────────────────────
# Invoice pre-vet (Schema Enforcement + AHTN RAG + LLM + HITL routing)
# ──────────────────────────────────────
@app.post("/api/invoice/pre-vet")
def invoice_pre_vet(
    invoice: Invoice,
    source_file: str | None = Query(None, description="Original filename for HITL queue"),
):
    """
    Pre-vet an invoice: classify line items against AHTN, calculate tariffs,
    flag inconsistencies. Items with confidence < 75% are flagged for HITL.
    Saves all results to Supabase; HITL items need approve, others shown as approved.
    """
    try:
        inv_dict = invoice.model_dump()
        result = pre_vet_invoice(inv_dict)
        # Save all pre-vet results to Supabase (HITL = pending_review, others = approved)
        record_id = save_prevet_result(inv_dict, result, source_file=source_file)
        if record_id:
            result["_record_id"] = record_id  # Frontend can use for approve
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ──────────────────────────────────────
# HITL queue — all pre-vet results (HITL items need approve, others shown as approved)
# ──────────────────────────────────────
@app.get("/api/invoice/hitl-queue")
def hitl_queue():
    """
    Return all pre-vet results from Supabase.
    HITL items: status pending_review, need approve.
    Non-HITL items: status approved, shown but no approve needed.
    """
    if USE_SUPABASE:
        items = get_hitl_queue(include_approved=True)
        return {"count": len(items), "items": items, "source": "supabase"}

    # Fallback only when Supabase is disabled
    if not DEMO_INVOICES_DIR.exists():
        return {"count": 0, "items": [], "source": "none"}

    results = []
    for path in sorted(DEMO_INVOICES_DIR.glob("*.json")):
        try:
            with open(path, encoding="utf-8") as f:
                invoice = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        try:
            pre_vet = pre_vet_invoice(invoice)
        except Exception:
            continue
        # Demo fallback: include all pre-vet results (not just HITL)
        results.append({
                "id": None,
                "source_file": path.name,
                "invoice": invoice,
                "pre_vet": pre_vet,
                "status": "pending_review" if pre_vet.get("any_requires_hitl") else "approved",
            })

    return {"count": len(results), "items": results, "source": "demo"}


@app.post("/api/invoice/{record_id}/approve")
def approve_invoice(record_id: str, claims: dict[str, Any] = Depends(require_auth)):
    """
    Approve an invoice after human review. Requires authenticated user.
    """
    user_id = claims.get("sub", "unknown")
    if approve_prevet_result(record_id, user_id):
        return {"ok": True, "message": "Invoice approved"}
    raise HTTPException(status_code=404, detail="Record not found or already approved")


# ──────────────────────────────────────
# Run with: python -m app.main
# ──────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
