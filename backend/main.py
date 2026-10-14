from fastapi import FastAPI
from app.api import api_router

app = FastAPI(title="ResQConnect API", version="0.1.0")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db-test")
def database_test():
    from sqlalchemy import text
    from app.database import engine

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {
            "status": "error",
            "database": "not connected",
            "message": str(e),
        }


app.include_router(api_router)