"""
Command parser / intent classifier.
In mock mode uses regex matching; in production would call Gemini Flash.
"""

import re
from dataclasses import dataclass, field


@dataclass
class ParsedCommand:
    intent: str
    study_id: str | None = None
    count: int | None = None
    scheduled_time: str | None = None
    raw_text: str = ""
    params: dict = field(default_factory=dict)


def parse_command(text: str) -> ParsedCommand:
    lower = text.lower().strip()

    # ── Schedule: "send N invites for study XXXXXXX tomorrow at 9am" ──
    schedule_re = re.compile(
        r"send\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})"
        r".*?"
        r"((?:tomorrow|today|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:,?\s*\d{4})?)"
        r"\s+(?:at\s+)?(\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?))",
        re.IGNORECASE,
    )
    m = schedule_re.search(lower)
    if m:
        count = int(m.group(1))
        study_id = m.group(2)
        date_part = m.group(3).strip()
        time_part = m.group(4).strip() if m.group(4) else ""
        scheduled_str = f"{date_part} at {time_part}".strip() if time_part else date_part
        return ParsedCommand(
            intent="schedule",
            study_id=study_id,
            count=count,
            scheduled_time=scheduled_str,
            raw_text=text,
        )

    # ── Send invite: "send N invites for study XXXXXXX" ──
    invite_re = re.compile(
        r"send\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})",
        re.IGNORECASE,
    )
    m = invite_re.search(lower)
    if m:
        return ParsedCommand(
            intent="send_invite",
            study_id=m.group(2),
            count=int(m.group(1)),
            raw_text=text,
        )

    # ── Status query: "status of study XXXXXXX" ──
    status_re = re.compile(
        r"status\s+(?:of\s+)?(?:case|study)?\s*(\d{7})",
        re.IGNORECASE,
    )
    m = status_re.search(lower)
    if m:
        return ParsedCommand(
            intent="status_query",
            study_id=m.group(1),
            raw_text=text,
        )

    # ── Daily summary ──
    if "today" in lower and "summar" in lower:
        return ParsedCommand(intent="daily_summary", raw_text=text)

    # ── Pending studies ──
    if "pending" in lower:
        return ParsedCommand(intent="pending_studies", raw_text=text)

    # ── Failure report ──
    if "fail" in lower or "error" in lower:
        return ParsedCommand(intent="failure_report", raw_text=text)

    # ── Confirmed count (must be before invites_remaining to avoid "how many" conflict) ──
    if re.search(r"confirm(?:ed)?|locked.?in", lower):
        sid_match = re.search(r"(\d{7})", lower)
        if sid_match:
            return ParsedCommand(intent="confirmed_count", study_id=sid_match.group(1), raw_text=text)

    # ── Invites remaining ──
    remaining_re = re.compile(
        r"how many|invites?\s+left|remaining invite|left to send|"
        r"still need to send|invites?\s+remaining|how much left|how many more",
        re.IGNORECASE,
    )
    if remaining_re.search(lower):
        study_match = re.search(r"(?:for\s+)?(?:study|case)?\s*(\d{7})", lower)
        return ParsedCommand(
            intent="invites_remaining",
            study_id=study_match.group(1) if study_match else None,
            raw_text=text,
        )

    # ── Scheduled jobs query ──
    sched_query_re = re.compile(
        r"when.*schedul|schedul.*send|my schedul|scheduled job|"
        r"upcoming send|scheduled invite|show.*schedul",
        re.IGNORECASE,
    )
    if sched_query_re.search(lower):
        return ParsedCommand(intent="scheduled_query", raw_text=text)

    # ── My studies ──
    my_studies_re = re.compile(
        r"my studies|all studies|show studies|list studies|which studies|show all",
        re.IGNORECASE,
    )
    if my_studies_re.search(lower):
        return ParsedCommand(intent="my_studies", raw_text=text)

    # ── Study progress: "progress for study 1234567" or "study progress 1234567" ──
    progress_re = re.compile(
        r"progress\s+(?:for\s+)?(?:study|case)?\s*(\d{7})|"
        r"(?:study\s+)?progress\s+(\d{7})",
        re.IGNORECASE,
    )
    m = progress_re.search(lower)
    if m:
        sid = m.group(1) or m.group(2)
        if sid:
            return ParsedCommand(intent="study_progress", study_id=sid, raw_text=text)

    # ── Responses: "who responded to study 1234567" or "responses for 1234567" ──
    if re.search(r"respond|response", lower):
        sid_match = re.search(r"(\d{7})", lower)
        if sid_match:
            return ParsedCommand(intent="responses", study_id=sid_match.group(1), raw_text=text)

    # ── Bookings: "who booked for study 1234567" ──
    if re.search(r"book(?:ed|ing)?|calendar|slot", lower):
        sid_match = re.search(r"(\d{7})", lower)
        if sid_match:
            return ParsedCommand(intent="bookings", study_id=sid_match.group(1), raw_text=text)

    # ── ICF status: "icf status for study 1234567" ──
    if re.search(r"\bicf\b|consent|who\s+signed", lower):
        sid_match = re.search(r"(\d{7})", lower)
        if sid_match:
            return ParsedCommand(intent="icf_status", study_id=sid_match.group(1), raw_text=text)

    # ── Reminders needed: "who needs a reminder for study 1234567" ──
    if re.search(r"remind|follow.?up|non.?respond", lower):
        sid_match = re.search(r"(\d{7})", lower)
        if sid_match:
            return ParsedCommand(intent="reminders_needed", study_id=sid_match.group(1), raw_text=text)

    # ── Help ──
    help_re = re.compile(
        r"^help$|what can you do|what do you know|available commands|^commands$",
        re.IGNORECASE,
    )
    if help_re.search(lower):
        return ParsedCommand(intent="help", raw_text=text)

    # ── Unknown ──
    return ParsedCommand(intent="unknown", raw_text=text)
