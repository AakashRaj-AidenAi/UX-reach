"""
Study data access service.
Primary source: Salesforce Cases (Origin = 'UX Research').
Fallback:       in-memory mock_data.STUDIES.
"""

from datetime import datetime

from app.models.study import Study
from app.services.mock_data import STUDIES
from app.services import salesforce_service


def _sf_studies_map() -> dict[str, dict] | None:
    """
    Return {study_id: study_dict} from Salesforce, or None when SF unavailable.
    """
    sf_list = salesforce_service.get_studies()
    if not sf_list:
        return None
    return {s["id"]: s for s in sf_list}


def _merged_studies() -> dict[str, dict]:
    """
    SF studies take precedence; mock fills in any ID not present in SF.
    """
    sf_map = _sf_studies_map()
    if sf_map is None:
        return STUDIES
    merged = dict(STUDIES)   # start with mock
    merged.update(sf_map)    # SF wins on conflict
    return merged


def get_all_studies() -> list[Study]:
    return [Study(**data) for data in _merged_studies().values()]


def get_study(study_id: str) -> Study | None:
    # Try SF first for a live record
    sf_study = salesforce_service.get_study(study_id)
    if sf_study:
        return Study(**sf_study)
    data = STUDIES.get(study_id)
    return Study(**data) if data else None


def get_studies_for_rc(rc_name: str) -> list[Study]:
    return [
        Study(**data)
        for data in _merged_studies().values()
        if data["owner_rc"] == rc_name
    ]


def get_pending_studies(rc_name: str) -> list[Study]:
    return [
        Study(**data)
        for data in _merged_studies().values()
        if data["owner_rc"] == rc_name
        and data["already_sent"] < data["total_required"]
    ]


def update_study_sent(study_id: str, additional_sent: int) -> Study | None:
    data = STUDIES.get(study_id)
    if data is None:
        return None

    data["already_sent"] = min(
        data["already_sent"] + additional_sent,
        data["total_required"],
    )
    now = datetime.now()
    data["last_run"] = now.strftime("%b %d")

    # Sync back to SF if we have a case ID
    if data.get("sf_case_id"):
        salesforce_service.update_case_sent(
            data["sf_case_id"], data["already_sent"], data["last_run"]
        )

    return Study(**data)


def get_remaining(study_id: str) -> int | None:
    data = _merged_studies().get(study_id)
    if data is None:
        return None
    return data["total_required"] - data["already_sent"]
