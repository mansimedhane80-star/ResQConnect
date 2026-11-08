
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import SOSCase, RiskAlert, Responder, User
from app.auth import require_admin
from app.geocoding import resolve_and_cache_address

router = APIRouter(prefix="/locations", tags=["Locations"])


# --------------------------------------------------
# HELPER: GET READABLE ADDRESS
# --------------------------------------------------

def get_location_address(db: Session, latitude, longitude):
    if latitude is None or longitude is None:
        return {
            "address": None,
            "readable_address": None
        }

    try:
        address = resolve_and_cache_address(
            db,
            float(latitude),
            float(longitude)
        )

        if not address:
            return {
                "address": None,
                "readable_address": None
            }

        return {
            "address": address,
            "readable_address": address.get("display_name")
        }

    except Exception:
        return {
            "address": None,
            "readable_address": None
        }


# --------------------------------------------------
# GET LOCATIONS OF SOS CASES, ALERTS AND RESPONDERS
# --------------------------------------------------

@router.get("/")
def get_locations(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin)
):
    try:
        locations = []

        # SOS case locations
        cases = db.query(SOSCase).all()

        for case in cases:
            location_address = get_location_address(
                db,
                case.latitude,
                case.longitude
            )

            locations.append({
                "id": case.case_id,
                "type": "sos",
                "latitude": case.latitude,
                "longitude": case.longitude,
                "title": case.disaster_type,
                "status": case.case_status,
                "urgency": case.urgency,
                **location_address
            })

        # Disaster alert locations
        alerts = db.query(RiskAlert).all()

        for alert in alerts:
            location_address = get_location_address(
                db,
                alert.latitude,
                alert.longitude
            )

            locations.append({
                "id": alert.alert_id,
                "type": "alert",
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "title": alert.disaster_type,
                "status": alert.alert_level,
                **location_address
            })

        # Responder locations
        responders = db.query(Responder).all()

        for responder in responders:
            location_address = get_location_address(
                db,
                responder.latitude,
                responder.longitude
            )

            locations.append({
                "id": responder.responder_id,
                "type": "responder",
                "latitude": responder.latitude,
                "longitude": responder.longitude,
                "title": responder.name,
                "status": responder.responder_status,
                "skills": responder.skills,
                "equipment": responder.equipment,
                **location_address
            })

        return {"locations": locations}

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch locations"
        )


# --------------------------------------------------
# FIND AVAILABLE RESPONDERS WITHIN A SPECIFIED DISTANCE
# --------------------------------------------------

@router.get("/nearby-responders")
def get_nearby_responders(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(default=5000, gt=0, le=100000),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    try:
        search_point = func.ST_GeogFromText(
            f"SRID=4326;POINT({longitude} {latitude})"
        )

        distance = func.ST_Distance(
            Responder.location,
            search_point
        )

        results = (
            db.query(
                Responder,
                distance.label("distance_meters")
            )
            .filter(
                Responder.responder_status == "available"
            )
            .filter(
                Responder.location.isnot(None)
            )
            .filter(
                func.ST_DWithin(
                    Responder.location,
                    search_point,
                    radius_meters
                )
            )
            .order_by(distance)
            .all()
        )

        nearby_responders = []

        for responder, distance_meters in results:
            location_address = get_location_address(
                db,
                responder.latitude,
                responder.longitude
            )

            nearby_responders.append({
                "responder_id": responder.responder_id,
                "name": responder.name,
                "status": responder.responder_status,
                "latitude": responder.latitude,
                "longitude": responder.longitude,
                "skills": responder.skills,
                "equipment": responder.equipment,
                "distance_meters": round(
                    float(distance_meters), 2
                ),
                **location_address
            })

        return {
            "count": len(nearby_responders),
            "radius_meters": radius_meters,
            "responders": nearby_responders
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to find nearby responders"
        )
