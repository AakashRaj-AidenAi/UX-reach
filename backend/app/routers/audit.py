from datetime import date

from fastapi import APIRouter, Query

from app.models.audit import AuditRun, AuditSummary
from app.services.mock_data import AUDIT_RUNS, PARTICIPANTS

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/runs", response_model=list[AuditRun])
def list_runs(
    sort_by: str = Query(default="date", description="Field to sort by"),
    order: str = Query(default="desc", description="asc or desc"),
):
    valid_keys = {"id", "study_id", "study_name", "date", "rc", "sent", "failed", "status", "duration"}
    key = sort_by if sort_by in valid_keys else "date"
    reverse = order.lower() != "asc"

    sorted_runs = sorted(AUDIT_RUNS, key=lambda r: r.get(key, ""), reverse=reverse)
    return [AuditRun(**r) for r in sorted_runs]


@router.get("/runs/{study_id}", response_model=list[AuditRun])
def runs_for_study(study_id: str):
    filtered = [r for r in AUDIT_RUNS if r["study_id"] == study_id]
    return [AuditRun(**r) for r in filtered]


@router.get("/summary/today", response_model=AuditSummary)
def today_summary():
    today_str = date.today().isoformat()
    today_runs = [r for r in AUDIT_RUNS if r["date"] == today_str]

    # If no runs today, return latest date's data
    if not today_runs and AUDIT_RUNS:
        latest_date = AUDIT_RUNS[0]["date"]
        today_runs = [r for r in AUDIT_RUNS if r["date"] == latest_date]
        today_str = latest_date

    total_sent = sum(r["sent"] for r in today_runs)
    total_failed = sum(r["failed"] for r in today_runs)

    # Aggregate participant stats across all studies
    total_confirmed = 0
    total_pending_icf = 0
    total_no_response = 0
    for parts in PARTICIPANTS.values():
        total_confirmed += sum(1 for p in parts if p["status"] == "confirmed")
        total_pending_icf += sum(1 for p in parts if p["status"] == "booked" and not p["icf_signed"])
        total_no_response += sum(1 for p in parts if p["status"] == "no_response")

    return AuditSummary(
        date=today_str,
        total_sent=total_sent,
        total_failed=total_failed,
        runs=[AuditRun(**r) for r in today_runs],
        total_confirmed=total_confirmed,
        total_pending_icf=total_pending_icf,
        total_no_response=total_no_response,
    )
