"""
Intent classifier for UXReach chat.
Primary: Gemini Flash (structured JSON output).
Fallback: regex-based parser (used when Gemini is unavailable or key not set).
"""

import os
import re
import json
import logging
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

logger = logging.getLogger(__name__)

# ── Gemini client (lazy-initialised) ─────────────────────────────────────────

_gemini_client = None
_gemini_model_loaded = None  # track which model the client was built for


def _get_gemini_client():
    global _gemini_client, _gemini_model_loaded
    api_key = os.getenv("GEMINI_API_KEY", "")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None
    # Rebuild if model changed (e.g. env var updated at runtime)
    if _gemini_client is not None and _gemini_model_loaded == model_name:
        return _gemini_client
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_client = genai.GenerativeModel(model_name)
        _gemini_model_loaded = model_name
        logger.info(f"Gemini client initialised with model: {model_name}")
        return _gemini_client
    except Exception as exc:
        logger.warning(f"Gemini init failed: {exc}")
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


# ── Gemini prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an intent classifier for UXReach, a UX Research outreach tool used by
Research Coordinators (RCs) at CTS to manage study invitations.

Classify the user message into EXACTLY ONE of these intents and extract the
required parameters. Respond with ONLY a raw JSON object — no markdown fences,
no explanation.

INTENTS and their required fields:
- greeting           → (no params) — any casual greeting, hi, hello, hey, good morning, how are you, etc.
- send_invite        → study_id (7-digit string), count (int)
- schedule           → study_id, count, scheduled_time (human-readable string)
- status_query       → study_id
- daily_summary      → (no params)
- pending_studies    → (no params)
- failure_report     → (no params)
- invites_remaining  → study_id (optional)
- scheduled_query    → (no params)
- my_studies         → (no params)
- study_progress     → study_id
- responses          → study_id
- bookings           → study_id
- icf_status         → study_id
- reminders_needed   → study_id
- confirmed_count    → study_id
- help               → (no params)
- unknown            → (no params)

Return JSON schema:
{
  "intent": "<one of the intents above>",
  "study_id": "<7-digit string or null>",
  "count": <integer or null>,
  "scheduled_time": "<string or null>"
}

Examples:
  "send 10 invites for study 1234567"
  → {"intent":"send_invite","study_id":"1234567","count":10,"scheduled_time":null}

  "schedule 5 invites for case 7654321 tomorrow at 9am"
  → {"intent":"schedule","study_id":"7654321","count":5,"scheduled_time":"tomorrow at 9am"}

  "status of study 9876543"
  → {"intent":"status_query","study_id":"9876543","count":null,"scheduled_time":null}

  "show me my studies"
  → {"intent":"my_studies","study_id":null,"count":null,"scheduled_time":null}

  "who needs a reminder for 1234567?"
  → {"intent":"reminders_needed","study_id":"1234567","count":null,"scheduled_time":null}

Now classify this message:
"""


def _parse_gemini_response(raw: str, original_text: str) -> ParsedCommand:
    """Parse Gemini JSON output into a ParsedCommand."""
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
        logger.warning(f"Gemini JSON parse error: {exc} — raw: {raw!r}")
        return _regex_parse(original_text)


def _classify_with_gemini(text: str) -> ParsedCommand | None:
    """Call Gemini and return a ParsedCommand, or None on failure."""
    client = _get_gemini_client()
    if client is None:
        return None
    try:
        response = client.generate_content(_SYSTEM_PROMPT + text)
        return _parse_gemini_response(response.text, text)
    except Exception as exc:
        logger.warning(f"Gemini classification failed: {exc}")
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

    invite_re = re.compile(
        r"send\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})", re.IGNORECASE)
    m = invite_re.search(lower)
    if m:
        return ParsedCommand(intent="send_invite", study_id=m.group(2),
                             count=int(m.group(1)), raw_text=text)

    status_re = re.compile(r"status\s+(?:of\s+)?(?:case|study)?\s*(\d{7})", re.IGNORECASE)
    m = status_re.search(lower)
    if m:
        return ParsedCommand(intent="status_query", study_id=m.group(1), raw_text=text)

    if "today" in lower and "summar" in lower:
        return ParsedCommand(intent="daily_summary", raw_text=text)

    if "pending" in lower:
        return ParsedCommand(intent="pending_studies", raw_text=text)

    if "fail" in lower or "error" in lower:
        return ParsedCommand(intent="failure_report", raw_text=text)

    if re.search(r"confirm(?:ed)?|locked.?in", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="confirmed_count", study_id=sid.group(1), raw_text=text)

    remaining_re = re.compile(
        r"how many|invites?\s+left|remaining invite|left to send|"
        r"still need to send|invites?\s+remaining|how much left|how many more", re.IGNORECASE)
    if remaining_re.search(lower):
        sid = re.search(r"(?:for\s+)?(?:study|case)?\s*(\d{7})", lower)
        return ParsedCommand(intent="invites_remaining",
                             study_id=sid.group(1) if sid else None, raw_text=text)

    sched_query_re = re.compile(
        r"when.*schedul|schedul.*send|my schedul|scheduled job|"
        r"upcoming send|scheduled invite|show.*schedul", re.IGNORECASE)
    if sched_query_re.search(lower):
        return ParsedCommand(intent="scheduled_query", raw_text=text)

    my_studies_re = re.compile(
        r"my studies|all studies|show studies|list studies|which studies|show all", re.IGNORECASE)
    if my_studies_re.search(lower):
        return ParsedCommand(intent="my_studies", raw_text=text)

    progress_re = re.compile(
        r"progress\s+(?:for\s+)?(?:study|case)?\s*(\d{7})|(?:study\s+)?progress\s+(\d{7})",
        re.IGNORECASE)
    m = progress_re.search(lower)
    if m:
        sid = m.group(1) or m.group(2)
        if sid:
            return ParsedCommand(intent="study_progress", study_id=sid, raw_text=text)

    if re.search(r"respond|response", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="responses", study_id=sid.group(1), raw_text=text)

    if re.search(r"book(?:ed|ing)?|calendar|slot", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="bookings", study_id=sid.group(1), raw_text=text)

    if re.search(r"\bicf\b|consent|who\s+signed", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="icf_status", study_id=sid.group(1), raw_text=text)

    if re.search(r"remind|follow.?up|non.?respond", lower):
        sid = re.search(r"(\d{7})", lower)
        if sid:
            return ParsedCommand(intent="reminders_needed", study_id=sid.group(1), raw_text=text)

    greeting_re = re.compile(
        r"^(hi|hey|hello|howdy|good\s*(morning|afternoon|evening)|how are you|what'?s up|sup|yo)[\s!?]*$",
        re.IGNORECASE)
    if greeting_re.search(lower):
        return ParsedCommand(intent="greeting", raw_text=text)

    help_re = re.compile(
        r"^help$|what can you do|what do you know|available commands|^commands$", re.IGNORECASE)
    if help_re.search(lower):
        return ParsedCommand(intent="help", raw_text=text)

    return ParsedCommand(intent="unknown", raw_text=text)


# ── Public API ────────────────────────────────────────────────────────────────

def parse_command(text: str) -> ParsedCommand:
    """Classify user message. Uses Gemini if available, falls back to regex."""
    result = _classify_with_gemini(text)
    if result is not None:
        logger.info(f"Gemini classified '{text}' → {result.intent}")
        return result
    logger.info(f"Regex fallback for '{text}'")
    return _regex_parse(text)
