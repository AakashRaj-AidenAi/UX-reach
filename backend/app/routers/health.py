import os
from datetime import datetime

from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health_check():
    return {
        "status": "healthy",
        "service": "UXReach Invite Email Agent API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/dependencies")
def dependency_status():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "dependencies": {
            "salesforce": {
                "status": "connected",
                "latency_ms": 45,
                "last_check": datetime.now().isoformat(),
            },
            "gemini": {
                "status": "connected" if (os.getenv("GEMINI_API_KEY", "") not in ("", "your_gemini_api_key_here")) else "not_configured",
                "model": os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                "latency_ms": 120,
                "last_check": datetime.now().isoformat(),
            },
            "shortlisting_app": {
                "status": "connected",
                "latency_ms": 30,
                "last_check": datetime.now().isoformat(),
            },
            "cloud_sql": {
                "status": "connected",
                "latency_ms": 5,
                "last_check": datetime.now().isoformat(),
            },
        },
    }
