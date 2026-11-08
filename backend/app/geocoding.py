
"""Optional reverse geocoding through a configured endpoint."""

import hashlib
import json
import logging
import time
import threading
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models import GeocodeCache

logger = logging.getLogger(__name__)

# Public Nominatim policy: maximum one request per second.
_geocode_lock = threading.Lock()
_last_geocode_request = 0.0


def coordinate_cache_key(latitude: float, longitude: float) -> str:
    normalized = f"{float(latitude):.6f},{float(longitude):.6f}"
    return hashlib.sha256(normalized.encode("ascii")).hexdigest()


def _address_components(payload: dict) -> dict:
    address = payload.get("address") or {}

    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or address.get("hamlet")
    )

    district = (
        address.get("state_district")
        or address.get("county")
    )

    return {
        "display_name": str(
            payload.get("display_name") or ""
        ).strip() or None,

        "house_number": address.get("house_number"),
        "building": address.get("building"),

        "road": (
            address.get("road")
            or address.get("pedestrian")
            or address.get("residential")
        ),

        "locality": (
            address.get("neighbourhood")
            or address.get("suburb")
            or address.get("quarter")
        ),

        "city": city,
        "district": district,
        "state": address.get("state"),
        "postal_code": address.get("postcode"),
        "country": address.get("country"),
        "attribution": "© OpenStreetMap contributors",
    }


def _request_reverse_geocode(
    latitude: float,
    longitude: float
) -> dict | None:

    global _last_geocode_request

    endpoint = (
        settings.REVERSE_GEOCODER_URL or ""
    ).strip()

    if not endpoint:
        logger.warning(
            "Reverse geocoding is disabled: no endpoint configured"
        )
        return None

    parsed = urlsplit(endpoint)

    if parsed.scheme != "https" or not parsed.netloc:
        logger.warning(
            "Reverse geocoding requires a valid HTTPS endpoint"
        )
        return None

    if not settings.GEOCODER_USER_AGENT:
        logger.warning(
            "Reverse geocoding requires a configured User-Agent"
        )
        return None

    params = dict(
        parse_qsl(parsed.query, keep_blank_values=True)
    )

    params.update({
        "format": "jsonv2",
        "addressdetails": "1",
        "lat": f"{latitude:.7f}",
        "lon": f"{longitude:.7f}",
    })

    url = urlunsplit((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        urlencode(params),
        "",
    ))

    request = Request(
        url,
        headers={
            "User-Agent": settings.GEOCODER_USER_AGENT,
            "Accept": "application/json",
        },
    )

    try:
        # Respect the public Nominatim one-request-per-second limit.
        with _geocode_lock:

            elapsed = (
                time.monotonic() - _last_geocode_request
            )

            if elapsed < 1.0:
                time.sleep(1.0 - elapsed)

            _last_geocode_request = time.monotonic()

            with urlopen(request, timeout=15) as response:
                payload = json.loads(
                    response.read(1_000_000).decode("utf-8")
                )

        if isinstance(payload, dict):
            return _address_components(payload)

        return None

    except Exception:
        # Never log coordinates, provider response bodies,
        # or request URLs.
        logger.warning(
            "Reverse geocoding failed; "
            "the case will retain coordinates only"
        )
        return None


def get_cached_address(
    db,
    latitude: float,
    longitude: float
) -> dict | None:

    row = db.query(GeocodeCache).filter(
        GeocodeCache.cache_key
        == coordinate_cache_key(latitude, longitude)
    ).first()

    return row.address if row and row.address else None


def resolve_and_cache_address(
    db,
    latitude: float,
    longitude: float
) -> dict | None:

    key = coordinate_cache_key(latitude, longitude)

    existing = db.query(GeocodeCache).filter(
        GeocodeCache.cache_key == key
    ).first()

    # Return an existing valid cached address.
    if existing and existing.address:
        return existing.address

    # If the cache entry exists but is empty, retry geocoding.
    address = _request_reverse_geocode(
        latitude,
        longitude
    )

    if not address or not address.get("display_name"):
        return None

    try:
        if existing:
            # Repair the existing empty cache entry.
            existing.address = address
        else:
            # Create a new cache entry.
            row = GeocodeCache(
                cache_key=key,
                address=address
            )
            db.add(row)

        db.commit()

        return address

    except IntegrityError:
        db.rollback()

        # Another request may have inserted the same cache key.
        return get_cached_address(
            db,
            latitude,
            longitude
        )

    except Exception:
        db.rollback()

        logger.warning(
            "Reverse-geocoding cache could not be saved"
        )

        return None
