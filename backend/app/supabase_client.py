"""
Supabase client for storing invoice pre-vet results and HITL queue.
"""

from typing import Any

from app.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, USE_SUPABASE

_client: Any = None


def get_supabase():
    """Lazy-init Supabase client."""
    global _client
    if _client is not None:
        return _client
    if not USE_SUPABASE or not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    from supabase import create_client
    _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def save_prevet_result(invoice: dict, pre_vet: dict, source_file: str | None = None) -> str | None:
    """
    Save pre-vet result to Supabase. Saves all results.
    - HITL required: status = pending_review (needs approve)
    - No HITL: status = approved (shown but no approve needed)
    Returns record id if saved, else None.
    """
    sb = get_supabase()
    if not sb:
        return None

    any_hitl = pre_vet.get("any_requires_hitl", False)
    status = "pending_review" if any_hitl else "approved"

    row = {
        "invoice_id": pre_vet.get("invoice_id", ""),
        "invoice_data": invoice,
        "pre_vet_result": pre_vet,
        "source_file": source_file or "",
        "status": status,
    }
    r = sb.table("invoice_prevet_results").insert(row).execute()
    if r.data and len(r.data) > 0:
        return r.data[0].get("id")
    return None


def get_hitl_queue(include_approved: bool = True) -> list[dict]:
    """
    Fetch invoices from Supabase.
    When include_approved=True, returns both pending_review and approved (uploaded items only).
    """
    sb = get_supabase()
    if not sb:
        return []

    r = sb.table("invoice_prevet_results").select("*").order(
        "created_at", desc=True
    ).execute()

    items = []
    for row in (r.data or []):
        status = row.get("status", "pending_review")
        if not include_approved and status == "approved":
            continue
        items.append({
            "id": row["id"],
            "source_file": row.get("source_file", ""),
            "invoice": row.get("invoice_data", {}),
            "pre_vet": row.get("pre_vet_result", {}),
            "status": status,
            "created_at": row.get("created_at"),
        })
    return items


def approve_prevet_result(record_id: str, reviewed_by: str) -> bool:
    """Mark a pre-vet result as approved. Only updates pending_review records."""
    sb = get_supabase()
    if not sb:
        return False

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    r = sb.table("invoice_prevet_results").update({
        "status": "approved",
        "reviewed_by": reviewed_by,
        "reviewed_at": now,
        "updated_at": now,
    }).eq("id", record_id).eq("status", "pending_review").execute()

    return bool(r.data and len(r.data) > 0)
