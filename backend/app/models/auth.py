from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from GIS


class UserInfo(BaseModel):
    email: str
    name: str
    picture: str | None = None
    role: str = "rc"


class AuthResponse(BaseModel):
    success: bool
    user: UserInfo | None = None
    message: str = ""


class AddUserRequest(BaseModel):
    email: str
    name: str
    role: str = "rc"
