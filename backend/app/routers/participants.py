from fastapi import APIRouter, HTTPException

from app.models.participant import Participant, StudyProgress
from app.services import study_service
from app.services.mock_data import PARTICIPANTS, STUDIES

router = APIRouter(prefix="/api/studies", tags=["participants"])

# SF status → Participant.status mapping
_SF_STATUS_MAP = {
    "Invited":    "invited",
    "Responded":  "booked",
    "Completed":  "confirmed",
    "No Show":    "no_response",
    "P0":         "invited",
}


def _sf_to_participant(p: dict, study_id: str) -> dict:
    sf_status = p.get("status", "Shortlisted")
    old_status = _SF_STATUS_MAP.get(sf_status, "invited")
    invite_sent = bool(p.get("invite_sent", False))
    needs_reminder = old_status == "invited" and invite_sent
    return {
        "id": p["id"],
        "study_id": study_id,
        "name": p.get("name") or f"Participant {p['id']}",
        "status": old_status,
        "invited_date": "",
        "response_date": None,
        "booked_slot": None,
        "icf_signed": False,
        "needs_reminder": needs_reminder,
        "days_since_invite": 0,
    }


def _get_participants_sf(study_id: str) -> list[dict] | None:
    """Return participants from SF converted to the old Participant shape, or None if unavailable."""
    sf_parts = study_service.get_participants(study_id)
    if sf_parts is None:
        return None
    invited_statuses = {"Invited", "Responded", "Completed", "No Show", "P0"}
    return [
        _sf_to_participant(p, study_id)
        for p in sf_parts
        if p.get("status") in invited_statuses and (p.get("invite_sent") or p.get("status") != "P0")
    ]


def _get_participants(study_id: str) -> list[dict]:
    sf = _get_participants_sf(study_id)
    if sf is not None:
        return sf
    # Fallback to mock data
    if study_id not in STUDIES:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
    return PARTICIPANTS.get(study_id, [])


def _build_progress(study_id: str) -> StudyProgress:
    study = study_service.get_study(study_id)
    if study is None:
        # Fallback to mock
        if study_id not in STUDIES:
            raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
        study_dict = STUDIES[study_id]
        participants = PARTICIPANTS.get(study_id, [])
        return _compute_progress(study_id, study_dict["name"], study_dict["researcher"], participants, study_dict)

    sf_parts = _get_participants_sf(study_id) or []
    study_dict = {
        "p0_ready":        study.p0_ready,
        "p0_newly_marked": study.p0_newly_marked,
        "new_responses":   study.new_responses,
    }
    return _compute_progress(study_id, study.name, study.researcher, sf_parts, study_dict)


def _compute_progress(
    study_id: str,
    study_name: str,
    researcher: str,
    participants: list[dict],
    study_dict: dict,
) -> StudyProgress:
    confirmed   = sum(1 for p in participants if p["status"] == "confirmed")
    booked      = sum(1 for p in participants if p["status"] == "booked")
    icf_signed  = sum(1 for p in participants if p.get("icf_signed"))
    no_response = sum(1 for p in participants if p["status"] == "no_response")
    declined    = sum(1 for p in participants if p["status"] == "declined")
    pending_icf = sum(1 for p in participants if p["status"] == "booked" and not p.get("icf_signed"))

    needs_attention: list[str] = []
    no_resp_48h = sum(1 for p in participants if p["status"] == "no_response" and p.get("days_since_invite", 0) >= 2)
    if no_resp_48h > 0:
        needs_attention.append(f"{no_resp_48h} haven't responded in 48h+")
    if pending_icf > 0:
        needs_attention.append(f"{pending_icf} booked but ICF not signed")
    recently_invited = sum(1 for p in participants if p["status"] == "invited")
    if recently_invited > 0:
        needs_attention.append(f"{recently_invited} recently invited, awaiting response")

    p0_ready           = study_dict.get("p0_ready", 0)
    invites_sent_today = study_dict.get("p0_newly_marked", 0)
    new_responses      = study_dict.get("new_responses", 0)
    appointments_booked_today = min(new_responses, max(1, int(invites_sent_today * 0.4))) if invites_sent_today > 0 else 0
    appointments_cancelled    = 1 if p0_ready > 5 else 0
    appointments_rescheduled  = 1 if p0_ready > 8 else 0
    ps_completed  = int(p0_ready * 0.7)
    ps_invited    = min(2, invites_sent_today) if invites_sent_today > 0 else 0
    ps_cancelled  = 1 if ps_completed > 4 else 0
    ps_rescheduled = 1 if ps_completed > 5 else 0

    return StudyProgress(
        study_id=study_id,
        study_name=study_name,
        researcher=researcher,
        total_invited=len(participants),
        booked=booked,
        icf_signed=icf_signed,
        confirmed=confirmed,
        no_response=no_response,
        declined=declined,
        pending_icf=pending_icf,
        needs_attention=needs_attention,
        p0_ready=p0_ready,
        invites_sent_today=invites_sent_today,
        appointments_booked_today=appointments_booked_today,
        appointments_cancelled=appointments_cancelled,
        appointments_rescheduled=appointments_rescheduled,
        ps_completed=ps_completed,
        ps_invited=ps_invited,
        ps_cancelled=ps_cancelled,
        ps_rescheduled=ps_rescheduled,
    )


@router.get("/{study_id}/progress", response_model=StudyProgress)
def get_study_progress(study_id: str):
    return _build_progress(study_id)


@router.get("/{study_id}/participants/needs-reminder", response_model=list[Participant])
def get_needs_reminder(study_id: str):
    parts = _get_participants(study_id)
    reminder_list = [
        p for p in parts
        if p.get("needs_reminder")
        or (p["status"] == "no_response" and p.get("days_since_invite", 0) >= 1)
        or (p["status"] == "booked" and not p.get("icf_signed"))
    ]
    return [Participant(**p) for p in reminder_list]


@router.get("/{study_id}/participants/confirmed", response_model=list[Participant])
def get_confirmed(study_id: str):
    parts = _get_participants(study_id)
    confirmed = [p for p in parts if p["status"] == "confirmed"]
    return [Participant(**p) for p in confirmed]
