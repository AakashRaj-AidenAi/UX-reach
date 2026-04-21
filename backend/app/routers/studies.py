from fastapi import APIRouter, HTTPException, Query

from app.models.study import Study
from app.services import study_service

router = APIRouter(prefix="/api/studies", tags=["studies"])


@router.get("/pending", response_model=list[Study])
def get_pending_studies(rc: str = Query(default="Sarah Chen")):
    return study_service.get_pending_studies(rc)


@router.get("/{study_id}/remaining")
def get_remaining(study_id: str):
    remaining = study_service.get_remaining(study_id)
    if remaining is None:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
    return {"studyId": study_id, "remaining": remaining}


@router.get("/{study_id}", response_model=Study)
def get_study(study_id: str):
    study = study_service.get_study(study_id)
    if study is None:
        raise HTTPException(status_code=404, detail=f"Study {study_id} not found")
    return study


@router.get("", response_model=list[Study])
def list_studies():
    return study_service.get_all_studies()
