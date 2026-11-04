
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import api_router
from app.database import engine

app = FastAPI(
    title="ResQConnect API",
    version="0.1.0"
)

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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

    except Exception as e:
        return {
            "status": "error",
            "database": "not connected",
            "message": str(e)
        }


# Register all API routes under the /api prefix
app.include_router(api_router, prefix="/api")
