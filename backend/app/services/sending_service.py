"""
Simulated email sending service using asyncio background tasks.
"""

import asyncio
import logging
import time
from datetime import datetime

from app.services.mock_data import SEND_STATE, AUDIT_RUNS, STUDIES, next_id
from app.services import salesforce_service

logger = logging.getLogger(__name__)


def format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}m {secs}s"


def _sync_to_sf(study_id: str, emails_sent: int, new_already_sent: int, last_run: str) -> None:
    """Push updated study count and mark N participants as Invited in Salesforce."""
    try:
        sf_study = salesforce_service.get_study(study_id)
        if not sf_study or not sf_study.get("sf_id"):
            return
        sf_id = sf_study["sf_id"]

        salesforce_service.update_study_sent(sf_id, new_already_sent, last_run)

        participants = salesforce_service.get_participants(sf_id)
        if participants:
            not_invited = [p for p in participants if not p.get("invite_sent") and p.get("sf_id")]
            for p in not_invited[:emails_sent]:
                salesforce_service.update_participant_status(p["sf_id"], "Invited", True)
            logger.info(
                "SF sync: study=%s sent=%d updated=%d participants",
                study_id, emails_sent, min(len(not_invited), emails_sent),
            )
    except Exception as exc:
        logger.error("SF sync error for study %s: %s", study_id, exc)


async def _simulate_sending(session_id: str) -> None:
    """Background coroutine that increments sent count every ~500ms."""
    state = SEND_STATE.get(session_id)
    if state is None:
        return

    total = state["total"]
    while state["emails_sent"] < total and not state["stopped"]:
        await asyncio.sleep(0.5)
        if state["stopped"]:
            break
        state["emails_sent"] = min(state["emails_sent"] + 1, total)
        state["elapsed_seconds"] = int(time.time() - state["start_time"])

    state["elapsed_seconds"] = int(time.time() - state["start_time"])
    state["is_complete"] = state["emails_sent"] >= total

    if state["is_complete"]:
        state["duration_str"] = format_duration(state["elapsed_seconds"])
        now = datetime.now()
        last_run = now.strftime("%b %d")

        # Update in-memory mock data
        study_data = STUDIES.get(state["study_id"])
        if study_data:
            study_data["already_sent"] = min(
                study_data["already_sent"] + state["emails_sent"],
                study_data["total_required"],
            )
            study_data["last_run"] = last_run
            new_already_sent = study_data["already_sent"]
        else:
            new_already_sent = state["emails_sent"]

        # Push to Salesforce in background thread to avoid blocking event loop
        await asyncio.to_thread(
            _sync_to_sf,
            state["study_id"],
            state["emails_sent"],
            new_already_sent,
            last_run,
        )

        # Create an audit run entry
        run_id = f"RUN-{now.strftime('%m%d')}-{next_id('R')}"
        AUDIT_RUNS.insert(
            0,
            {
                "id": run_id,
                "study_id": state["study_id"],
                "study_name": state.get("study_name", ""),
                "date": now.strftime("%Y-%m-%d"),
                "rc": state["user_name"],
                "sent": state["emails_sent"],
                "failed": 0,
                "status": "completed",
                "duration": state["duration_str"],
                "sla": True,
            },
        )


async def start_send(study_id: str, count: int, user_name: str = "Sarah Chen") -> str:
    """Create a new send session and start the background simulation."""
    session_id = next_id("SES")

    study_data = STUDIES.get(study_id)
    study_name = study_data["name"] if study_data else "Unknown"

    # Cap count at remaining
    if study_data:
        remaining = study_data["total_required"] - study_data["already_sent"]
        count = min(count, remaining)

    SEND_STATE[session_id] = {
        "session_id": session_id,
        "study_id": study_id,
        "study_name": study_name,
        "user_name": user_name,
        "total": count,
        "emails_sent": 0,
        "elapsed_seconds": 0,
        "is_complete": False,
        "stopped": False,
        "duration_str": None,
        "start_time": time.time(),
    }

    asyncio.create_task(_simulate_sending(session_id))
    return session_id


def get_send_progress(session_id: str) -> dict | None:
    state = SEND_STATE.get(session_id)
    if state is None:
        return None
    return {
        "emails_sent": state["emails_sent"],
        "total": state["total"],
        "elapsed_seconds": state["elapsed_seconds"],
        "is_complete": state["is_complete"],
        "duration_str": state.get("duration_str"),
    }


def stop_send(session_id: str) -> dict | None:
    state = SEND_STATE.get(session_id)
    if state is None:
        return None

    state["stopped"] = True
    state["elapsed_seconds"] = int(time.time() - state["start_time"])
    last_run = datetime.now().strftime("%b %d")

    # Update in-memory mock data for partial sends
    study_data = STUDIES.get(state["study_id"])
    new_already_sent = state["emails_sent"]
    if study_data and state["emails_sent"] > 0:
        study_data["already_sent"] = min(
            study_data["already_sent"] + state["emails_sent"],
            study_data["total_required"],
        )
        study_data["last_run"] = last_run
        new_already_sent = study_data["already_sent"]

    # Push partial send to Salesforce synchronously (stop is a sync function)
    if state["emails_sent"] > 0:
        _sync_to_sf(state["study_id"], state["emails_sent"], new_already_sent, last_run)

    return {
        "emails_sent": state["emails_sent"],
        "total": state["total"],
        "elapsed_seconds": state["elapsed_seconds"],
        "is_complete": False,
        "duration_str": format_duration(state["elapsed_seconds"]),
    }
