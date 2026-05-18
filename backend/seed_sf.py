"""
Seed script — two jobs in one:

1. CREATE: Creates 3 new studies for Lohithaksh with 9 Shortlisted participants each
           (emails rotate across lohitl57, lohitvk18, lohithakshvasa @gmail.com)

2. UPDATE EMAILS: For every study owned by each RC in Salesforce, updates all
                  participant Email__c to the RC's designated test email.

   RC email mapping:
     Aakash       → aakash.aidenai@gmail.com
     Manaswitha   → manaswitha111@gmail.com
     Shubham      → shubhamkapadia0@gmail.com
     Vinoth       → vinothkumar7@gmail.com

Run from the backend/ directory:
    python seed_sf.py
"""

import os
import sys
from dotenv import load_dotenv
import requests

load_dotenv()

API_VERSION = "59.0"

# ── RC email mapping ────────────────────────────────────────────────────────────
RC_EMAILS = {
    "Aakash":     "aakash.aidenai@gmail.com",
    "Manaswitha": "manaswitha111@gmail.com",
    "Shubham":    "shubhamkapadia0@gmail.com",
    "Vinoth":     "vinothdkumar7@gmail.com",
    "Bharath":    "Pillak@google.com",
}

# ── New studies to create for Lohithaksh ───────────────────────────────────────
LOHITHAKSH_EMAILS = [
    "lohitl57@gmail.com",
    "lohitvk18@gmail.com",
    "lohithakshvasa@gmail.com",
]

NEW_STUDIES = [
    # Lohithaksh
    {"id": "6012345", "name": "Google Lens Visual Search Study",      "researcher": "Asha Verma",      "rc": "Lohithaksh", "total_required": 30},
    {"id": "6123456", "name": "Pixel Watch Health Features UX",       "researcher": "Vikram Bhat",     "rc": "Lohithaksh", "total_required": 40},
    {"id": "6234567", "name": "Google TV Interface Research",         "researcher": "Sunita Rao",      "rc": "Lohithaksh", "total_required": 35},
    # Vinoth
    {"id": "6345678", "name": "Google Maps AR Navigation Study",      "researcher": "Kavya Reddy",     "rc": "Vinoth",     "total_required": 40},
    {"id": "6456789", "name": "Google Translate UX Research",         "researcher": "Harish Kumar",    "rc": "Vinoth",     "total_required": 35},
    {"id": "6567890", "name": "Chrome Extensions Usability Study",    "researcher": "Meena Iyer",      "rc": "Vinoth",     "total_required": 30},
    # Bharath
    {"id": "6678901", "name": "Google Classroom UX Evaluation",       "researcher": "Divya Krishnan",  "rc": "Bharath",    "total_required": 45},
    {"id": "6789123", "name": "Google One Storage UX Study",          "researcher": "Rajan Pillai",    "rc": "Bharath",    "total_required": 30},
    {"id": "6890234", "name": "Android Notification Design Research", "researcher": "Suma Nair",       "rc": "Bharath",    "total_required": 35},
]

PARTICIPANT_NAMES = [
    "Arjun Mehta", "Priya Sharma", "Kiran Kumar",
    "Divya Patel",  "Rahul Singh",  "Sneha Reddy",
    "Vijay Nair",   "Anu Krishnan", "Suresh Iyer",
]


# ── Salesforce helpers ──────────────────────────────────────────────────────────

def connect():
    consumer_key    = os.getenv("SF_CONSUMER_KEY")
    consumer_secret = os.getenv("SF_CONSUMER_SECRET")
    instance_url    = os.getenv("SF_INSTANCE_URL", "").rstrip("/")

    if not consumer_key or not consumer_secret:
        print("ERROR: SF_CONSUMER_KEY and SF_CONSUMER_SECRET must be set in .env")
        sys.exit(1)

    resp = requests.post(f"{instance_url}/services/oauth2/token", data={
        "grant_type":    "client_credentials",
        "client_id":     consumer_key,
        "client_secret": consumer_secret,
    }, timeout=15)

    if not resp.ok:
        print(f"ERROR: SF auth failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    data = resp.json()
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {data['access_token']}",
        "Content-Type":  "application/json",
    })
    base = f"{data['instance_url']}/services/data/v{API_VERSION}"
    print(f"Connected → {data['instance_url']}\n")
    return session, base


def query(session, base, soql):
    resp = session.get(f"{base}/query/", params={"q": soql}, timeout=15)
    if resp.ok:
        return resp.json().get("records", [])
    print(f"  QUERY ERROR: {resp.status_code} {resp.text[:200]}")
    return []


def patch(session, base, sobject, record_id, data):
    resp = session.patch(f"{base}/sobjects/{sobject}/{record_id}", json=data, timeout=15)
    return resp.ok


def post(session, base, sobject, data):
    resp = session.post(f"{base}/sobjects/{sobject}/", json=data, timeout=15)
    if resp.ok:
        return resp.json().get("id")
    print(f"  POST ERROR: {resp.status_code} {resp.text[:200]}")
    return None


# ── Job 1: Create new Lohithaksh studies ───────────────────────────────────────

def create_new_studies(session, base):
    print("=" * 60)
    print("JOB 1: Create new studies (Lohithaksh, Vinoth, Bharath)")
    print("=" * 60)

    for study in NEW_STUDIES:
        print(f"\nStudy: {study['name']} (#{study['id']})")

        existing = query(session, base,
            f"SELECT Id FROM UXR_Study__c WHERE Study_ID__c = '{study['id']}' LIMIT 1")
        if existing:
            sf_id = existing[0]["Id"]
            print(f"  Already exists (SF ID: {sf_id}) — skipping participants")
            continue
        else:
            sf_id = post(session, base, "UXR_Study__c", {
                "Name":               study["name"],
                "Study_ID__c":        study["id"],
                "Researcher__c":      study["researcher"],
                "RC_Name__c":         study["rc"],
                "Status__c":          "Active",
                "Total_Required__c":  study["total_required"],
                "Already_Sent__c":    0,
                "P0_Ready__c":        9,
                "P0_Newly_Marked__c": 9,
            })
            if not sf_id:
                continue
            print(f"  Created → SF ID: {sf_id}")

        rc = study["rc"]
        if rc == "Lohithaksh":
            email_pool = LOHITHAKSH_EMAILS
        else:
            single_email = RC_EMAILS.get(rc)
            email_pool = [single_email] if single_email else ["test@example.com"]

        print(f"  Adding 9 participants...")
        for i, name in enumerate(PARTICIPANT_NAMES):
            email = email_pool[i % len(email_pool)]
            pid = post(session, base, "UXR_Participant__c", {
                "Name":              name,
                "Participant_ID__c": f"P-{study['id']}-{(i+1):02d}",
                "Email__c":          email,
                "Status__c":         "Shortlisted",
                "Invite_Sent__c":    False,
                "Study__c":          sf_id,
            })
            if pid:
                print(f"    + {name} ({email})")


# ── Job 2: Update participant emails per RC ─────────────────────────────────────

def update_rc_emails(session, base):
    print("\n" + "=" * 60)
    print("JOB 2: Update participant emails per RC")
    print("=" * 60)

    # Single-email RCs
    for rc_name, email in RC_EMAILS.items():
        print(f"\nRC: {rc_name} → {email}")

        studies = query(session, base,
            f"SELECT Id, Name, Study_ID__c FROM UXR_Study__c WHERE RC_Name__c = '{rc_name}'")

        if not studies:
            print(f"  No studies found for {rc_name}")
            continue

        for study in studies:
            sf_study_id = study["Id"]
            study_name  = study.get("Name", study.get("Study_ID__c", ""))

            participants = query(session, base,
                f"SELECT Id, Name FROM UXR_Participant__c WHERE Study__c = '{sf_study_id}'")

            if not participants:
                print(f"  [{study_name}] No participants")
                continue

            updated = 0
            for p in participants:
                ok = patch(session, base, "UXR_Participant__c", p["Id"], {"Email__c": email})
                if ok:
                    updated += 1

            print(f"  [{study_name}] Updated {updated}/{len(participants)} participants")

    # Lohithaksh — rotating emails across all studies
    print(f"\nRC: Lohithaksh → rotating {LOHITHAKSH_EMAILS}")
    lohith_studies = query(session, base,
        "SELECT Id, Name, Study_ID__c FROM UXR_Study__c WHERE RC_Name__c = 'Lohithaksh'")

    if not lohith_studies:
        print("  No studies found for Lohithaksh")
    else:
        for study in lohith_studies:
            sf_study_id = study["Id"]
            study_name  = study.get("Name", study.get("Study_ID__c", ""))

            participants = query(session, base,
                f"SELECT Id, Name FROM UXR_Participant__c WHERE Study__c = '{sf_study_id}'")

            if not participants:
                print(f"  [{study_name}] No participants")
                continue

            updated = 0
            for i, p in enumerate(participants):
                email = LOHITHAKSH_EMAILS[i % len(LOHITHAKSH_EMAILS)]
                ok = patch(session, base, "UXR_Participant__c", p["Id"], {"Email__c": email})
                if ok:
                    updated += 1

            print(f"  [{study_name}] Updated {updated}/{len(participants)} participants")


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    session, base = connect()
    create_new_studies(session, base)
    update_rc_emails(session, base)
    print("\nDone.")


if __name__ == "__main__":
    main()
