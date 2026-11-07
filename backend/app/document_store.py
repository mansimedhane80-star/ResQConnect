import os
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
DOCUMENTS = {
    "government_id": ("government_id_ref", "Government ID"),
    "authorization_letter": ("authorization_letter_ref", "Authorization letter"),
    "organization_id": ("organization_id_ref", "Organization ID"),
}
_STORED_FILE_PATTERN = re.compile(r"^[a-f0-9-]{36}\.(pdf|png|jpg)$")


def documents_root() -> Path:
    root = Path(settings.ADMIN_DOCUMENTS_DIR).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    if os.name == "posix":
        try:
            os.chmod(root, 0o700)
        except OSError:
            pass
    return root


async def store_document(upload: UploadFile) -> tuple[str, str]:
    """Inspect file signatures, then persist bytes under a random private name."""
    if upload.size is not None and upload.size > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Each document must be 5 MB or smaller")
    data = await upload.read(MAX_DOCUMENT_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded document is empty")
    if len(data) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Each document must be 5 MB or smaller")

    if data.startswith(b"%PDF-") and b"%%EOF" in data[-2048:]:
        extension, media_type = "pdf", "application/pdf"
    elif (data.startswith(b"\x89PNG\r\n\x1a\n") and
          b"IEND" in data[-16:]):
        extension, media_type = "png", "image/png"
    elif data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"):
        extension, media_type = "jpg", "image/jpeg"
    else:
        raise HTTPException(
            status_code=415,
            detail="Document content must be a valid PDF, JPEG, or PNG file",
        )

    stored_name = f"{uuid.uuid4()}.{extension}"
    target = documents_root() / stored_name
    with target.open("xb") as destination:
        destination.write(data)
    return stored_name, media_type


def resolve_document(stored_name: str) -> Path:
    if not _STORED_FILE_PATTERN.fullmatch(stored_name or ""):
        raise HTTPException(status_code=404, detail="Document not found")
    root = documents_root()
    path = (root / stored_name).resolve()
    if path.parent != root or not path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")
    return path


def remove_documents(stored_names: list[str]) -> None:
    root = documents_root()
    for stored_name in stored_names:
        if _STORED_FILE_PATTERN.fullmatch(stored_name or ""):
            path = root / stored_name
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
