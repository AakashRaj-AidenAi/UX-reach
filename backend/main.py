"""
UXReach Invite Email Agent - FastAPI Backend
Run: uvicorn main:app --reload --port 8080
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import studies, chat, sending, audit, settings, health, participants, auth
from app.services import scheduler_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_service.start()
    yield
    scheduler_service.stop()


app = FastAPI(
    title="UXReach Invite Email Agent API",
    description="AI-powered candidate invitation workflow automation for Google UX Ads",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware — allow Angular dev server and any origin for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:4000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(health.router)
app.include_router(studies.router)
app.include_router(chat.router)
app.include_router(sending.router)
app.include_router(audit.router)
app.include_router(settings.router)
app.include_router(participants.router)


@app.get("/")
def root():
    return {
        "service": "UXReach Invite Email Agent API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
