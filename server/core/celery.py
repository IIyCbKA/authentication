from celery import Celery
from celery.schedules import crontab
from django.conf import settings
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("core")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.timezone = getattr(settings, "TIME_ZONE", "UTC")
app.conf.enable_utc = getattr(settings, "USE_TZ", True)

app.conf.beat_schedule = {
  "purge-old-username-changes-daily": {
    "task": "accounts.tasks.purge_old_username_changes",
    "schedule": crontab(hour=15, minute=00),
  },
  "flush-expired-jwts-daily": {
    "task": "authentication.tasks.flush_expired_jwt_tokens",
    "schedule": crontab(hour=15, minute=10),
  },
  "purge-expired-email-codes-daily": {
    "task": "authentication.tasks.purge_expired_email_codes",
    "schedule": crontab(hour=15, minute=20),
  },
  "purge-expired-sessions-daily": {
    "task": "authentication.tasks.purge_expired_sessions",
    "schedule": crontab(hour=15, minute=30),
  },
}
