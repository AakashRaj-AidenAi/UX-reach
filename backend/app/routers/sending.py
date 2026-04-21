from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.chat import (
    SendRequest,
    SendProgress,
    ScheduleRequest,
    ScheduledJob,
)
from app.services import sending_service
from app.services.mock_data import SCHEDULED_JOBS, STUDIES

router = APIRouter(prefix="/api/send", tags=["sending"])


@router.post("/start")
async def start_sending(req: SendRequest):
    study = STUDIES.get(req.study_id)
    if study is None:
        raise HTTPException(status_code=404, detail=f"Study {req.study_id} not found")

    session_id = await sending_service.start_send(req.study_id, req.count, req.user_name)
    return {"sessionId": session_id, "studyId": req.study_id, "count": req.count}


@router.get("/progress/{session_id}", response_model=SendProgress)
def get_progress(session_id: str):
    progress = sending_service.get_send_progress(session_id)
    if progress is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return SendProgress(**progress)


@router.post("/stop/{session_id}")
def stop_sending(session_id: str):
    result = sending_service.stop_send(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return SendProgress(**result)


@router.post("/schedule")
def schedule_send(req: ScheduleRequest):
    study = STUDIES.get(req.study_id)
    if study is None:
        raise HTTPException(status_code=404, detail=f"Study {req.study_id} not found")

    job = {
        "study_id": req.study_id,
        "study_name": study["name"],
        "count": req.count,
        "scheduled_time": req.scheduled_time,
        "created_at": datetime.now().isoformat(),
        "status": "scheduled",
    }
    SCHEDULED_JOBS.append(job)
    return ScheduledJob(**job)


@router.get("/scheduled", response_model=list[ScheduledJob])
def list_scheduled():
    return [ScheduledJob(**j) for j in SCHEDULED_JOBS if j["status"] == "scheduled"]


@router.delete("/scheduled/{index}")
def cancel_scheduled(index: int):
    if index < 0 or index >= len(SCHEDULED_JOBS):
        raise HTTPException(status_code=404, detail="Scheduled job not found")

    SCHEDULED_JOBS[index]["status"] = "cancelled"
    return {"message": "Scheduled job cancelled", "index": index}
