from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AuditRun(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    study_id: str
    study_name: str
    date: str
    rc: str
    sent: int
    failed: int
    status: str  # completed | sending | failed
    duration: str
    sla: bool | None = None


class AuditSummary(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    date: str
    total_sent: int
    total_failed: int
    runs: list[AuditRun]
    total_confirmed: int = 0
    total_pending_icf: int = 0
    total_no_response: int = 0
