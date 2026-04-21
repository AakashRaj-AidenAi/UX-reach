"""
Study data access service.
"""

from datetime import datetime

from app.models.study import Study
from app.services.mock_data import STUDIES


def get_all_studies() -> list[Study]:
    return [Study(**data) for data in STUDIES.values()]


def get_study(study_id: str) -> Study | None:
    data = STUDIES.get(study_id)
    if data is None:
        return None
    return Study(**data)


def get_studies_for_rc(rc_name: str) -> list[Study]:
    return [
        Study(**data)
        for data in STUDIES.values()
        if data["owner_rc"] == rc_name
    ]


def get_pending_studies(rc_name: str) -> list[Study]:
    return [
        Study(**data)
        for data in STUDIES.values()
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
    return Study(**data)


def get_remaining(study_id: str) -> int | None:
    data = STUDIES.get(study_id)
    if data is None:
        return None
    return data["total_required"] - data["already_sent"]
