from datetime import date

from fastapi import APIRouter, HTTPException

from app.models.chat import Delegation, DelegationRequest, Preferences
from app.services.mock_data import DELEGATIONS, PREFERENCES, STUDIES, WELCOME_CONFIG

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/delegations", response_model=list[Delegation])
def list_delegations():
    return [Delegation(**d) for d in DELEGATIONS]


@router.post("/delegations", response_model=Delegation)
def add_delegation(req: DelegationRequest):
    # Look up study name from case_id (study_id in our mock)
    study_data = STUDIES.get(req.case_id)
    study_name = study_data["name"] if study_data else "Unknown Study"

    delegation = {
        "case_id": req.case_id,
        "study_name": study_name,
        "delegate_to": req.delegate_to,
        "date": date.today().isoformat(),
        "status": "Active",
    }
    DELEGATIONS.append(delegation)
    return Delegation(**delegation)


@router.delete("/delegations/{index}")
def revoke_delegation(index: int):
    if index < 0 or index >= len(DELEGATIONS):
        raise HTTPException(status_code=404, detail="Delegation not found")

    DELEGATIONS[index]["status"] = "Revoked"
    return {"message": "Delegation revoked", "index": index}


@router.get("/preferences", response_model=Preferences)
def get_preferences():
    return Preferences(**PREFERENCES)


@router.put("/preferences", response_model=Preferences)
def update_preferences(prefs: Preferences):
    PREFERENCES["allow_cross_rc_send"] = prefs.allow_cross_rc_send
    PREFERENCES["default_batch_size"] = prefs.default_batch_size
    PREFERENCES["notification_email"] = prefs.notification_email
    return Preferences(**PREFERENCES)


# ── Welcome config ──

@router.get("/welcome")
def get_welcome_config():
    return WELCOME_CONFIG


@router.put("/welcome")
def update_welcome_config(body: dict):
    if "message" in body:
        WELCOME_CONFIG["message"] = body["message"]
    if "buttons" in body:
        WELCOME_CONFIG["buttons"] = body["buttons"]
    return WELCOME_CONFIG
