"""
Google OAuth token verification and allowed-user management.
Token verification uses google-auth (already a transitive dep of google-generativeai).
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Loaded lazily so startup doesn't fail if library is missing
_google_auth_available: bool | None = None


def _check_google_auth() -> bool:
    global _google_auth_available
    if _google_auth_available is None:
        try:
            import google.oauth2.id_token  # noqa: F401
            import google.auth.transport.requests  # noqa: F401
            _google_auth_available = True
        except ImportError:
            logger.warning("google-auth not available; token verification disabled")
            _google_auth_available = False
    return _google_auth_available


def verify_google_token(credential: str) -> Optional[dict]:
    """Verify a Google ID token and return the payload, or None on failure."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id or client_id == "your_google_client_id_here":
        logger.warning("GOOGLE_CLIENT_ID not configured")
        return None

    if not _check_google_auth():
        return None

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=10,
        )
        return {
            "email": idinfo.get("email", ""),
            "name": idinfo.get("name", ""),
            "picture": idinfo.get("picture"),
            "sub": idinfo.get("sub", ""),
        }
    except Exception as exc:
        logger.warning(f"Google token verification failed: {exc}")
        return None


# ── Allowed-user management (in-memory for POC) ──────────────────────────────

def _users():
    """Return the shared mutable ALLOWED_USERS list from mock_data."""
    from app.services.mock_data import ALLOWED_USERS
    return ALLOWED_USERS


def is_user_allowed(email: str) -> bool:
    return any(u["email"].lower() == email.lower() for u in _users())


def get_user_by_email(email: str) -> Optional[dict]:
    return next(
        (u for u in _users() if u["email"].lower() == email.lower()),
        None,
    )


def add_user(email: str, name: str, role: str = "rc") -> dict:
    user = {"email": email, "name": name, "role": role}
    _users().append(user)
    return user


def remove_user(email: str) -> bool:
    users = _users()
    before = len(users)
    users[:] = [u for u in users if u["email"].lower() != email.lower()]
    return len(users) < before
