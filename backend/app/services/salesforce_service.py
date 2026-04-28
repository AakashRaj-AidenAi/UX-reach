"""
Salesforce integration service.

Studies  → SF Cases  (Origin = 'UX Research')
EOD notes → SF CaseComments on the corresponding Case

All study metadata is stored as JSON in Case.Description so no custom
SF fields are required on a Developer Edition org.
"""

import json
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

SF_ORIGIN = "UX Research"

# ── lazy singleton ─────────────────────────────────────────────────────────────

_sf_client = None
_sf_error: str | None = None


def _connect():
    """
    Try OAuth2 password grant first (works when SOAP login is disabled).
    Falls back to SOAP login if no Connected App credentials are configured.
    """
    global _sf_client, _sf_error
    try:
        from simple_salesforce import Salesforce  # type: ignore
    except ImportError:
        _sf_error = "simple-salesforce not installed"
        logger.warning(_sf_error)
        return

    username       = os.getenv("SF_USERNAME")
    password       = os.getenv("SF_PASSWORD")
    token          = os.getenv("SF_SECURITY_TOKEN", "")
    domain         = os.getenv("SF_DOMAIN", "login")
    consumer_key   = os.getenv("SF_CONSUMER_KEY")
    consumer_secret = os.getenv("SF_CONSUMER_SECRET")

    if not all([username, password]):
        _sf_error = "SF credentials not configured"
        logger.warning(_sf_error)
        return

    try:
        if consumer_key and consumer_secret:
            # Try client_credentials first (works on Agentforce/OrgFarm orgs)
            # Fall back to password grant if that fails
            import requests as _requests
            login_url = f"https://{domain}.salesforce.com/services/oauth2/token"

            resp = _requests.post(login_url, data={
                "grant_type":    "client_credentials",
                "client_id":     consumer_key,
                "client_secret": consumer_secret,
            }, timeout=15)

            if not resp.ok:
                # Fall back to password grant
                resp = _requests.post(login_url, data={
                    "grant_type":    "password",
                    "client_id":     consumer_key,
                    "client_secret": consumer_secret,
                    "username":      username,
                    "password":      password + token,
                }, timeout=15)
            if not resp.ok:
                raise Exception(f"OAuth2 token request failed: {resp.status_code} {resp.text}")
            data = resp.json()
            _sf_client = Salesforce(
                session_id=data["access_token"],
                instance_url=data["instance_url"],
            )
            logger.info("Salesforce connected via OAuth2 — instance: %s", data["instance_url"])
        else:
            # SOAP login (requires org to have it enabled)
            _sf_client = Salesforce(
                username=username,
                password=password,
                security_token=token,
                domain=domain,
            )
            logger.info("Salesforce connected via SOAP — instance: %s", _sf_client.sf_instance)
        _sf_error = None
    except Exception as exc:
        _sf_error = str(exc)
        _sf_client = None
        logger.error("Salesforce auth failed: %s", exc)


def get_client():
    """Return cached SF client, connecting on first call."""
    if _sf_client is None and _sf_error is None:
        _connect()
    return _sf_client


# ── public API ─────────────────────────────────────────────────────────────────

def check_connection() -> dict:
    """Live health probe — used by /api/health/dependencies."""
    if _sf_client is None and _sf_error is None:
        _connect()

    if _sf_client is None:
        configured = bool(os.getenv("SF_USERNAME"))
        return {
            "status": "not_configured" if not configured else "auth_failed",
            "reason": _sf_error or "unknown",
        }
    try:
        t0 = datetime.now()
        _sf_client.query("SELECT Id FROM Case LIMIT 1")
        latency_ms = int((datetime.now() - t0).total_seconds() * 1000)
        return {
            "status": "connected",
            "instance_url": os.getenv("SF_INSTANCE_URL", ""),
            "latency_ms": latency_ms,
            "last_check": datetime.now().isoformat(),
        }
    except Exception as exc:
        return {"status": "error", "reason": str(exc)}


def get_studies() -> list[dict] | None:
    """
    Fetch all UX Research Cases from SF.
    Returns a list of study-shaped dicts, or None if SF is unavailable.
    """
    sf = get_client()
    if sf is None:
        return None
    try:
        result = sf.query(
            "SELECT Id, CaseNumber, Subject, Description, Status, CreatedDate "
            f"FROM Case WHERE Origin = '{SF_ORIGIN}' ORDER BY CreatedDate DESC"
        )
        studies = []
        for rec in result["records"]:
            study = _case_to_study(rec)
            if study:
                studies.append(study)
        return studies if studies else None
    except Exception as exc:
        logger.error("get_studies SF error: %s", exc)
        return None


def get_study(study_id: str) -> dict | None:
    """
    Find a single study by our internal study_id stored in Case.Description JSON.
    """
    sf = get_client()
    if sf is None:
        return None
    try:
        result = sf.query(
            "SELECT Id, CaseNumber, Subject, Description, Status, CreatedDate "
            f"FROM Case WHERE Origin = '{SF_ORIGIN}'"
        )
        for rec in result["records"]:
            s = _case_to_study(rec)
            if s and s.get("id") == study_id:
                return s
        return None
    except Exception as exc:
        logger.error("get_study(%s) SF error: %s", study_id, exc)
        return None


def post_case_note(sf_case_id: str, note_body: str) -> bool:
    """
    Attach an EOD note as a CaseComment on the given SF Case.
    Returns True on success.
    """
    sf = get_client()
    if sf is None:
        logger.warning("post_case_note: SF not connected")
        return False
    try:
        sf.CaseComment.create({
            "ParentId": sf_case_id,
            "CommentBody": note_body,
            "IsPublished": False,
        })
        logger.info("CaseComment posted to %s", sf_case_id)
        return True
    except Exception as exc:
        logger.error("post_case_note(%s) failed: %s", sf_case_id, exc)
        return False


def create_case(study_dict: dict) -> str | None:
    """
    Create a SF Case for a study dict.  Returns the new Case Id or None.
    Called from the seed script.
    """
    sf = get_client()
    if sf is None:
        return None
    try:
        description = json.dumps({
            "study_id":        study_dict["id"],
            "researcher":      study_dict.get("researcher", ""),
            "owner_rc":        study_dict.get("owner_rc", ""),
            "total_required":  study_dict.get("total_required", 0),
            "already_sent":    study_dict.get("already_sent", 0),
            "last_run":        study_dict.get("last_run"),
            "new_responses":   study_dict.get("new_responses", 0),
            "p0_ready":        study_dict.get("p0_ready", 0),
            "p0_newly_marked": study_dict.get("p0_newly_marked", 0),
        })
        result = sf.Case.create({
            "Subject":     study_dict["name"],
            "Description": description,
            "Origin":      SF_ORIGIN,
            "Status":      "New",
            "Priority":    "Medium",
        })
        case_id = result.get("id")
        logger.info("Created Case %s for study %s", case_id, study_dict["id"])
        return case_id
    except Exception as exc:
        logger.error("create_case(%s) failed: %s", study_dict["id"], exc)
        return None


def update_case_sent(sf_case_id: str, already_sent: int, last_run: str) -> bool:
    """
    Sync the already_sent and last_run values back to the SF Case Description.
    """
    sf = get_client()
    if sf is None:
        return False
    try:
        # Fetch current description
        result = sf.query(
            f"SELECT Id, Description FROM Case WHERE Id = '{sf_case_id}'"
        )
        if not result["records"]:
            return False
        rec = result["records"][0]
        try:
            extra = json.loads(rec.get("Description") or "{}")
        except (json.JSONDecodeError, TypeError):
            extra = {}
        extra["already_sent"] = already_sent
        extra["last_run"] = last_run
        sf.Case.update(sf_case_id, {"Description": json.dumps(extra)})
        return True
    except Exception as exc:
        logger.error("update_case_sent(%s) failed: %s", sf_case_id, exc)
        return False


# ── internal helpers ───────────────────────────────────────────────────────────

def _case_to_study(record: dict) -> dict | None:
    """Parse a SF Case record into our study dict shape."""
    try:
        extra: dict = {}
        raw_desc = record.get("Description") or ""
        if raw_desc.strip().startswith("{"):
            try:
                extra = json.loads(raw_desc)
            except (json.JSONDecodeError, TypeError):
                pass

        study_id = extra.get("study_id") or record.get("CaseNumber", "")
        return {
            "id":               study_id,
            "name":             record.get("Subject", "Unnamed Study"),
            "researcher":       extra.get("researcher", ""),
            "owner_rc":         extra.get("owner_rc", ""),
            "total_required":   int(extra.get("total_required", 0)),
            "already_sent":     int(extra.get("already_sent", 0)),
            "last_run":         extra.get("last_run"),
            "new_responses":    int(extra.get("new_responses", 0)),
            "p0_ready":         int(extra.get("p0_ready", 0)),
            "p0_newly_marked":  int(extra.get("p0_newly_marked", 0)),
            # SF metadata — stored but not serialised to the frontend
            "sf_case_id":       record.get("Id"),
            "sf_case_number":   record.get("CaseNumber"),
        }
    except Exception as exc:
        logger.error("_case_to_study parse error: %s", exc)
        return None
