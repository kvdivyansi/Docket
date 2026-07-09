"""
Notification Agent
-------------------
Mocks the email/notification side of the product so the rest of the system
can be built and demoed without real SMTP/API credentials.

Swap `send_email()`'s body for a real provider (SendGrid, SES, SMTP, etc.)
when credentials are available -- everything else (countdown calculation,
notification log) stays the same.
"""

from datetime import date, datetime


def days_until(target_date: str) -> int:
    try:
        target = datetime.fromisoformat(target_date).date()
    except ValueError:
        return -1
    return (target - date.today()).days


def send_email(to_email: str, to_name: str, subject: str, body: str) -> dict:
    """Mock send: logs the "email" instead of dispatching it for real."""
    record = {
        "to": to_email,
        "recipient_name": to_name,
        "subject": subject,
        "body": body,
        "sent_at": datetime.utcnow().isoformat(),
        "status": "mock_sent",
    }
    print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
    return record


def build_interest_confirmation(user_name: str, conf: dict) -> tuple[str, str]:
    subject = f"You're tracking {conf['acronym']} - deadline countdown started"
    days_left = days_until(conf["abstract_deadline"])
    body = (
        f"Hi {user_name},\n\n"
        f"You've marked interest in {conf['name']} ({conf['acronym']}).\n"
        f"Abstract/paper deadline: {conf['abstract_deadline']} "
        f"({days_left} days from today)\n"
        f"Notification date: {conf['notification_date']}\n"
        f"Conference dates: {conf['conference_start']} to {conf['conference_end']}\n"
        f"Location: {conf['location']}\n"
        f"Website: {conf['website']}\n\n"
        f"We'll remind you as the deadline approaches."
    )
    return subject, body
