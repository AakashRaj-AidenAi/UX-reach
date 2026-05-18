"""
Intent classifier for UXReach chat.
Primary: Vertex AI Generative Model (structured JSON output).
Fallback: regex-based parser (used when Vertex AI is unavailable or not configured).
"""

import os
import re
import json
import logging
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)

# ── Vertex AI client (lazy-initialised) ──────────────────────────────────────

_vertex_client = None


def _get_vertex_client():
    global _vertex_client
    project = os.getenv("VERTEX_PROJECT", "")
    location = os.getenv("VERTEX_LOCATION", "us-central1")
    if not project or project == "your-gcp-project-id":
        return None
    if _vertex_client is not None:
        return _vertex_client
    try:
        from google import genai
        _vertex_client = genai.Client(vertexai=True, project=project, location=location)
        logger.info(f"Vertex AI client initialised (project={project}, location={location})")
        return _vertex_client
    except Exception as exc:
        logger.warning(f"Vertex AI init failed: {exc}")
        return None


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class ParsedCommand:
    intent: str
    study_id: str | None = None
    count: int | None = None
    scheduled_time: str | None = None
    raw_text: str = ""
    params: dict = field(default_factory=dict)


# ── Classification prompt ─────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an intent classifier for UXReach, a UX Research outreach platform used by
Research Coordinators (RCs) at CTS (Google's UX Ads team) to manage study invitations,
track participant responses, and coordinate UX research studies.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GUARD RAILS — READ FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You ONLY classify messages that are about UXReach tasks (sending invites, tracking
participants, study status, scheduling, EOD updates, ICF, reminders, etc.).

If the message is off-topic (general knowledge, coding, weather, jokes, math,
personal advice, news, or anything unrelated to UX research coordination),
classify it as "off_topic".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPO & PHRASING TOLERANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Be lenient with:
- Spelling mistakes: "invtes", "studie", "scheudle", "rechedule", "sumary", "statuss"
- Informal phrasing: "shoot out invites", "fire off emails", "check up on study"
- Different word order: "for study 1234567 send 5 invites"
- Shorthand: "st 1234567", "case 1234567", "#1234567"
- Missing words: "send invites 1234567", "status 1234567", "progress 1234567"
- Conversational: "can you send", "I want to send", "please send", "go ahead and send"
- Partial commands: "send invites" (no study_id → still send_invite with null study_id)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPPORTED INTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- greeting          → hi, hello, hey, good morning, how are you, what's up, yo
- send_invite       → send/shoot/fire invites or emails for a study (study_id may be null if not mentioned)
- send_all_p0s      → send invites for ALL P0s / all shortlisted / all ready-to-schedule candidates
- schedule          → schedule invites for a future date/time
- status_query      → status, overview, update of a specific study
- daily_summary     → today's summary, what happened today, daily recap
- eod_update        → end-of-day update, EOD, EOD summary, daily update draft
- post_eod_note     → post/confirm EOD note to Salesforce, "looks good post it", "confirm post", "post daily update"
- edit_eod_note     → edit EOD draft, "edit this summary", "I want to make changes", "modify the draft"
- pending_studies   → which studies need invites, what's pending, outstanding studies
- failure_report    → failures, errors, what went wrong, failed sends
- invites_remaining → how many left, remaining invites, how much more to send
- scheduled_query   → show scheduled jobs, upcoming sends, what's scheduled
- my_studies        → my studies, all studies, list studies, show all
- study_progress    → full progress/funnel for a study (confirmed, booked, ICF, etc.)
- responses         → who responded, response rate, participant responses
- bookings          → who booked, calendar slots, appointments booked
- icf_status        → ICF signed, consent form status, who signed
- reminders_needed  → who needs a reminder, follow-ups, non-responders
- confirmed_count   → how many confirmed, locked in, ready to interview
- candidate_reply   → draft a reply to a participant, resend ICF link, prepare email draft
- help              → help, what can you do, commands, capabilities, how do I use this

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNSUPPORTED INTENTS (refuse politely)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- unsupported_template   → modify/edit/change/customize the email invite template
- unsupported_assign     → assign a case/study to self
- unsupported_ownership  → change UXR, researcher, or study owner
- unsupported_delete     → remove/delete a candidate from a study
- unsupported_create     → create a new study
- unsupported_pii        → export/download emails, PII, or CSV of candidates
- unsupported_incentive  → change/increase incentive amount
- unsupported_external   → send update/report to personal/external email
- unsupported_reschedule → reschedule a candidate's interview slot

- off_topic         → anything not related to UX research coordination
- unknown           → UXReach-related but impossible to classify above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON only, no markdown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "intent": "<intent>",
  "study_id": "<7-digit string or null>",
  "count": <integer or null>,
  "scheduled_time": "<string or null>"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES (varied phrasings — learn from these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"send 10 invites for study 1234567"            → {"intent":"send_invite","study_id":"1234567","count":10,"scheduled_time":null}
"shoot out 5 invtes for case 1234567"          → {"intent":"send_invite","study_id":"1234567","count":5,"scheduled_time":null}
"send the invites"                             → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"send invites"                                 → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"can you send invites"                         → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"send the invites now"                         → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"go ahead and send the invites"                → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"i want to send invites"                       → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"send emails to participants"                  → {"intent":"send_invite","study_id":null,"count":null,"scheduled_time":null}
"i want to send some emails for 1234567"       → {"intent":"send_invite","study_id":"1234567","count":null,"scheduled_time":null}
"fire off 3 invitations for st 2345678"        → {"intent":"send_invite","study_id":"2345678","count":3,"scheduled_time":null}
"please send invites for study 1234567"        → {"intent":"send_invite","study_id":"1234567","count":null,"scheduled_time":null}
"go ahead and send 10 emails for 1234567"      → {"intent":"send_invite","study_id":"1234567","count":10,"scheduled_time":null}
"send invites for all p0s for 1234567"         → {"intent":"send_all_p0s","study_id":"1234567","count":null,"scheduled_time":null}
"send invites for all shortlisted candidates"  → {"intent":"send_all_p0s","study_id":null,"count":null,"scheduled_time":null}
"scheudle 5 invites for 1234567 tomorrow 9am"  → {"intent":"schedule","study_id":"1234567","count":5,"scheduled_time":"tomorrow at 9am"}
"set up a scheduled send for study 1234567 next monday 10am" → {"intent":"schedule","study_id":"1234567","count":null,"scheduled_time":"next monday at 10am"}
"whats the status of 1234567"                  → {"intent":"status_query","study_id":"1234567","count":null,"scheduled_time":null}
"how is study 1234567 doing"                   → {"intent":"status_query","study_id":"1234567","count":null,"scheduled_time":null}
"statuss for case 2345678"                     → {"intent":"status_query","study_id":"2345678","count":null,"scheduled_time":null}
"what happened today"                          → {"intent":"daily_summary","study_id":null,"count":null,"scheduled_time":null}
"give me a sumary of today"                    → {"intent":"daily_summary","study_id":null,"count":null,"scheduled_time":null}
"show me my EOD update"                        → {"intent":"eod_update","study_id":null,"count":null,"scheduled_time":null}
"end of day summary"                           → {"intent":"eod_update","study_id":null,"count":null,"scheduled_time":null}
"looks good post it"                           → {"intent":"post_eod_note","study_id":null,"count":null,"scheduled_time":null}
"post eod to salesforce"                       → {"intent":"post_eod_note","study_id":null,"count":null,"scheduled_time":null}
"confirm and post daily update"                → {"intent":"post_eod_note","study_id":null,"count":null,"scheduled_time":null}
"edit eod draft"                               → {"intent":"edit_eod_note","study_id":null,"count":null,"scheduled_time":null}
"I want to edit the summary"                   → {"intent":"edit_eod_note","study_id":null,"count":null,"scheduled_time":null}
"which studies are pending"                    → {"intent":"pending_studies","study_id":null,"count":null,"scheduled_time":null}
"what studies need invites"                    → {"intent":"pending_studies","study_id":null,"count":null,"scheduled_time":null}
"any errors or failures"                       → {"intent":"failure_report","study_id":null,"count":null,"scheduled_time":null}
"how many invites are left for 1234567"        → {"intent":"invites_remaining","study_id":"1234567","count":null,"scheduled_time":null}
"how many more do i need to send"              → {"intent":"invites_remaining","study_id":null,"count":null,"scheduled_time":null}
"show my scheudled jobs"                       → {"intent":"scheduled_query","study_id":null,"count":null,"scheduled_time":null}
"show me my studies"                           → {"intent":"my_studies","study_id":null,"count":null,"scheduled_time":null}
"list all my studies"                          → {"intent":"my_studies","study_id":null,"count":null,"scheduled_time":null}
"progress for 1234567"                         → {"intent":"study_progress","study_id":"1234567","count":null,"scheduled_time":null}
"how is the funnel for study 1234567"          → {"intent":"study_progress","study_id":"1234567","count":null,"scheduled_time":null}
"who responded to 1234567"                     → {"intent":"responses","study_id":"1234567","count":null,"scheduled_time":null}
"response rate for study 1234567"              → {"intent":"responses","study_id":"1234567","count":null,"scheduled_time":null}
"who has booked for 1234567"                   → {"intent":"bookings","study_id":"1234567","count":null,"scheduled_time":null}
"calendar slots for 2345678"                   → {"intent":"bookings","study_id":"2345678","count":null,"scheduled_time":null}
"icf status 1234567"                           → {"intent":"icf_status","study_id":"1234567","count":null,"scheduled_time":null}
"who signed the consent form for 1234567"      → {"intent":"icf_status","study_id":"1234567","count":null,"scheduled_time":null}
"who needs a followup for 1234567"             → {"intent":"reminders_needed","study_id":"1234567","count":null,"scheduled_time":null}
"non responders for study 1234567"             → {"intent":"reminders_needed","study_id":"1234567","count":null,"scheduled_time":null}
"how many confirmed for 1234567"               → {"intent":"confirmed_count","study_id":"1234567","count":null,"scheduled_time":null}
"locked in count for study 1234567"            → {"intent":"confirmed_count","study_id":"1234567","count":null,"scheduled_time":null}
"draft a reply for John Smith about ICF"       → {"intent":"candidate_reply","study_id":null,"count":null,"scheduled_time":null}
"what all can you do"                          → {"intent":"help","study_id":null,"count":null,"scheduled_time":null}
"what are your capabilities"                   → {"intent":"help","study_id":null,"count":null,"scheduled_time":null}
"modify the template to be more modern"        → {"intent":"unsupported_template","study_id":null,"count":null,"scheduled_time":null}
"assign me case 3334445"                       → {"intent":"unsupported_assign","study_id":"3334445","count":null,"scheduled_time":null}
"change the UXR on study 1234567 to Sean"      → {"intent":"unsupported_ownership","study_id":"1234567","count":null,"scheduled_time":null}
"remove candidate 998877 from study 1234567"   → {"intent":"unsupported_delete","study_id":"1234567","count":null,"scheduled_time":null}
"create a new study"                           → {"intent":"unsupported_create","study_id":null,"count":null,"scheduled_time":null}
"export email list as CSV"                     → {"intent":"unsupported_pii","study_id":null,"count":null,"scheduled_time":null}
"increase incentive to $150"                   → {"intent":"unsupported_incentive","study_id":null,"count":null,"scheduled_time":null}
"send update to my gmail"                      → {"intent":"unsupported_external","study_id":null,"count":null,"scheduled_time":null}
"reschedule candidate from Tuesday to Thursday"→ {"intent":"unsupported_reschedule","study_id":null,"count":null,"scheduled_time":null}
"what is the capital of France"                → {"intent":"off_topic","study_id":null,"count":null,"scheduled_time":null}
"write me a poem"                              → {"intent":"off_topic","study_id":null,"count":null,"scheduled_time":null}
"what is 2+2"                                  → {"intent":"off_topic","study_id":null,"count":null,"scheduled_time":null}
"tell me a joke"                               → {"intent":"off_topic","study_id":null,"count":null,"scheduled_time":null}

Now classify this message:
"""


def _parse_vertex_response(raw: str, original_text: str) -> ParsedCommand:
    """Parse Vertex AI JSON output into a ParsedCommand."""
    raw = raw.strip()
    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = re.sub(r"```[a-z]*\n?", "", raw).strip("`").strip()
    try:
        data = json.loads(raw)
        return ParsedCommand(
            intent=data.get("intent", "unknown"),
            study_id=data.get("study_id") or None,
            count=data.get("count") or None,
            scheduled_time=data.get("scheduled_time") or None,
            raw_text=original_text,
        )
    except json.JSONDecodeError as exc:
        logger.warning(f"Vertex AI JSON parse error: {exc} — raw: {raw!r}")
        return _regex_parse(original_text)


def _classify_with_vertex(text: str) -> ParsedCommand | None:
    """Call Vertex AI and return a ParsedCommand, or None on failure."""
    client = _get_vertex_client()
    if client is None:
        return None
    model_name = os.getenv("VERTEX_MODEL", "gemini-2.0-flash-001")
    try:
        response = client.models.generate_content(model=model_name, contents=_SYSTEM_PROMPT + text)
        return _parse_vertex_response(response.text, text)
    except Exception as exc:
        logger.warning(f"Vertex AI classification failed: {exc}")
        return None


# ── Regex fallback ────────────────────────────────────────────────────────────

def _regex_parse(text: str) -> ParsedCommand:
    lower = text.lower().strip()

    schedule_re = re.compile(
        r"send\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})"
        r".*?"
        r"((?:tomorrow|today|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:,?\s*\d{4})?)"
        r"\s+(?:at\s+)?(\d{1,2}[:.]\d{0,2}\s*(?:am|pm)?))",
        re.IGNORECASE,
    )
    m = schedule_re.search(lower)
    if m:
        date_part = m.group(3).strip()
        time_part = m.group(4).strip() if m.group(4) else ""
        scheduled_str = f"{date_part} at {time_part}".strip() if time_part else date_part
        return ParsedCommand(intent="schedule", study_id=m.group(2),
                             count=int(m.group(1)), scheduled_time=scheduled_str, raw_text=text)

    # send_invite — with or without study_id
    invite_re = re.compile(
        r"(?:send|shoot|fire|dispatch|push)\s+(?:out\s+)?(?:(\d+)\s+)?(?:invite[s]?|invitations?|email[s]?)\s*"
        r"(?:(?:for|to|on)\s+)?(?:the\s+)?(?:case|study|st|#)?\s*(\d{7})?", re.IGNORECASE)
    m = invite_re.search(lower)
    if m and (m.group(1) or m.group(2) or re.search(r"send.*invit|invit.*send", lower)):
        # also pick up any 7-digit number in the text if the regex didn't capture it
        sid_m = re.search(r"\b(\d{7})\b", lower)
        study_id = m.group(2) if m.group(2) else (sid_m.group(1) if sid_m else None)
        return ParsedCommand(intent="send_invite",
                             study_id=study_id,
                             count=int(m.group(1)) if m and m.group(1) else None,
                             raw_text=text)

    status_re = re.compile(
        r"status\s+(?:of\s+)?(?:case|study)?\s*(\d{7})|"
        r"how\s+is\s+(?:study|case)?\s*(\d{7})|"
        r"(?:study|case)\s+(\d{7})\s+(?:status|update|overview)", re.IGNORECASE)
    m = status_re.search(lower)
    if m:
        sid = m.group(1) or m.group(2) or m.group(3)
        return ParsedCommand(intent="status_query", study_id=sid, raw_text=text)

    if re.search(r"today|summar|recap|daily", lower) and not re.search(r"eod|end.?of.?day", lower):
        return ParsedCommand(intent="daily_summary", raw_text=text)

    if re.search(r"\beod\b|end.?of.?day|eod update", lower):
        if re.search(r"\bpost\b|\bconfirm\b|\blooks good\b|\bsend it\b", lower):
            return ParsedCommand(intent="post_eod_note", raw_text=text)
        if re.search(r"\bedit\b|\bchange\b|\bmodif\b", lower):
            return ParsedCommand(intent="edit_eod_note", raw_text=text)
        return ParsedCommand(intent="eod_update", raw_text=text)

    if re.search(r"\bpost\b.*\b(salesforce|daily|note)\b|\blooks good.*post\b|\bconfirm.*post\b", lower):
        return ParsedCommand(intent="post_eod_note", raw_text=text)

    if re.search(r"\bedit\b.*\b(eod|draft|summary|note)\b|\bmodif\b.*\b(eod|draft|summary)\b", lower):
        return ParsedCommand(intent="edit_eod_note", raw_text=text)

    if re.search(r"pending|outstanding|need.*invit|which.*studies", lower):
        return ParsedCommand(intent="pending_studies", raw_text=text)

    if re.search(r"fail|error|went wrong|issue", lower):
        return ParsedCommand(intent="failure_report", raw_text=text)

    if re.search(r"confirm(?:ed)?|locked.?in", lower):
        sid = re.search(r"(\d{7})", lower)
        return ParsedCommand(intent="confirmed_count", study_id=sid.group(1) if sid else None, raw_text=text)

    remaining_re = re.compile(
        r"how many|invites?\s+left|remaining|left to send|"
        r"still need|how much more|how many more", re.IGNORECASE)
    if remaining_re.search(lower) and re.search(r"invit|send|left", lower):
        sid = re.search(r"(?:for\s+)?(?:study|case)?\s*(\d{7})", lower)
        return ParsedCommand(intent="invites_remaining",
                             study_id=sid.group(1) if sid else None, raw_text=text)

    if re.search(r"schedul(?:ed)?\s+(?:job|send|invit)|upcoming send|my schedul", lower):
        return ParsedCommand(intent="scheduled_query", raw_text=text)

    if re.search(r"my studies|all studies|show studies|list studies|which studies|list.*studi", lower):
        return ParsedCommand(intent="my_studies", raw_text=text)

    progress_re = re.compile(r"progress|funnel|pipeline", re.IGNORECASE)
    if progress_re.search(lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="study_progress", study_id=sid.group(1), raw_text=text)

    if re.search(r"respond|response|reply.*from|who.*replied", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="responses", study_id=sid.group(1), raw_text=text)

    if re.search(r"book(?:ed|ing)?|calendar|slot|appointment", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="bookings", study_id=sid.group(1), raw_text=text)

    if re.search(r"\bicf\b|consent|signed", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="icf_status", study_id=sid.group(1), raw_text=text)

    if re.search(r"remind|follow.?up|non.?respond|no response", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="reminders_needed", study_id=sid.group(1), raw_text=text)

    if re.search(r"^(hi|hey|hello|howdy|good\s*(morning|afternoon|evening)|how are you|what.?s up|sup|yo)[\s!?]*$", lower):
        return ParsedCommand(intent="greeting", raw_text=text)

    if re.search(r"help|what.*can.*you|capabilities|what.*you.*do|commands", lower, re.IGNORECASE):
        return ParsedCommand(intent="help", raw_text=text)

    # Off-topic guard: no UXReach keywords at all
    uxreach_keywords = re.compile(
        r"study|studies|invite|invit|send|email|participant|icf|consent|"
        r"remind|schedule|status|progress|response|booking|confirmed|rc|researcher|"
        r"p0|shortlist|case|uxr|ux|research", re.IGNORECASE)
    if not uxreach_keywords.search(lower):
        return ParsedCommand(intent="off_topic", raw_text=text)

    return ParsedCommand(intent="unknown", raw_text=text)


# ── Public API ────────────────────────────────────────────────────────────────

def _emergency_fallback(text: str) -> ParsedCommand:
    """
    Minimal safety net used ONLY when Gemini is completely unavailable (rate limit / network).
    Not a regex classifier — just catches the most obvious send/status/help/greeting keywords
    so the UI doesn't show a blank unknown response when the API is temporarily down.
    """
    lower = text.lower().strip()
    sid = re.search(r"\b(\d{7})\b", lower)
    sid_val = sid.group(1) if sid else None
    count_m = re.search(r"\b(\d{1,3})\b", lower)
    count_val = int(count_m.group(1)) if count_m and count_m.group(1) != sid_val else None

    if re.search(r"\bsend\b|\binvit|\bemail\b|\bshoot\b|\bfire\b|\bdispatch\b", lower):
        return ParsedCommand(intent="send_invite", study_id=sid_val, count=count_val, raw_text=text)
    if re.search(r"\bschedul\b", lower):
        return ParsedCommand(intent="schedule", study_id=sid_val, count=count_val, raw_text=text)
    if re.search(r"\bstatus\b|\boverview\b|\bhow is\b", lower):
        return ParsedCommand(intent="status_query", study_id=sid_val, raw_text=text)
    if re.search(r"\bmy studies\b|\ball studies\b|\blist studi", lower):
        return ParsedCommand(intent="my_studies", raw_text=text)
    if re.search(r"\bprogress\b|\bfunnel\b", lower) and sid_val:
        return ParsedCommand(intent="study_progress", study_id=sid_val, raw_text=text)
    if re.search(r"\bremain\b|\bleft\b|\bhow many\b", lower):
        return ParsedCommand(intent="invites_remaining", study_id=sid_val, raw_text=text)
    if re.search(r"\bpending\b", lower):
        return ParsedCommand(intent="pending_studies", raw_text=text)
    if re.search(r"\bsummar\b|\btoday\b", lower):
        return ParsedCommand(intent="daily_summary", raw_text=text)
    if re.search(r"\beod\b|\bend.?of.?day\b", lower):
        return ParsedCommand(intent="eod_update", raw_text=text)
    if re.search(r"\bremind\b|\bfollow.?up\b", lower) and sid_val:
        return ParsedCommand(intent="reminders_needed", study_id=sid_val, raw_text=text)
    if re.search(r"\bicf\b|\bconsent\b", lower) and sid_val:
        return ParsedCommand(intent="icf_status", study_id=sid_val, raw_text=text)
    if re.search(r"\bbook\b|\bcalendar\b|\bslot\b", lower) and sid_val:
        return ParsedCommand(intent="bookings", study_id=sid_val, raw_text=text)
    if re.search(r"\brespond\b|\bresponse\b", lower) and sid_val:
        return ParsedCommand(intent="responses", study_id=sid_val, raw_text=text)
    if re.search(r"\bconfirm\b|\blocked\b", lower) and sid_val:
        return ParsedCommand(intent="confirmed_count", study_id=sid_val, raw_text=text)
    if re.search(r"\bfail\b|\berror\b", lower):
        return ParsedCommand(intent="failure_report", raw_text=text)
    if re.search(r"\bhelp\b|\bcommand\b|\bcapabilit\b|\bwhat.*can\b|\bwhat.*you\b", lower):
        return ParsedCommand(intent="help", raw_text=text)
    if re.search(r"^(hi|hey|hello|howdy|good\s+\w+|how are you)\b", lower):
        return ParsedCommand(intent="greeting", raw_text=text)
    return ParsedCommand(intent="unknown", raw_text=text)


def parse_command(text: str) -> ParsedCommand:
    """
    Classify intent in two steps:
    1. Regex — instant, no API call, handles well-known patterns.
    2. Vertex AI — called only when regex returns 'unknown' (natural language, ambiguous phrasing).
    3. Emergency fallback — used only if Vertex AI is unreachable.
    """
    regex_result = _regex_parse(text)
    if regex_result.intent != "unknown":
        logger.info(f"Regex classified '{text}' → {regex_result.intent}")
        return regex_result

    ai_result = _classify_with_vertex(text)
    if ai_result is not None:
        logger.info(f"Vertex AI classified '{text}' → {ai_result.intent}")
        return ai_result

    logger.warning(f"Vertex AI unavailable — emergency fallback for '{text}'")
    return _emergency_fallback(text)
