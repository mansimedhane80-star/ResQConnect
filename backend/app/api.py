from fastapi import APIRouter

from app.routes.sos import router as sos_router
from app.routes.cases import router as cases_router
from app.routes.locations import router as locations_router
from app.routes.auth import router as auth_router
from app.routes.responders import router as responders_router
from app.routes.admin import router as admin_router
api_router = APIRouter()

api_router.include_router(sos_router)
api_router.include_router(cases_router)
api_router.include_router(locations_router)
api_router.include_router(auth_router)
api_router.include_router(responders_router)
api_router.include_router(admin_router)