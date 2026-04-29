from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.models.study import Study
from app.services import study_service

router = APIRouter(prefix="/api/studies", tags=["studies"])


class NoteRequest(BaseModel):
    content: str
    title: str = ""


@router.get("/pending", response_model=list[Study])
def get_pending_studies(rc: str = Query(default="Sarah Chen")):
    return study_service.get_pending_studies(rc)


@router.get("/{study_id}/remaining")
def get_remaining(study_id: str):
    remaining = study_service.get_remaining(study_id)
    if remaining is None:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
    return {"studyId": study_id, "remaining": remaining}


@router.get("/{study_id}/participants")
def get_participants(study_id: str):
    participants = study_service.get_participants(study_id)
    if participants is None:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found in Salesforce")
    return participants


@router.post("/{study_id}/note")
def update_note(study_id: str, req: NoteRequest):
    ok = study_service.update_study_note(study_id, req.content, req.title)
    if ok is None:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found in Salesforce")
    return {"ok": ok}


@router.get("/{study_id}", response_model=Study)
def get_study(study_id: str):
    study = study_service.get_study(study_id)
    if study is None:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
    return study


@router.get("", response_model=list[Study])
def list_studies():
    return study_service.get_all_studies()
