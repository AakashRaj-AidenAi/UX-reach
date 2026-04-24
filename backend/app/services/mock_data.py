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
