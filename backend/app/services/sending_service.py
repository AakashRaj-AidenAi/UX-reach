"""
Email sending service — updates SF participant statuses to trigger Flow-based emails.
Each participant is updated to 'Invited' in SF individually; the SF Record-Triggered
Flow then sends the email. Progress bar tracks actual SF updates, not a counter.
"""

import asyncio
import logging
import time
from datetime import datetime

from app.services.mock_data import SEND_STATE, AUDIT_RUNS, STUDIES, DAILY_ACTIVITY, next_id
from app.services import salesforce_service

logger = logging.getLogger(__name__)


def format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}m {secs}s"


def _sync_study_counts(study_id: str, last_run: str) -> None:
    """Recompute Total_Required__c and Already_Sent__c from actual SF participant records."""
    try:
        sf_study = salesforce_service.get_study(study_id)
        if not sf_study or not sf_study.get("sf_id"):
            return
        sf_id = sf_study["sf_id"]

        participants = salesforce_service.get_participants(sf_id)
        if participants is None:
            return

        total = len(participants)
        already_sent = sum(
            1 for p in participants
            if p.get("invite_sent") or p.get("status") not in ("Shortlisted", None, "")
        )
        p0_ready = sum(
            1 for p in participants
            if not p.get("invite_sent") and p.get("status") == "Shortlisted"
        )

        salesforce_service.update_study_counts(sf_id, total, already_sent, last_run, p0_ready)

        study_data = STUDIES.get(study_id)
        if study_data:
            study_data["total_required"] = total
            study_data["already_sent"] = already_sent
            study_data["last_run"] = last_run
            study_data["p0_ready"] = p0_ready

        logger.info(
            "Study counts synced: study=%s total=%d already_sent=%d",
            study_id, total, already_sent,
        )
    except Exception as exc:
        logger.error("Study count sync error for study %s: %s", study_id, exc)


async def _simulate_sending(session_id: str) -> None:
    """Background coroutine — updates each participant to Invited in SF with 500ms delay."""
    state = SEND_STATE.get(session_id)
    if state is None:
        return

    to_invite = state.get("participants_to_invite", [])

    for p in to_invite:
        if state["stopped"]:
            break
        await asyncio.sleep(0.5)
        if state["stopped"]:
            break
        success = await asyncio.to_thread(
            salesforce_service.update_participant_status,
            p["sf_id"], "Invited", True,
        )
        if success:
            state["emails_sent"] += 1
        state["elapsed_seconds"] = int(time.time() - state["start_time"])

    state["elapsed_seconds"] = int(time.time() - state["start_time"])
    state["is_complete"] = not state["stopped"] and state["emails_sent"] >= state["total"]

    if state["emails_sent"] > 0:
        now = datetime.now()
        last_run = now.strftime("%b %d")
        state["duration_str"] = format_duration(state["elapsed_seconds"])

        await asyncio.to_thread(_sync_study_counts, state["study_id"], last_run)

        DAILY_ACTIVITY["invites_sent_today"] = (
            DAILY_ACTIVITY.get("invites_sent_today", 0) + state["emails_sent"]
        )

        run_id = f"RUN-{now.strftime('%m%d')}-{next_id('R')}"
        AUDIT_RUNS.insert(0, {
            "id":         run_id,
            "study_id":   state["study_id"],
            "study_name": state.get("study_name", ""),
            "date":       now.strftime("%Y-%m-%d"),
            "rc":         state["user_name"],
            "sent":       state["emails_sent"],
            "failed":     0,
            "status":     "completed",
            "duration":   state["duration_str"],
            "sla":        True,
        })


async def start_send(study_id: str, count: int, user_name: str = "Sarah Chen") -> str:
    """Create a send session — fetches uninvited SF participants and starts the background task."""
    session_id = next_id("SES")
    study_name = "Unknown"
    participants_to_invite: list[dict] = []

    sf_study = salesforce_service.get_study(study_id)
    if sf_study:
        study_name = sf_study["name"]
        sf_id = sf_study.get("sf_id")
        if sf_id:
            participants = salesforce_service.get_participants(sf_id)
            if participants:
                not_invited = [
                    p for p in participants
                    if not p.get("invite_sent") and p.get("sf_id")
                ]
                participants_to_invite = not_invited[:count]
    else:
        study_data = STUDIES.get(study_id)
        if study_data:
            study_name = study_data["name"]

    actual_count = len(participants_to_invite) if participants_to_invite else count

    SEND_STATE[session_id] = {
        "session_id":           session_id,
        "study_id":             study_id,
        "study_name":           study_name,
        "user_name":            user_name,
        "total":                actual_count,
        "participants_to_invite": participants_to_invite,
        "emails_sent":          0,
        "elapsed_seconds":      0,
        "is_complete":          False,
        "stopped":              False,
        "duration_str":         None,
        "start_time":           time.time(),
    }

    asyncio.create_task(_simulate_sending(session_id))
    return session_id


def get_send_progress(session_id: str) -> dict | None:
    state = SEND_STATE.get(session_id)
    if state is None:
        return None
    return {
        "emails_sent":  state["emails_sent"],
        "total":        state["total"],
        "elapsed_seconds": state["elapsed_seconds"],
        "is_complete":  state["is_complete"],
        "duration_str": state.get("duration_str"),
    }


def stop_send(session_id: str) -> dict | None:
    state = SEND_STATE.get(session_id)
    if state is None:
        return None

    state["stopped"] = True
    state["elapsed_seconds"] = int(time.time() - state["start_time"])

    if state["emails_sent"] > 0:
        last_run = datetime.now().strftime("%b %d")
        _sync_study_counts(state["study_id"], last_run)
        DAILY_ACTIVITY["invites_sent_today"] = (
            DAILY_ACTIVITY.get("invites_sent_today", 0) + state["emails_sent"]
        )

    return {
        "emails_sent":  state["emails_sent"],
        "total":        state["total"],
        "elapsed_seconds": state["elapsed_seconds"],
        "is_complete":  False,
        "duration_str": format_duration(state["elapsed_seconds"]),
    }
