from pydantic import BaseModel, ConfigDict, computed_field
from pydantic.alias_generators import to_camel


class Study(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    name: str
    researcher: str
    owner_rc: str
    total_required: int
    already_sent: int
    last_run: str | None = None
    new_responses: int = 0
    p0_ready: int = 0
    p0_newly_marked: int = 0
    # Salesforce metadata (optional — populated when data comes from SF)
    sf_case_id: str | None = None
    sf_case_number: str | None = None

    @computed_field
    @property
    def remaining(self) -> int:
        return self.total_required - self.already_sent
