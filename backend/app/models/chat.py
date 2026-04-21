from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ChatRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    message: str
    user_name: str = "Sarah Chen"


class ChatResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    html: str
    actions: list[dict] | None = None
    intent: str  # send_invite | schedule | status | summary | pending | failure | help | responses | bookings | icf_status | reminders_needed | confirmed_count | study_progress | unknown


class SendRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    study_id: str
    count: int
    user_name: str = "Sarah Chen"


class SendProgress(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    emails_sent: int
    total: int
    elapsed_seconds: int
    is_complete: bool
    duration_str: str | None = None


class ScheduleRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    study_id: str
    count: int
    scheduled_time: str
    user_name: str = "Sarah Chen"


class ScheduledJob(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    study_id: str
    study_name: str
    count: int
    scheduled_time: str
    created_at: str
    status: str  # scheduled | cancelled | completed


class DelegationRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    case_id: str
    delegate_to: str


class Delegation(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    case_id: str
    study_name: str
    delegate_to: str
    date: str
    status: str  # Active | Revoked


class Preferences(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    allow_cross_rc_send: bool = True
    default_batch_size: int = 10
    notification_email: str = ""
