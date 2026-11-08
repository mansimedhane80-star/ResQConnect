
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_admin
from app.models import User
from app.nugen_service import analyze_sos, NuGenError

router = APIRouter(prefix="/ai", tags=["AI"])

logger = logging.getLogger(__name__)


class SOSAnalysisRequest(BaseModel):
    message: str = Field(min_length=5, max_length=2000)


@router.post("/analyze-sos")
async def analyze_sos_endpoint(
    request: SOSAnalysisRequest,
    current_user: User = Depends(require_admin),
):
    try:
        result = await analyze_sos(request.message)
        return {"status": "success", **result}

    except NuGenError:
        logger.exception("NuGen SOS analysis failed")
        raise HTTPException(
            status_code=502,
            detail="AI analysis is temporarily unavailable.",
        )

    except Exception:
        logger.exception("Unexpected SOS analysis error")
        raise HTTPException(
            status_code=500,
            detail="Unexpected AI analysis error.",
        )
