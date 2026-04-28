"""
Background scheduler: every 30 seconds, check SCHEDULED_JOBS for jobs whose
scheduled_time has passed and fire them via the sending service.
"""

import asyncio
import logging
from datetime import datetime, timezone

from dateutil import parser as dateutil_parser

logger = logging.getLogger(__name__)

_task: asyncio.Task | None = None


def _parse_scheduled_time(scheduled_time: str) -> datetime | None:
    try:
        dt = dateutil_parser.parse(scheduled_time)
        # Treat naive datetimes as local time and convert to UTC-aware for comparison
        if dt.tzinfo is None:
            dt = dt.astimezone(timezone.utc)
        return dt
    except Exception:
        return None


async def _run_loop() -> None:
    from app.services.mock_data import SCHEDULED_JOBS
    from app.services import sending_service

    while True:
        await asyncio.sleep(30)
        now = datetime.now(timezone.utc)

        for job in SCHEDULED_JOBS:
            if job.get("status") != "scheduled":
                continue

            due_at = _parse_scheduled_time(job.get("scheduled_time", ""))
            if due_at is None or now < due_at:
                continue

            # Mark as running immediately to prevent double-fire
            job["status"] = "running"
            study_id = job["study_id"]
            count = job["count"]
            logger.info(f"Scheduler firing job: {count} invites for study {study_id}")

            try:
                session_id = await sending_service.start_send(study_id, count)
                # Wait for the send to complete (it runs in a background task; poll progress)
                for _ in range(120):  # max 60s wait
                    await asyncio.sleep(0.5)
                    progress = sending_service.get_send_progress(session_id)
                    if progress and progress.get("status") in ("completed", "stopped"):
                        break

                job["status"] = "completed"
                logger.info(f"Scheduler completed job for study {study_id}")
            except Exception as exc:
                job["status"] = "failed"
                logger.error(f"Scheduler job failed for study {study_id}: {exc}")


def start() -> None:
    global _task
    loop = asyncio.get_event_loop()
    _task = loop.create_task(_run_loop())
    logger.info("Scheduler background task started (30s interval)")


def stop() -> None:
    global _task
    if _task:
        _task.cancel()
        _task = None
