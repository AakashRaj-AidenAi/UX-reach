from fastapi import APIRouter, HTTPException

from app.models.participant import Participant, StudyProgress
from app.services.mock_data import PARTICIPANTS, STUDIES

router = APIRouter(prefix="/api/studies", tags=["participants"])


def _get_participants(study_id: str) -> list[dict]:
    if study_id not in STUDIES:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
    return PARTICIPANTS.get(study_id, [])


def _build_progress(study_id: str) -> StudyProgress:
    if study_id not in STUDIES:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")

    study = STUDIES[study_id]
    participants = PARTICIPANTS.get(study_id, [])

    confirmed = sum(1 for p in participants if p["status"] == "confirmed")
    booked = sum(1 for p in participants if p["status"] == "booked")
    icf_signed = sum(1 for p in participants if p["icf_signed"])
    no_response = sum(1 for p in participants if p["status"] == "no_response")
    declined = sum(1 for p in participants if p["status"] == "declined")
    pending_icf = sum(1 for p in participants if p["status"] == "booked" and not p["icf_signed"])

    # Build attention items
    needs_attention: list[str] = []
    no_resp_48h = sum(1 for p in participants if p["status"] == "no_response" and p["days_since_invite"] >= 2)
    if no_resp_48h > 0:
        needs_attention.append(f"{no_resp_48h} haven't responded in 48h+")
    if pending_icf > 0:
        needs_attention.append(f"{pending_icf} booked but ICF not signed")
    recently_invited = sum(1 for p in participants if p["status"] == "invited")
    if recently_invited > 0:
        needs_attention.append(f"{recently_invited} recently invited, awaiting response")

    return StudyProgress(
        study_id=study_id,
        study_name=study["name"],
        researcher=study["researcher"],
        total_invited=len(participants),
        booked=booked,
        icf_signed=icf_signed,
        confirmed=confirmed,
        no_response=no_response,
        declined=declined,
        pending_icf=pending_icf,
        needs_attention=needs_attention,
    )


@router.get("/{study_id}/participants", response_model=list[Participant])
def list_participants(study_id: str):
    parts = _get_participants(study_id)
    return [Participant(**p) for p in parts]


@router.get("/{study_id}/progress", response_model=StudyProgress)
def get_study_progress(study_id: str):
    return _build_progress(study_id)


@router.get("/{study_id}/participants/needs-reminder", response_model=list[Participant])
def get_needs_reminder(study_id: str):
    parts = _get_participants(study_id)
    reminder_list = [
        p for p in parts
        if (p["status"] == "no_response" and p["days_since_invite"] >= 1)
        or (p["status"] == "booked" and not p["icf_signed"])
    ]
    return [Participant(**p) for p in reminder_list]


@router.get("/{study_id}/participants/confirmed", response_model=list[Participant])
def get_confirmed(study_id: str):
    parts = _get_participants(study_id)
    confirmed = [p for p in parts if p["status"] == "confirmed"]
    return [Participant(**p) for p in confirmed]
