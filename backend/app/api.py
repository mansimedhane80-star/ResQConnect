from fastapi import APIRouter

from app.routes.sos import router as sos_router
from app.routes.cases import router as cases_router
from app.routes.locations import router as locations_router

api_router = APIRouter()

api_router.include_router(sos_router)
api_router.include_router(cases_router)
api_router.include_router(locations_router)