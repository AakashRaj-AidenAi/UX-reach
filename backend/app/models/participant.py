from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Participant(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    study_id: str
    name: str  # anonymized display name like "Participant #01"
    status: str  # invited | booked | icf_signed | confirmed | no_response | declined
    invited_date: str
    response_date: str | None = None
    booked_slot: str | None = None  # calendar slot datetime
    icf_signed: bool = False
    needs_reminder: bool = False
    days_since_invite: int = 0


class StudyProgress(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    study_id: str
    study_name: str
    researcher: str
    total_invited: int
    booked: int
    icf_signed: int
    confirmed: int  # booked + icf_signed
    no_response: int
    declined: int
    pending_icf: int  # booked but not signed
    needs_attention: list[str]  # list of issues like "3 haven't responded in 48h"
    # EOD activity fields (mirrors buildStudyNote formulas)
    p0_ready: int = 0
    invites_sent_today: int = 0
    appointments_booked_today: int = 0
    appointments_cancelled: int = 0
    appointments_rescheduled: int = 0
    ps_completed: int = 0
    ps_invited: int = 0
    ps_cancelled: int = 0
    ps_rescheduled: int = 0
