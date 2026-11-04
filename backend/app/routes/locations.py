
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import SOSCase, RiskAlert, Responder

router = APIRouter(prefix="/locations", tags=["Locations"])


# Get locations of SOS cases, disaster alerts, and responders
@router.get("/")
def get_locations(db: Session = Depends(get_db)):
    try:
        locations = []

        # Get SOS case locations
        cases = db.query(SOSCase).all()

        for case in cases:
            locations.append({
                "id": case.case_id,
                "type": "sos",
                "latitude": case.latitude,
                "longitude": case.longitude,
                "title": case.disaster_type,
                "status": case.case_status,
                "urgency": case.urgency
            })

        # Get disaster alert locations
        alerts = db.query(RiskAlert).all()

        for alert in alerts:
            locations.append({
                "id": alert.alert_id,
                "type": "alert",
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "title": alert.disaster_type,
                "status": alert.alert_level
            })

        # Get responder locations
        responders = db.query(Responder).all()

        for responder in responders:
            locations.append({
                "id": responder.responder_id,
                "type": "responder",
                "latitude": responder.latitude,
                "longitude": responder.longitude,
                "title": responder.name,
                "status": responder.responder_status
            })

        return {"locations": locations}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch locations: {str(e)}"
        )


# Find available responders within a specified distance
@router.get("/nearby-responders")
def get_nearby_responders(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(default=5000, gt=0, le=100000),
    db: Session = Depends(get_db)
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
            .filter(Responder.responder_status == "available")
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
            nearby_responders.append({
                "responder_id": responder.responder_id,
                "name": responder.name,
                "status": responder.responder_status,
                "latitude": responder.latitude,
                "longitude": responder.longitude,
                "distance_meters": round(float(distance_meters), 2)
            })

        return {
            "count": len(nearby_responders),
            "radius_meters": radius_meters,
            "responders": nearby_responders
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to find nearby responders: {str(e)}"
        )
