"""
Seed script — creates UXR_Study__c records for every study in mock_data.STUDIES,
then creates UXR_Participant__c records for each study's participants.

Run once from the backend/ directory:
    python seed_salesforce.py

Safe to re-run: checks for existing records first and skips duplicates.
"""

import os
import sys

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from app.services.mock_data import STUDIES, PARTICIPANTS
from app.services import salesforce_service


def _seeded_study_ids() -> dict[str, str]:
    """Return {study_id: sf_id} for studies already in SF."""
    records = salesforce_service._query(
        "SELECT Id, Study_ID__c FROM UXR_Study__c"
    ) or []
    return {r["Study_ID__c"]: r["Id"] for r in records if r.get("Study_ID__c")}


def _seeded_participant_ids(study_sf_id: str) -> set[str]:
    """Return set of Participant_ID__c already in SF for a given study."""
    records = salesforce_service._query(
        f"SELECT Participant_ID__c FROM UXR_Participant__c WHERE Study__c = '{study_sf_id}'"
    ) or []
    return {r["Participant_ID__c"] for r in records if r.get("Participant_ID__c")}


def main():
    print("Connecting to Salesforce…")
    salesforce_service._connect()
    if salesforce_service._session is None:
        print(f"ERROR: {salesforce_service._sf_error}")
        sys.exit(1)
    print(f"Connected: {salesforce_service._instance_url}\n")

    existing = _seeded_study_ids()
    print(f"Found {len(existing)} existing study record(s) in SF.\n")

    study_sf_map: dict[str, str] = dict(existing)
    study_created = study_skipped = 0

    # ── seed studies ──────────────────────────────────────────────────────────
    print("-- Studies --------------------------------------------------")
    for study_id, study in STUDIES.items():
        if study_id in existing:
            print(f"  SKIP  {study_id}  ({study['name']})")
            study_skipped += 1
            continue

        sf_id = salesforce_service.create_study(study)
        if sf_id:
            print(f"  OK    {study_id}  -> {sf_id}  ({study['name']})")
            study_sf_map[study_id] = sf_id
            study_created += 1
        else:
            print(f"  FAIL  {study_id}  ({study['name']})")

    print(f"\nStudies — {study_created} created, {study_skipped} skipped.\n")

    # ── seed participants ─────────────────────────────────────────────────────
    print("-- Participants ---------------------------------------------")
    p_created = p_skipped = 0

    for study_id, participants in PARTICIPANTS.items():
        sf_study_id = study_sf_map.get(study_id)
        if not sf_study_id:
            print(f"  SKIP participants for {study_id} (study not in SF)")
            continue

        already_seeded = _seeded_participant_ids(sf_study_id)

        for p in participants:
            pid = str(p.get("id", ""))
            if pid in already_seeded:
                p_skipped += 1
                continue

            sf_p_id = salesforce_service.create_participant(p, sf_study_id)
            if sf_p_id:
                p_created += 1
            else:
                print(f"  FAIL participant {pid} for study {study_id}")

    print(f"Participants — {p_created} created, {p_skipped} skipped.\n")
    print("Done.")


if __name__ == "__main__":
    main()
