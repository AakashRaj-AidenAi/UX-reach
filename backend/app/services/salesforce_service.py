"""
Salesforce integration service — uses UXR custom objects.

Objects:
  UXR_Study__c         — research studies
  UXR_Participant__c   — participants (lookup → Study)
  UXR_Audit_Run__c     — audit/invite run history (lookup → Study)
  UXR_Scheduled_Job__c — scheduled send jobs (lookup → Study)
"""

import logging
import os
from datetime import datetime

import requests as _requests

logger = logging.getLogger(__name__)

API_VERSION = "59.0"

# ── lazy singleton ─────────────────────────────────────────────────────────────

_access_token:  str | None = None
_instance_url:  str | None = None
_sf_error:      str | None = None
_session:       _requests.Session | None = None


def _connect() -> None:
    global _access_token, _instance_url, _sf_error, _session

    consumer_key    = os.getenv("SF_CONSUMER_KEY")
    consumer_secret = os.getenv("SF_CONSUMER_SECRET")
    instance_env    = os.getenv("SF_INSTANCE_URL", "").rstrip("/")

    if not all([consumer_key, consumer_secret]):
        _sf_error = "SF_CONSUMER_KEY and SF_CONSUMER_SECRET are required"
        logger.warning(_sf_error)
        return

    api_base  = instance_env.replace("lightning.force.com", "my.salesforce.com")
    token_url = f"{api_base}/services/oauth2/token" if api_base else "https://login.salesforce.com/services/oauth2/token"

    try:
        resp = _requests.post(token_url, data={
            "grant_type":    "client_credentials",
            "client_id":     consumer_key,
            "client_secret": consumer_secret,
        }, timeout=15)

        if not resp.ok:
            raise Exception(f"Client credentials auth failed: {resp.status_code} {resp.text}")

        data = resp.json()
        _access_token = data["access_token"]
        _instance_url = data["instance_url"]
        _sf_error     = None

        _session = _requests.Session()
        _session.headers.update({
            "Authorization": f"Bearer {_access_token}",
            "Content-Type":  "application/json",
        })
        logger.info("Salesforce connected via client_credentials — %s", _instance_url)

    except Exception as exc:
        _sf_error     = str(exc)
        _access_token = None
        _instance_url = None
        _session      = None
        logger.error("Salesforce auth failed: %s", exc)


def _get_session() -> _requests.Session | None:
    if _session is None and _sf_error is None:
        _connect()
    return _session


def _reconnect_if_expired(exc: Exception) -> bool:
    global _access_token, _instance_url, _sf_error, _session
    msg = str(exc).lower()
    if any(k in msg for k in ("session expired", "invalid_session_id", "401", "unauthorized")):
        logger.info("SF token expired — reconnecting…")
        _access_token = _instance_url = _sf_error = _session = None
        _connect()
        return _session is not None
    return False


def _base() -> str:
    return f"{_instance_url}/services/data/v{API_VERSION}"


def _query(soql: str) -> list[dict] | None:
    """Run a SOQL query; auto-retry once on token expiry. Returns records list or None."""
    for attempt in range(2):
        sess = _get_session()
        if sess is None:
            return None
        try:
            resp = sess.get(f"{_base()}/query/", params={"q": soql}, timeout=15)
            if not resp.ok:
                raise Exception(f"{resp.status_code} {resp.text}")
            return resp.json().get("records", [])
        except Exception as exc:
            if attempt == 0 and _reconnect_if_expired(exc):
                continue
            logger.error("SF query error: %s | SOQL: %s", exc, soql[:120])
            return None


def _post(sobject: str, data: dict) -> dict | None:
    for attempt in range(2):
        sess = _get_session()
        if sess is None:
            return None
        try:
            resp = sess.post(f"{_base()}/sobjects/{sobject}/", json=data, timeout=15)
            if not resp.ok:
                raise Exception(f"{resp.status_code} {resp.text}")
            return resp.json()
        except Exception as exc:
            if attempt == 0 and _reconnect_if_expired(exc):
                continue
            logger.error("SF create %s error: %s", sobject, exc)
            return None


def _patch(sobject: str, record_id: str, data: dict) -> bool:
    for attempt in range(2):
        sess = _get_session()
        if sess is None:
            return False
        try:
            resp = sess.patch(f"{_base()}/sobjects/{sobject}/{record_id}", json=data, timeout=15)
            if not resp.ok:
                raise Exception(f"{resp.status_code} {resp.text}")
            return True
        except Exception as exc:
            if attempt == 0 and _reconnect_if_expired(exc):
                continue
            logger.error("SF update %s/%s error: %s", sobject, record_id, exc)
            return False


# ── public: health ─────────────────────────────────────────────────────────────

def check_connection() -> dict:
    if _session is None and _sf_error is None:
        _connect()

    if _session is None:
        return {
            "status": "not_configured" if not os.getenv("SF_USERNAME") else "auth_failed",
            "reason": _sf_error or "unknown",
        }
    try:
        t0 = datetime.now()
        _query("SELECT Id FROM UXR_Study__c LIMIT 1")
        latency_ms = int((datetime.now() - t0).total_seconds() * 1000)
        return {
            "status":       "connected",
            "instance_url": _instance_url or "",
            "latency_ms":   latency_ms,
            "last_check":   datetime.now().isoformat(),
        }
    except Exception as exc:
        return {"status": "error", "reason": str(exc)}


# ── public: studies ────────────────────────────────────────────────────────────

_STUDY_FIELDS = (
    "Id, Name, Study_ID__c, Researcher__c, RC_Name__c, Status__c, "
    "Total_Required__c, Already_Sent__c, Last_Run__c, "
    "New_Responses__c, P0_Ready__c, P0_Newly_Marked__c, Latest_Note__c"
)


def get_studies() -> list[dict] | None:
    records = _query(f"SELECT {_STUDY_FIELDS} FROM UXR_Study__c ORDER BY CreatedDate DESC")
    if records is None:
        return None
    studies = [_record_to_study(r) for r in records]
    return studies or None


def get_study(study_id: str) -> dict | None:
    records = _query(
        f"SELECT {_STUDY_FIELDS} FROM UXR_Study__c "
        f"WHERE Study_ID__c = '{study_id}' LIMIT 1"
    )
    if not records:
        return None
    return _record_to_study(records[0])


def create_study(study_dict: dict) -> str | None:
    result = _post("UXR_Study__c", {
        "Name":               study_dict["name"],
        "Study_ID__c":        study_dict["id"],
        "Researcher__c":      study_dict.get("researcher", ""),
        "RC_Name__c":         study_dict.get("owner_rc", ""),
        "Status__c":          "Active",
        "Total_Required__c":  study_dict.get("total_required", 0),
        "Already_Sent__c":    study_dict.get("already_sent", 0),
        "Last_Run__c":        study_dict.get("last_run") or "",
        "New_Responses__c":   study_dict.get("new_responses", 0),
        "P0_Ready__c":        study_dict.get("p0_ready", 0),
        "P0_Newly_Marked__c": study_dict.get("p0_newly_marked", 0),
    })
    sf_id = result.get("id") if result else None
    if sf_id:
        logger.info("Created UXR_Study__c %s for study %s", sf_id, study_dict["id"])
    return sf_id


def update_study_sent(sf_id: str, already_sent: int, last_run: str) -> bool:
    return _patch("UXR_Study__c", sf_id, {
        "Already_Sent__c": already_sent,
        "Last_Run__c":     last_run,
    })


def update_study_counts(sf_id: str, total_required: int, already_sent: int, last_run: str, p0_ready: int | None = None) -> bool:
    payload: dict = {
        "Total_Required__c": total_required,
        "Already_Sent__c":   already_sent,
        "Last_Run__c":       last_run,
    }
    if p0_ready is not None:
        payload["P0_Ready__c"] = p0_ready
    return _patch("UXR_Study__c", sf_id, payload)


def update_study_note(sf_id: str, note_content: str) -> bool:
    return _patch("UXR_Study__c", sf_id, {"Latest_Note__c": note_content})


# ── public: participants ───────────────────────────────────────────────────────

def get_participants(study_sf_id: str) -> list[dict] | None:
    records = _query(
        "SELECT Id, Name, Participant_ID__c, Email__c, Phone__c, Status__c, Invite_Sent__c "
        f"FROM UXR_Participant__c WHERE Study__c = '{study_sf_id}'"
    )
    if records is None:
        return None
    return [_record_to_participant(r) for r in records]


def create_participant(participant_dict: dict, study_sf_id: str) -> str | None:
    result = _post("UXR_Participant__c", {
        "Name":              participant_dict.get("name", ""),
        "Participant_ID__c": str(participant_dict.get("id", "")),
        "Email__c":          participant_dict.get("email", ""),
        "Phone__c":          participant_dict.get("phone", ""),
        "Status__c":         participant_dict.get("status", "Shortlisted"),
        "Invite_Sent__c":    participant_dict.get("invite_sent", False),
        "Study__c":          study_sf_id,
    })
    return result.get("id") if result else None


def mark_invite_sent(participant_sf_id: str) -> bool:
    return _patch("UXR_Participant__c", participant_sf_id, {"Invite_Sent__c": True})


def update_participant_status(sf_id: str, status: str, invite_sent: bool = True) -> bool:
    return _patch("UXR_Participant__c", sf_id, {
        "Status__c":      status,
        "Invite_Sent__c": invite_sent,
    })


# ── public: email ─────────────────────────────────────────────────────────────

_INVITE_SUBJECT = "You're Invited: {study_name} UX Research Study"
_INVITE_BODY = """\
Hello {name},

You have been selected to participate in a UX Research study:

  Study: {study_name} (ID: {study_id})

Please reply to confirm your availability, and our team will be in touch with
next steps.

Thank you,
UX Research Team
"""


def send_invite_email(
    to_email: str,
    to_name: str,
    study_name: str,
    study_id: str,
) -> bool:
    """
    Send one invite email via Salesforce's standard emailSimple invocable action.
    Emails are sent through Salesforce's own mail infrastructure (shows in SF activity).
    Returns True on success, False on any error (non-blocking — the SF record update
    already happened before this is called).
    """
    sess = _get_session()
    if sess is None or not to_email:
        return False

    subject = _INVITE_SUBJECT.format(study_name=study_name)
    body = _INVITE_BODY.format(name=to_name or "Participant", study_name=study_name, study_id=study_id)

    payload = {
        "inputs": [{
            "emailBody":      body,
            "emailAddresses": to_email,
            "emailSubject":   subject,
        }]
    }

    try:
        resp = sess.post(
            f"{_base()}/actions/standard/emailSimple",
            json=payload,
            timeout=15,
        )
        if not resp.ok:
            logger.error("SF emailSimple HTTP %s: %s", resp.status_code, resp.text[:200])
            return False
        results = resp.json()
        success = all(r.get("isSuccess") for r in results)
        if not success:
            errors = [r.get("errors") for r in results if not r.get("isSuccess")]
            logger.error("SF emailSimple reported failure: %s", errors)
        return success
    except Exception as exc:
        logger.error("SF email send error (%s → %s): %s", study_id, to_email, exc)
        return False


# ── public: aggregates ────────────────────────────────────────────────────────

def get_uninvited_shortlisted_counts() -> dict[str, int]:
    """
    Single aggregate SOQL: {study_sf_id: count} of Shortlisted + not-yet-invited
    participants across ALL studies. Used to show accurate 'available to invite' count.
    """
    records = _query(
        "SELECT Study__c, COUNT(Id) "
        "FROM UXR_Participant__c "
        "WHERE Status__c = 'Shortlisted' AND Invite_Sent__c = false "
        "GROUP BY Study__c"
    )
    if not records:
        return {}
    return {r["Study__c"]: int(r.get("expr0", 0)) for r in records}


def get_participant_status_counts_for_rc(rc_name: str) -> dict[str, int]:
    """
    Single aggregate SOQL query: {status: count} for all participants
    across every study owned by rc_name.
    Traverses the Study__r lookup to filter by RC_Name__c.
    """
    records = _query(
        f"SELECT Status__c, COUNT(Id) "
        f"FROM UXR_Participant__c "
        f"WHERE Study__r.RC_Name__c = '{rc_name}' "
        f"GROUP BY Status__c"
    )
    if not records:
        return {}
    # SOQL aggregate COUNT(Id) without alias comes back as expr0
    return {r.get("Status__c", ""): int(r.get("expr0", 0)) for r in records}


# ── internal mappers ───────────────────────────────────────────────────────────

def _record_to_participant(rec: dict) -> dict:
    return {
        "id":          rec.get("Participant_ID__c") or rec.get("Id", ""),
        "name":        rec.get("Name", ""),
        "email":       rec.get("Email__c") or "",
        "phone":       rec.get("Phone__c") or "",
        "status":      rec.get("Status__c") or "Shortlisted",
        "invite_sent": bool(rec.get("Invite_Sent__c", False)),
        "sf_id":       rec.get("Id"),
    }


def _record_to_study(rec: dict) -> dict:
    return {
        "id":               rec.get("Study_ID__c") or rec.get("Id", ""),
        "name":             rec.get("Name", "Unnamed Study"),
        "researcher":       rec.get("Researcher__c") or "",
        "owner_rc":         rec.get("RC_Name__c") or "",
        "total_required":   int(rec.get("Total_Required__c") or 0),
        "already_sent":     int(rec.get("Already_Sent__c") or 0),
        "last_run":         rec.get("Last_Run__c"),
        "new_responses":    int(rec.get("New_Responses__c") or 0),
        "p0_ready":         int(rec.get("P0_Ready__c") or 0),
        "p0_newly_marked":  int(rec.get("P0_Newly_Marked__c") or 0),
        "sf_id":            rec.get("Id"),
        "latest_note":      rec.get("Latest_Note__c") or "",
    }
