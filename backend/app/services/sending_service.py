"""
Simulated email sending service using asyncio background tasks.
"""

import asyncio
import time
from datetime import datetime

from app.services.mock_data import SEND_STATE, AUDIT_RUNS, STUDIES, next_id


def format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}m {secs}s"


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
        # Update the study's already_sent count
        study_data = STUDIES.get(state["study_id"])
        if study_data:
            study_data["already_sent"] = min(
                study_data["already_sent"] + state["emails_sent"],
                study_data["total_required"],
            )
            study_data["last_run"] = datetime.now().strftime("%b %d")

        # Create an audit run entry
        now = datetime.now()
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

    # Start background task on the running event loop
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

    # Still update the study for partial sends
    study_data = STUDIES.get(state["study_id"])
    if study_data and state["emails_sent"] > 0:
        study_data["already_sent"] = min(
            study_data["already_sent"] + state["emails_sent"],
            study_data["total_required"],
        )
        study_data["last_run"] = datetime.now().strftime("%b %d")

    return {
        "emails_sent": state["emails_sent"],
        "total": state["total"],
        "elapsed_seconds": state["elapsed_seconds"],
        "is_complete": False,
        "duration_str": format_duration(state["elapsed_seconds"]),
    }
