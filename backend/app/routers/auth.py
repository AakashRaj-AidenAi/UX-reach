import os

from fastapi import APIRouter, HTTPException

from app.models.auth import AddUserRequest, AuthResponse, GoogleAuthRequest, UserInfo
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/config")
def get_auth_config():
    """Return the Google Client ID so the frontend can initialise GIS."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if client_id == "your_google_client_id_here":
        client_id = ""
    return {"googleClientId": client_id}


BYPASS_EMAILS = {"aakashrr@google.com"}


@router.post("/google", response_model=AuthResponse)
def google_login(req: GoogleAuthRequest):
    """Verify a Google ID token and return user info if the account is allowed."""
    # Bypass token verification for specific emails
    if req.credential in BYPASS_EMAILS:
        email = req.credential
        db_user = auth_service.get_user_by_email(email) or {}
        return AuthResponse(
            success=True,
            user=UserInfo(
                email=email,
                name=db_user.get("name", "Aakash"),
                picture=None,
                role=db_user.get("role", "rc"),
            ),
            message="Login successful",
        )

    user_info = auth_service.verify_google_token(req.credential)
    if user_info is None:
        raise HTTPException(status_code=401, detail="Invalid or expired Google token.")

    email = user_info["email"]
    if not auth_service.is_user_allowed(email):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. {email} is not in the allowed users list. Contact your admin.",
        )

    db_user = auth_service.get_user_by_email(email)
    return AuthResponse(
        success=True,
        user=UserInfo(
            email=email,
            name=db_user.get("name") or user_info["name"],
            picture=user_info.get("picture"),
            role=db_user.get("role", "rc"),
        ),
        message="Login successful",
    )


# ── User management ───────────────────────────────────────────────────────────

@router.get("/users")
def list_users():
    """Return the full allowed-users list (admin use)."""
    from app.services.mock_data import ALLOWED_USERS
    return ALLOWED_USERS


@router.post("/users", status_code=201)
def add_user(req: AddUserRequest):
    """Add a user to the allowlist."""
    from app.services.mock_data import ALLOWED_USERS
    if any(u["email"].lower() == req.email.lower() for u in ALLOWED_USERS):
        raise HTTPException(status_code=409, detail=f"{req.email} is already in the allowlist.")
    return auth_service.add_user(req.email, req.name, req.role)


@router.delete("/users/{email:path}")
def remove_user(email: str):
    """Remove a user from the allowlist."""
    if not auth_service.remove_user(email):
        raise HTTPException(status_code=404, detail=f"{email} not found.")
    return {"message": f"{email} removed from allowlist."}
