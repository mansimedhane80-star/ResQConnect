import hashlib
import re
import secrets


TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_NEW_CODE_RE = re.compile(r"^RSC([A-HJ-NP-Z2-9]{20})$", re.IGNORECASE)


def generate_tracking_code() -> str:
    """Generate a 100-bit code with readable, ambiguity-free characters."""
    payload = "".join(secrets.choice(TRACKING_ALPHABET) for _ in range(20))
    return "RSC-" + "-".join(payload[index:index + 4] for index in range(0, 20, 4))


def normalize_tracking_credential(value: str) -> str:
    """Canonicalize new human codes while preserving legacy token casing."""
    raw = value.strip()
    compact = re.sub(r"[\s-]", "", raw)
    match = _NEW_CODE_RE.fullmatch(compact)
    if not match:
        return raw
    payload = match.group(1).upper()
    return "RSC-" + "-".join(payload[index:index + 4] for index in range(0, 20, 4))


def tracking_credential_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
