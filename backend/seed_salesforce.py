"""
Seed script — creates SF Cases for every study in mock_data.STUDIES.

Run once from the backend/ directory:
    python seed_salesforce.py

Safe to re-run: checks for existing Cases first and skips duplicates.
"""

import json
import os
import sys

from dotenv import load_dotenv
load_dotenv()

# Make sure the app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.services.mock_data import STUDIES
from app.services import salesforce_service


def already_seeded(sf) -> set[str]:
    """Return set of study_ids already in SF (parsed from Case.Description)."""
    try:
        result = sf.query(
            "SELECT Id, Description FROM Case "
            f"WHERE Origin = '{salesforce_service.SF_ORIGIN}'"
        )
        seeded = set()
        for rec in result["records"]:
            raw = rec.get("Description") or ""
            if raw.strip().startswith("{"):
                try:
                    extra = json.loads(raw)
                    sid = extra.get("study_id")
                    if sid:
                        seeded.add(sid)
                except (json.JSONDecodeError, TypeError):
                    pass
        return seeded
    except Exception as exc:
        print(f"  [warn] Could not check existing cases: {exc}")
        return set()


def main():
    print("Connecting to Salesforce…")
    sf = salesforce_service.get_client()

    if sf is None:
        print(f"ERROR: Could not connect — {salesforce_service._sf_error}")
        sys.exit(1)

    print(f"Connected to {sf.sf_instance}\n")

    existing = already_seeded(sf)
    print(f"Found {len(existing)} existing study case(s) in SF — will skip those.\n")

    created, skipped = 0, 0
    for study_id, study in STUDIES.items():
        if study_id in existing:
            print(f"  SKIP  {study_id}  ({study['name']})")
            skipped += 1
            continue

        case_id = salesforce_service.create_case(study)
        if case_id:
            print(f"  OK    {study_id}  -> Case {case_id}  ({study['name']})")
            created += 1
        else:
            print(f"  FAIL  {study_id}  ({study['name']})")

    print(f"\nDone — {created} created, {skipped} skipped.")


if __name__ == "__main__":
    main()
