"""
In-memory mock data store matching the Angular mock data.
"""

from datetime import datetime, timedelta

# ── Studies (keyed by study ID) ──

STUDIES: dict[str, dict] = {
    "1234567": {
        "id": "1234567",
        "name": "Global Ads Experience Survey",
        "researcher": "Sarah Johnson",
        "owner_rc": "Sarah Chen",
        "total_required": 45,
        "already_sent": 15,
        "last_run": "Apr 12",
        "new_responses": 4,
        "p0_ready": 12,
        "p0_newly_marked": 2,
    },
    "2345678": {
        "id": "2345678",
        "name": "YouTube Premium UX Research",
        "researcher": "David Kim",
        "owner_rc": "Sarah Chen",
        "total_required": 30,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 5,
        "p0_newly_marked": 5,
    },
    "6789012": {
        "id": "6789012",
        "name": "Assistant Voice Interface Study",
        "researcher": "Robert Taylor",
        "owner_rc": "Sarah Chen",
        "total_required": 40,
        "already_sent": 5,
        "last_run": "Apr 8",
        "new_responses": 2,
        "p0_ready": 5,
        "p0_newly_marked": 0,
    },
}

# ── Audit Runs ──

AUDIT_RUNS: list[dict] = [
    {
        "id": "RUN-0412-001",
        "study_id": "1234567",
        "study_name": "Global Ads Experience Survey",
        "date": "2026-04-12",
        "rc": "Sarah Chen",
        "sent": 10,
        "failed": 0,
        "status": "completed",
        "duration": "4m 12s",
        "sla": True,
    },
    {
        "id": "RUN-0408-001",
        "study_id": "6789012",
        "study_name": "Assistant Voice Interface Study",
        "date": "2026-04-08",
        "rc": "Sarah Chen",
        "sent": 5,
        "failed": 0,
        "status": "completed",
        "duration": "2m 10s",
        "sla": True,
    },
    {
        "id": "RUN-0405-001",
        "study_id": "1234567",
        "study_name": "Global Ads Experience Survey",
        "date": "2026-04-05",
        "rc": "Sarah Chen",
        "sent": 5,
        "failed": 0,
        "status": "completed",
        "duration": "1m 20s",
        "sla": True,
    },
]

# ── Scheduled Jobs (empty initially) ──

SCHEDULED_JOBS: list[dict] = []

# ── Delegations (empty initially) ──

DELEGATIONS: list[dict] = []

# ── Active send sessions (keyed by session_id) ──

SEND_STATE: dict[str, dict] = {}

# ── Preferences ──

PREFERENCES: dict = {
    "allow_cross_rc_send": True,
    "default_batch_size": 10,
    "notification_email": "",
}

# ── Participants (keyed by study_id) ──

_now = datetime.now()
_today = _now.strftime("%Y-%m-%d")
_yesterday = (_now - timedelta(days=1)).strftime("%Y-%m-%d")
_two_days_ago = (_now - timedelta(days=2)).strftime("%Y-%m-%d")
_three_days_ago = (_now - timedelta(days=3)).strftime("%Y-%m-%d")
_four_days_ago = (_now - timedelta(days=4)).strftime("%Y-%m-%d")
_five_days_ago = (_now - timedelta(days=5)).strftime("%Y-%m-%d")

PARTICIPANTS: dict[str, list[dict]] = {
    "1234567": [
        # 6 confirmed (booked + ICF signed)
        {"id": "P-1234567-01", "study_id": "1234567", "name": "Participant #01", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-21 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-1234567-02", "study_id": "1234567", "name": "Participant #02", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-21 11:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-1234567-03", "study_id": "1234567", "name": "Participant #03", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-22 09:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1234567-04", "study_id": "1234567", "name": "Participant #04", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-22 14:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1234567-05", "study_id": "1234567", "name": "Participant #05", "status": "confirmed", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-23 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 3},
        {"id": "P-1234567-06", "study_id": "1234567", "name": "Participant #06", "status": "confirmed", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-23 15:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 3},
        # 3 booked but ICF pending
        {"id": "P-1234567-07", "study_id": "1234567", "name": "Participant #07", "status": "booked", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-24 09:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        {"id": "P-1234567-08", "study_id": "1234567", "name": "Participant #08", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-24 11:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        {"id": "P-1234567-09", "study_id": "1234567", "name": "Participant #09", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-25 10:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        # 2 no response (invited >48h ago)
        {"id": "P-1234567-10", "study_id": "1234567", "name": "Participant #10", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        {"id": "P-1234567-11", "study_id": "1234567", "name": "Participant #11", "status": "no_response", "invited_date": _four_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 4},
        # 2 declined
        {"id": "P-1234567-12", "study_id": "1234567", "name": "Participant #12", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1234567-13", "study_id": "1234567", "name": "Participant #13", "status": "declined", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 5},
        # 2 recently invited (<24h, still waiting)
        {"id": "P-1234567-14", "study_id": "1234567", "name": "Participant #14", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
        {"id": "P-1234567-15", "study_id": "1234567", "name": "Participant #15", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
    ],
    "6789012": [
        # 2 confirmed
        {"id": "P-6789012-01", "study_id": "6789012", "name": "Participant #01", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-22 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-6789012-02", "study_id": "6789012", "name": "Participant #02", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-22 14:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        # 1 booked, ICF pending
        {"id": "P-6789012-03", "study_id": "6789012", "name": "Participant #03", "status": "booked", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-23 09:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 1 no response
        {"id": "P-6789012-04", "study_id": "6789012", "name": "Participant #04", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 1 declined
        {"id": "P-6789012-05", "study_id": "6789012", "name": "Participant #05", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
    ],
}

# ── Counter for generating unique IDs ──

_counter: int = 0


def next_id(prefix: str = "SES") -> str:
    global _counter
    _counter += 1
    ts = datetime.now().strftime("%H%M%S")
    return f"{prefix}-{ts}-{_counter:03d}"
