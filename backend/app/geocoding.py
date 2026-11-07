"""Optional reverse geocoding through an operator-controlled endpoint."""
import hashlib
import json
import logging
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models import GeocodeCache

logger = logging.getLogger(__name__)


def coordinate_cache_key(latitude: float, longitude: float) -> str:
    normalized = f"{float(latitude):.6f},{float(longitude):.6f}"
    return hashlib.sha256(normalized.encode("ascii")).hexdigest()


def _address_components(payload: dict) -> dict:
    address = payload.get("address") or {}
    city = (address.get("city") or address.get("town") or address.get("village")
            or address.get("municipality") or address.get("hamlet"))
    district = address.get("state_district") or address.get("county")
    return {
        "display_name": str(payload.get("display_name") or "").strip() or None,
        "house_number": address.get("house_number"),
        "building": address.get("building"),
        "road": address.get("road") or address.get("pedestrian") or address.get("residential"),
        "locality": address.get("neighbourhood") or address.get("suburb") or address.get("quarter"),
        "city": city,
        "district": district,
        "state": address.get("state"),
        "postal_code": address.get("postcode"),
        "country": address.get("country"),
        "attribution": "© OpenStreetMap contributors",
    }


def _request_reverse_geocode(latitude: float, longitude: float) -> dict | None:
    endpoint = (settings.REVERSE_GEOCODER_URL or "").strip()
    if not endpoint:
        return None
    parsed = urlsplit(endpoint)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        logger.warning("Reverse geocoding is disabled because its configured endpoint is invalid")
        return None
    if (parsed.hostname or "").lower() == "nominatim.openstreetmap.org":
        logger.warning("Public Nominatim is disabled for citizen emergency coordinates; configure a private endpoint")
        return None

    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params.update({
        "format": "jsonv2",
        "addressdetails": "1",
        "lat": f"{latitude:.7f}",
        "lon": f"{longitude:.7f}",
    })
    url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(params), ""))
    request = Request(url, headers={
        "User-Agent": settings.GEOCODER_USER_AGENT,
        "Accept": "application/json",
    })
    try:
        with urlopen(request, timeout=3) as response:
            payload = json.loads(response.read(1_000_000).decode("utf-8"))
        return _address_components(payload) if isinstance(payload, dict) else None
    except Exception:
        # Do not log coordinates, provider response bodies, or request URLs.
        logger.warning("Reverse geocoding failed; the case will retain coordinates only")
        return None


def get_cached_address(db, latitude: float, longitude: float) -> dict | None:
    row = db.query(GeocodeCache).filter(
        GeocodeCache.cache_key == coordinate_cache_key(latitude, longitude)
    ).first()
    return row.address if row and row.address else None


def resolve_and_cache_address(db, latitude: float, longitude: float) -> dict | None:
    key = coordinate_cache_key(latitude, longitude)
    existing = db.query(GeocodeCache).filter(GeocodeCache.cache_key == key).first()
    if existing:
        return existing.address or None

    address = _request_reverse_geocode(latitude, longitude)
    if address is None:
        return None
    row = GeocodeCache(cache_key=key, address=address)
    try:
        db.add(row)
        db.commit()
        return address or None
    except IntegrityError:
        db.rollback()
        return get_cached_address(db, latitude, longitude)
    except Exception:
        db.rollback()
        logger.warning("Reverse-geocoding cache could not be saved")
        return None
