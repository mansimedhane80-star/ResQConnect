"""Provider-backed notifications with durable event-key deduplication."""
import base64
import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models import NotificationLog

logger = logging.getLogger(__name__)


def _reserve(db, event_key: str, channel: str):
    row = NotificationLog(event_key=event_key, channel=channel, outcome="sending")
    try:
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        return None
    except Exception:
        db.rollback()
        logger.warning("Notification was not attempted because its deduplication record could not be saved")
        return None


def _finish(db, row, outcome: str):
    try:
        row.outcome = outcome
        db.commit()
    except Exception:
        db.rollback()
        logger.warning("Notification outcome could not be recorded")


def _notify_email(db, event_key: str, recipient: str, subject: str, body: str) -> str:
    row = _reserve(db, event_key, "email")
    if row is None:
        return "duplicate_or_unavailable"
    if not all((settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD, settings.SMTP_FROM_EMAIL)):
        _finish(db, row, "not_configured")
        return "not_configured"
    try:
        message = EmailMessage()
        message["From"] = settings.SMTP_FROM_EMAIL
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
        _finish(db, row, "accepted")
        return "accepted"
    except Exception:
        _finish(db, row, "failed")
        logger.warning("Email provider did not accept notification event %s", event_key)
        return "failed"


def _notify_sms(db, event_key: str, recipient: str, body: str) -> str:
    row = _reserve(db, event_key, "sms")
    if row is None:
        return "duplicate_or_unavailable"
    if not all((settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER)):
        _finish(db, row, "not_configured")
        return "not_configured"
    number = recipient.strip().replace(" ", "").replace("-", "")
    if number.isdigit() and len(number) == 10:
        number = "+91" + number
    if not number.startswith("+91") or not number[1:].isdigit() or len(number) != 13:
        _finish(db, row, "invalid_recipient")
        return "invalid_recipient"
    sid = settings.TWILIO_ACCOUNT_SID
    endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    payload = urlencode({"To": number, "From": settings.TWILIO_FROM_NUMBER, "Body": body}).encode()
    auth = base64.b64encode(f"{sid}:{settings.TWILIO_AUTH_TOKEN}".encode()).decode()
    request = Request(endpoint, data=payload, headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urlopen(request, timeout=15) as response:
            if response.status not in (200, 201):
                raise RuntimeError("Provider rejected message")
        _finish(db, row, "accepted")
        return "accepted"
    except Exception:
        _finish(db, row, "failed")
        logger.warning("SMS provider did not accept notification event %s", event_key)
        return "failed"



def notify_email(db, event_key: str, recipient: str, subject: str, body: str) -> str:
    try:
        return _notify_email(db, event_key, recipient, subject, body)
    except Exception:
        db.rollback()
        logger.warning("Email notification could not be processed for event %s", event_key)
        return "failed"


def notify_sms(db, event_key: str, recipient: str, body: str) -> str:
    try:
        return _notify_sms(db, event_key, recipient, body)
    except Exception:
        db.rollback()
        logger.warning("SMS notification could not be processed for event %s", event_key)
        return "failed"
