"""
In-memory mock data store matching the Angular mock data.
"""

from datetime import datetime, timedelta

# ── Allowed users (OAuth allowlist) ──────────────────────────────────────────
# Add users here or via POST /api/auth/users.  role: "admin" | "rc"

ALLOWED_USERS: list[dict] = [
    {"email": "manaswitha111@gmail.com",   "name": "Manaswitha",   "role": "rc"},
    {"email": "lohithakshvasa@gmail.com",  "name": "Lohithaksh",   "role": "rc"},
    {"email": "sarah.chen@google.com",     "name": "Sarah Chen",   "role": "rc"},
    {"email": "aakash.aidenai@gmail.com",  "name": "Aakash",       "role": "rc"},
    {"email": "shubhamkapadia0@gmail.com", "name": "Shubham",      "role": "rc"},
]

# ── Studies (keyed by study ID) ──

STUDIES: dict[str, dict] = {
    # ── Sarah Chen's studies ──
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
    # ── Lohithaksh's studies ──
    "3456789": {
        "id": "3456789",
        "name": "Search UX Satisfaction Study",
        "researcher": "Priya Nair",
        "owner_rc": "Lohithaksh",
        "total_required": 50,
        "already_sent": 20,
        "last_run": "Apr 18",
        "new_responses": 6,
        "p0_ready": 8,
        "p0_newly_marked": 3,
    },
    "4567890": {
        "id": "4567890",
        "name": "Maps Navigation Feedback",
        "researcher": "Arjun Menon",
        "owner_rc": "Lohithaksh",
        "total_required": 35,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 10,
        "p0_newly_marked": 10,
    },
    "5678901": {
        "id": "5678901",
        "name": "Google Pay Checkout Flow",
        "researcher": "Divya Sharma",
        "owner_rc": "Lohithaksh",
        "total_required": 25,
        "already_sent": 10,
        "last_run": "Apr 20",
        "new_responses": 3,
        "p0_ready": 4,
        "p0_newly_marked": 1,
    },
    "5789012": {
        "id": "5789012",
        "name": "Gmail Compose Experience Study",
        "researcher": "Kiran Reddy",
        "owner_rc": "Lohithaksh",
        "total_required": 40,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 11,
        "p0_newly_marked": 11,
    },
    "5890123": {
        "id": "5890123",
        "name": "Google Drive Mobile UX Research",
        "researcher": "Tanvi Shah",
        "owner_rc": "Lohithaksh",
        "total_required": 30,
        "already_sent": 18,
        "last_run": "Apr 21",
        "new_responses": 4,
        "p0_ready": 5,
        "p0_newly_marked": 0,
    },
    "5901234": {
        "id": "5901234",
        "name": "Pixel Camera AI Features Study",
        "researcher": "Rohit Kulkarni",
        "owner_rc": "Lohithaksh",
        "total_required": 55,
        "already_sent": 30,
        "last_run": "Apr 19",
        "new_responses": 8,
        "p0_ready": 6,
        "p0_newly_marked": 2,
    },
    # ── Aakash's studies ──
    "7890123": {
        "id": "7890123",
        "name": "Chrome Browser Usability Study",
        "researcher": "Neha Gupta",
        "owner_rc": "Aakash",
        "total_required": 40,
        "already_sent": 12,
        "last_run": "Apr 15",
        "new_responses": 5,
        "p0_ready": 7,
        "p0_newly_marked": 2,
    },
    "8901234": {
        "id": "8901234",
        "name": "Google Workspace Productivity Research",
        "researcher": "Rahul Verma",
        "owner_rc": "Aakash",
        "total_required": 60,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 15,
        "p0_newly_marked": 15,
    },
    "9012345": {
        "id": "9012345",
        "name": "Android Settings UX Review",
        "researcher": "Sneha Iyer",
        "owner_rc": "Aakash",
        "total_required": 30,
        "already_sent": 8,
        "last_run": "Apr 19",
        "new_responses": 2,
        "p0_ready": 6,
        "p0_newly_marked": 0,
    },
    # ── Manaswitha's studies ──
    "1357924": {
        "id": "1357924",
        "name": "Google Search Personalization Study",
        "researcher": "Pooja Menon",
        "owner_rc": "Manaswitha",
        "total_required": 50,
        "already_sent": 18,
        "last_run": "Apr 20",
        "new_responses": 7,
        "p0_ready": 10,
        "p0_newly_marked": 3,
    },
    "2468013": {
        "id": "2468013",
        "name": "YouTube Shorts Engagement Research",
        "researcher": "Suresh Reddy",
        "owner_rc": "Manaswitha",
        "total_required": 40,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 13,
        "p0_newly_marked": 13,
    },
    "3579124": {
        "id": "3579124",
        "name": "Google Shopping UX Evaluation",
        "researcher": "Kavitha Nair",
        "owner_rc": "Manaswitha",
        "total_required": 35,
        "already_sent": 10,
        "last_run": "Apr 18",
        "new_responses": 4,
        "p0_ready": 7,
        "p0_newly_marked": 1,
    },
    "4680235": {
        "id": "4680235",
        "name": "Android Auto Interface Study",
        "researcher": "Ravi Shankar",
        "owner_rc": "Manaswitha",
        "total_required": 30,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 9,
        "p0_newly_marked": 9,
    },
    "5791346": {
        "id": "5791346",
        "name": "Google Calendar Scheduling UX",
        "researcher": "Deepa Krishnan",
        "owner_rc": "Manaswitha",
        "total_required": 45,
        "already_sent": 22,
        "last_run": "Apr 21",
        "new_responses": 6,
        "p0_ready": 8,
        "p0_newly_marked": 2,
    },
    "6802457": {
        "id": "6802457",
        "name": "Gemini AI Chat Usability Study",
        "researcher": "Arun Prasad",
        "owner_rc": "Manaswitha",
        "total_required": 60,
        "already_sent": 5,
        "last_run": "Apr 19",
        "new_responses": 2,
        "p0_ready": 14,
        "p0_newly_marked": 5,
    },
    # ── Shubham's studies ──
    "9123456": {
        "id": "9123456",
        "name": "Google Meet Accessibility Study",
        "researcher": "Ananya Singh",
        "owner_rc": "Shubham",
        "total_required": 35,
        "already_sent": 5,
        "last_run": "Apr 17",
        "new_responses": 3,
        "p0_ready": 9,
        "p0_newly_marked": 4,
    },
    "9234567": {
        "id": "9234567",
        "name": "Drive File Sharing UX Research",
        "researcher": "Vikram Joshi",
        "owner_rc": "Shubham",
        "total_required": 45,
        "already_sent": 0,
        "last_run": None,
        "new_responses": 0,
        "p0_ready": 12,
        "p0_newly_marked": 12,
    },
    "9345678": {
        "id": "9345678",
        "name": "Google Photos Smart Features Study",
        "researcher": "Meera Pillai",
        "owner_rc": "Shubham",
        "total_required": 20,
        "already_sent": 14,
        "last_run": "Apr 21",
        "new_responses": 7,
        "p0_ready": 3,
        "p0_newly_marked": 1,
    },
}

# ── Audit Runs ──

AUDIT_RUNS: list[dict] = []

# ── Scheduled Jobs (empty initially) ──

SCHEDULED_JOBS: list[dict] = []

# ── Delegations (empty initially) ──

DELEGATIONS: list[dict] = []

# ── Active send sessions (keyed by session_id) ──

SEND_STATE: dict[str, dict] = {}

# ── Welcome screen config (message + initial quick-action buttons) ──
# Edit WELCOME_CONFIG["message"] to change the greeting text shown on first load.
# Edit WELCOME_CONFIG["buttons"] to change the six contextual action buttons.

WELCOME_CONFIG: dict = {
    "message": "Hello! I can help you send invites, track participant responses, check ICF status, and more.",
    "buttons": [
        {"label": "Send invites now",   "type": "primary",   "action": "open_study_picker"},
        {"label": "Schedule invites",   "type": "primary",   "action": "open_schedule_picker"},
        {"label": "Study progress",     "type": "primary",   "action": "open_study_progress_picker"},
        {"label": "Invites remaining",  "type": "secondary", "action": "suggest", "payload": "How many invites are left?"},
        {"label": "Today's summary",    "type": "secondary", "action": "suggest", "payload": "Show today's summary"},
        {"label": "My studies",         "type": "secondary", "action": "suggest", "payload": "My studies"},
    ],
}

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

_DATES = [_five_days_ago, _four_days_ago, _three_days_ago, _two_days_ago, _yesterday, _today]
_SLOTS = ["09:00", "10:00", "11:00", "11:30", "14:00", "15:00", "16:00"]


def _make_participants(
    study_id: str,
    confirmed: int,
    booked: int,
    no_response: int,
    declined: int,
    invited: int,
) -> list[dict]:
    """Generate a realistic participant list for a study."""
    result = []
    num = 1
    slot_idx = 0

    for i in range(confirmed):
        inv_d = _DATES[i % 3]          # 5, 4, 3 days ago
        res_d = _DATES[(i % 3) + 1]   # 4, 3, 2 days ago
        slot_date = f"2026-04-{22 + (i % 8):02d}"
        slot = f"{slot_date} {_SLOTS[slot_idx % len(_SLOTS)]}"
        slot_idx += 1
        result.append({
            "id": f"P-{study_id}-{num:02d}", "study_id": study_id,
            "name": f"Participant #{num:02d}", "status": "confirmed",
            "invited_date": inv_d, "response_date": res_d,
            "booked_slot": slot, "icf_signed": True,
            "needs_reminder": False, "days_since_invite": 5 - (i % 3),
        })
        num += 1

    for i in range(booked):
        inv_d = _DATES[2 + (i % 3)]   # 3, 2, 1 days ago
        res_d = _DATES[3 + (i % 3)]   # 2, 1, 0 days ago
        slot_date = f"2026-04-{27 + (i % 5):02d}"
        slot = f"{slot_date} {_SLOTS[slot_idx % len(_SLOTS)]}"
        slot_idx += 1
        needs_r = i % 3 != 2
        result.append({
            "id": f"P-{study_id}-{num:02d}", "study_id": study_id,
            "name": f"Participant #{num:02d}", "status": "booked",
            "invited_date": inv_d, "response_date": res_d,
            "booked_slot": slot, "icf_signed": False,
            "needs_reminder": needs_r, "days_since_invite": 3 - (i % 3),
        })
        num += 1

    for i in range(no_response):
        inv_d = _DATES[i % 4]
        result.append({
            "id": f"P-{study_id}-{num:02d}", "study_id": study_id,
            "name": f"Participant #{num:02d}", "status": "no_response",
            "invited_date": inv_d, "response_date": None,
            "booked_slot": None, "icf_signed": False,
            "needs_reminder": True, "days_since_invite": 5 - (i % 4),
        })
        num += 1

    for i in range(declined):
        inv_d = _DATES[i % 3]
        res_d = _DATES[(i % 3) + 1]
        result.append({
            "id": f"P-{study_id}-{num:02d}", "study_id": study_id,
            "name": f"Participant #{num:02d}", "status": "declined",
            "invited_date": inv_d, "response_date": res_d,
            "booked_slot": None, "icf_signed": False,
            "needs_reminder": False, "days_since_invite": 5 - (i % 3),
        })
        num += 1

    for _ in range(invited):
        result.append({
            "id": f"P-{study_id}-{num:02d}", "study_id": study_id,
            "name": f"Participant #{num:02d}", "status": "invited",
            "invited_date": _today, "response_date": None,
            "booked_slot": None, "icf_signed": False,
            "needs_reminder": False, "days_since_invite": 0,
        })
        num += 1

    return result

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

    # ── Manaswitha's participants ──

    "1357924": [
        # 5 confirmed
        {"id": "P-1357924-01", "study_id": "1357924", "name": "Participant #01", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-23 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-1357924-02", "study_id": "1357924", "name": "Participant #02", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-23 11:30", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-1357924-03", "study_id": "1357924", "name": "Participant #03", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-24 09:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1357924-04", "study_id": "1357924", "name": "Participant #04", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-24 14:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1357924-05", "study_id": "1357924", "name": "Participant #05", "status": "confirmed", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-25 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 3},
        # 4 booked, ICF pending
        {"id": "P-1357924-06", "study_id": "1357924", "name": "Participant #06", "status": "booked", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-26 09:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        {"id": "P-1357924-07", "study_id": "1357924", "name": "Participant #07", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-27 11:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        {"id": "P-1357924-08", "study_id": "1357924", "name": "Participant #08", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-28 10:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        {"id": "P-1357924-09", "study_id": "1357924", "name": "Participant #09", "status": "booked", "invited_date": _yesterday, "response_date": _today, "booked_slot": "2026-04-29 14:00", "icf_signed": False, "needs_reminder": False, "days_since_invite": 1},
        # 4 no response (>48h)
        {"id": "P-1357924-10", "study_id": "1357924", "name": "Participant #10", "status": "no_response", "invited_date": _five_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 5},
        {"id": "P-1357924-11", "study_id": "1357924", "name": "Participant #11", "status": "no_response", "invited_date": _four_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 4},
        {"id": "P-1357924-12", "study_id": "1357924", "name": "Participant #12", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        {"id": "P-1357924-13", "study_id": "1357924", "name": "Participant #13", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 3 declined
        {"id": "P-1357924-14", "study_id": "1357924", "name": "Participant #14", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1357924-15", "study_id": "1357924", "name": "Participant #15", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-1357924-16", "study_id": "1357924", "name": "Participant #16", "status": "declined", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 5},
        # 2 recently invited (today)
        {"id": "P-1357924-17", "study_id": "1357924", "name": "Participant #17", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
        {"id": "P-1357924-18", "study_id": "1357924", "name": "Participant #18", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
    ],

    "3579124": [
        # 3 confirmed
        {"id": "P-3579124-01", "study_id": "3579124", "name": "Participant #01", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-23 09:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-3579124-02", "study_id": "3579124", "name": "Participant #02", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-24 11:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-3579124-03", "study_id": "3579124", "name": "Participant #03", "status": "confirmed", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-26 14:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 3},
        # 3 booked, ICF pending
        {"id": "P-3579124-04", "study_id": "3579124", "name": "Participant #04", "status": "booked", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-27 10:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        {"id": "P-3579124-05", "study_id": "3579124", "name": "Participant #05", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-28 09:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        {"id": "P-3579124-06", "study_id": "3579124", "name": "Participant #06", "status": "booked", "invited_date": _yesterday, "response_date": _today, "booked_slot": "2026-04-29 11:00", "icf_signed": False, "needs_reminder": False, "days_since_invite": 1},
        # 2 no response
        {"id": "P-3579124-07", "study_id": "3579124", "name": "Participant #07", "status": "no_response", "invited_date": _four_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 4},
        {"id": "P-3579124-08", "study_id": "3579124", "name": "Participant #08", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 2 declined
        {"id": "P-3579124-09", "study_id": "3579124", "name": "Participant #09", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-3579124-10", "study_id": "3579124", "name": "Participant #10", "status": "declined", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 5},
    ],

    "5791346": [
        # 8 confirmed
        {"id": "P-5791346-01", "study_id": "5791346", "name": "Participant #01", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-23 09:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-5791346-02", "study_id": "5791346", "name": "Participant #02", "status": "confirmed", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": "2026-04-23 11:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-5791346-03", "study_id": "5791346", "name": "Participant #03", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-24 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-5791346-04", "study_id": "5791346", "name": "Participant #04", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-24 14:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-5791346-05", "study_id": "5791346", "name": "Participant #05", "status": "confirmed", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-25 09:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 3},
        {"id": "P-5791346-06", "study_id": "5791346", "name": "Participant #06", "status": "confirmed", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-25 11:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 3},
        {"id": "P-5791346-07", "study_id": "5791346", "name": "Participant #07", "status": "confirmed", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-26 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 2},
        {"id": "P-5791346-08", "study_id": "5791346", "name": "Participant #08", "status": "confirmed", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-26 14:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 2},
        # 5 booked, ICF pending
        {"id": "P-5791346-09", "study_id": "5791346", "name": "Participant #09", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-27 09:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        {"id": "P-5791346-10", "study_id": "5791346", "name": "Participant #10", "status": "booked", "invited_date": _yesterday, "response_date": _today, "booked_slot": "2026-04-28 10:00", "icf_signed": False, "needs_reminder": False, "days_since_invite": 1},
        {"id": "P-5791346-11", "study_id": "5791346", "name": "Participant #11", "status": "booked", "invited_date": _yesterday, "response_date": _today, "booked_slot": "2026-04-28 14:00", "icf_signed": False, "needs_reminder": False, "days_since_invite": 1},
        {"id": "P-5791346-12", "study_id": "5791346", "name": "Participant #12", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-29 09:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        {"id": "P-5791346-13", "study_id": "5791346", "name": "Participant #13", "status": "booked", "invited_date": _three_days_ago, "response_date": _two_days_ago, "booked_slot": "2026-04-29 11:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 4 no response
        {"id": "P-5791346-14", "study_id": "5791346", "name": "Participant #14", "status": "no_response", "invited_date": _five_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 5},
        {"id": "P-5791346-15", "study_id": "5791346", "name": "Participant #15", "status": "no_response", "invited_date": _four_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 4},
        {"id": "P-5791346-16", "study_id": "5791346", "name": "Participant #16", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        {"id": "P-5791346-17", "study_id": "5791346", "name": "Participant #17", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 3 declined
        {"id": "P-5791346-18", "study_id": "5791346", "name": "Participant #18", "status": "declined", "invited_date": _five_days_ago, "response_date": _four_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 5},
        {"id": "P-5791346-19", "study_id": "5791346", "name": "Participant #19", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        {"id": "P-5791346-20", "study_id": "5791346", "name": "Participant #20", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        # 2 recently invited
        {"id": "P-5791346-21", "study_id": "5791346", "name": "Participant #21", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
        {"id": "P-5791346-22", "study_id": "5791346", "name": "Participant #22", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
    ],

    "6802457": [
        # 1 confirmed
        {"id": "P-6802457-01", "study_id": "6802457", "name": "Participant #01", "status": "confirmed", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": "2026-04-25 10:00", "icf_signed": True, "needs_reminder": False, "days_since_invite": 4},
        # 1 booked, ICF pending
        {"id": "P-6802457-02", "study_id": "6802457", "name": "Participant #02", "status": "booked", "invited_date": _two_days_ago, "response_date": _yesterday, "booked_slot": "2026-04-28 11:00", "icf_signed": False, "needs_reminder": True, "days_since_invite": 2},
        # 1 no response
        {"id": "P-6802457-03", "study_id": "6802457", "name": "Participant #03", "status": "no_response", "invited_date": _three_days_ago, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": True, "days_since_invite": 3},
        # 1 declined
        {"id": "P-6802457-04", "study_id": "6802457", "name": "Participant #04", "status": "declined", "invited_date": _four_days_ago, "response_date": _three_days_ago, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 4},
        # 1 recently invited
        {"id": "P-6802457-05", "study_id": "6802457", "name": "Participant #05", "status": "invited", "invited_date": _today, "response_date": None, "booked_slot": None, "icf_signed": False, "needs_reminder": False, "days_since_invite": 0},
    ],

    # ── Sarah Chen – YouTube Premium UX Research (0 sent, fresh study) ──
    "2345678": _make_participants("2345678", confirmed=0, booked=0, no_response=0, declined=0, invited=3),

    # ── Lohithaksh's studies ──
    # Search UX Satisfaction Study – 20 sent
    "3456789": _make_participants("3456789", confirmed=8, booked=4, no_response=4, declined=3, invited=2),
    # Maps Navigation Feedback – 0 sent, fresh
    "4567890": _make_participants("4567890", confirmed=0, booked=0, no_response=0, declined=0, invited=2),
    # Google Pay Checkout Flow – 10 sent
    "5678901": _make_participants("5678901", confirmed=4, booked=2, no_response=2, declined=2, invited=1),
    # Gmail Compose Experience Study – 0 sent, fresh
    "5789012": _make_participants("5789012", confirmed=0, booked=0, no_response=0, declined=0, invited=2),
    # Google Drive Mobile UX Research – 18 sent
    "5890123": _make_participants("5890123", confirmed=7, booked=3, no_response=4, declined=3, invited=2),
    # Pixel Camera AI Features Study – 30 sent
    "5901234": _make_participants("5901234", confirmed=12, booked=5, no_response=6, declined=5, invited=2),

    # ── Aakash's studies ──
    # Chrome Browser Usability Study – 12 sent
    "7890123": _make_participants("7890123", confirmed=5, booked=3, no_response=2, declined=2, invited=1),
    # Google Workspace Productivity Research – 0 sent, fresh
    "8901234": _make_participants("8901234", confirmed=0, booked=0, no_response=0, declined=0, invited=3),
    # Android Settings UX Review – 8 sent
    "9012345": _make_participants("9012345", confirmed=3, booked=2, no_response=2, declined=1, invited=1),

    # ── Manaswitha's studies ──
    # YouTube Shorts Engagement Research – 0 sent, fresh
    "2468013": _make_participants("2468013", confirmed=0, booked=0, no_response=0, declined=0, invited=2),
    # Android Auto Interface Study – 0 sent, fresh
    "4680235": _make_participants("4680235", confirmed=0, booked=0, no_response=0, declined=0, invited=2),

    # ── Shubham's studies ──
    # Google Meet Accessibility Study – 5 sent
    "9123456": _make_participants("9123456", confirmed=2, booked=1, no_response=1, declined=1, invited=1),
    # Drive File Sharing UX Research – 0 sent, fresh
    "9234567": _make_participants("9234567", confirmed=0, booked=0, no_response=0, declined=0, invited=2),
    # Google Photos Smart Features Study – 14 sent
    "9345678": _make_participants("9345678", confirmed=6, booked=3, no_response=3, declined=2, invited=1),
}

# ── UXR → RC shortlisting events (UXR randomly selects P0 candidates and notifies RC) ──
# Simulates the workflow where UXR shortlists P0s, then RC sends invites.

UXR_SHORTLISTING_EVENTS: list[dict] = [
    {
        "event_id": "UXR-EVT-001",
        "study_id": "1234567",
        "study_name": "Global Ads Experience Survey",
        "uxr_name": "Sarah Johnson",
        "date": _today,
        "p0_newly_shortlisted": 5,
        "p0_total_shortlisted": 15,
        "sent_to_rc": "Sarah Chen",
        "notified_at": "09:45",
    },
    {
        "event_id": "UXR-EVT-002",
        "study_id": "3456789",
        "study_name": "Search UX Satisfaction Study",
        "uxr_name": "Priya Nair",
        "date": _today,
        "p0_newly_shortlisted": 3,
        "p0_total_shortlisted": 8,
        "sent_to_rc": "Lohithaksh",
        "notified_at": "10:15",
    },
    {
        "event_id": "UXR-EVT-003",
        "study_id": "7890123",
        "study_name": "Chrome Browser Usability Study",
        "uxr_name": "Neha Gupta",
        "date": _today,
        "p0_newly_shortlisted": 4,
        "p0_total_shortlisted": 7,
        "sent_to_rc": "Aakash",
        "notified_at": "11:00",
    },
]

# ── Daily activity aggregate used for EOD Salesforce note generation ──
# These numbers reflect the full day: UXR shortlisting, RC invite sends,
# participant booking/cancellation/rescheduling, and pre-screening activity.

DAILY_ACTIVITY: dict = {
    "date": _today,
    "p0_shortlisted_total": 0,
    "invites_sent_today": 0,
    "appointments_booked": 0,
    "appointments_cancelled": 0,
    "appointments_rescheduled": 0,
    "prescreening_interviews_completed": 0,
    "prescreening_invited": 0,
    "prescreening_cancelled": 0,
    "prescreening_rescheduled": 0,
}

# ── Counter for generating unique IDs ──

_counter: int = 0


def next_id(prefix: str = "SES") -> str:
    global _counter
    _counter += 1
    ts = datetime.now().strftime("%H%M%S")
    return f"{prefix}-{ts}-{_counter:03d}"
