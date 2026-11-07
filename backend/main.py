
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import Response
from sqlalchemy import text

from app.api import api_router
from app.config import settings
from app.database import engine

app = FastAPI(
    title="ResQConnect API",
    version="0.1.0"
)


@app.middleware("http")
async def disable_private_response_caching(request: Request, call_next):
    response: Response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.CORS_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db-test")
def database_test():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "connected"
        }

    except Exception:
        return {
            "status": "error",
            "database": "not connected",
            "message": "Database connection failed. Check server configuration and logs."
        }


# Register all API routes under the /api prefix
app.include_router(api_router, prefix="/api")
