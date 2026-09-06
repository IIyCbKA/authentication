from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.core.management import call_command
from django.utils import timezone

from accounts.models import EmailVerificationCode

from .constants import (
  NEW_DEVICE_LOGIN_BODY,
  NEW_DEVICE_LOGIN_SUBJECT,
  RESET_PASSWORD_MAIL_BODY,
  RESET_PASSWORD_MAIL_SUBJECT,
  VERIFICATION_MAIL_BODY,
  VERIFICATION_MAIL_SUBJECT,
)


def _send_mail(*, email: str, subject: str, body: str) -> None:
  send_mail(
    subject=subject,
    message=body,
    from_email=settings.DEFAULT_FROM_EMAIL,
    recipient_list=[email],
    fail_silently=False,
  )


def _safe(value: str | None, fallback: str = "Unknown") -> str:
  return fallback if value is None else value


@shared_task(
  bind=True,
  autoretry_for=(Exception,),
  retry_backoff=True,
  retry_backoff_max=300,
  retry_jitter=True,
  max_retries=5,
)
def send_verification_email(
  self,
  email: str,
  code: str,
  created_at: str,
  expires_at: str,
) -> None:
  _send_mail(
    email=email,
    subject=VERIFICATION_MAIL_SUBJECT,
    body=VERIFICATION_MAIL_BODY.format(
      code=code,
      created_at=created_at,
      expires_at=expires_at,
      timezone=settings.TIME_ZONE,
    ),
  )


@shared_task(
  bind=True,
  autoretry_for=(Exception,),
  retry_backoff=True,
  retry_backoff_max=300,
  retry_jitter=True,
  max_retries=5,
)
def send_password_reset_email(
  self,
  email: str,
  reset_link: str,
  created_at: str,
  expires_at: str,
) -> None:
  _send_mail(
    email=email,
    subject=RESET_PASSWORD_MAIL_SUBJECT,
    body=RESET_PASSWORD_MAIL_BODY.format(
      link=reset_link,
      created_at=created_at,
      expires_at=expires_at,
      timezone=settings.TIME_ZONE,
    ),
  )


@shared_task(
  bind=True,
  autoretry_for=(Exception,),
  retry_backoff=True,
  retry_backoff_max=300,
  retry_jitter=True,
  max_retries=5,
)
def send_new_device_email(
  self,
  email: str,
  platform: str | None,
  ip: str | None,
  observed_at: str,
) -> None:
  _send_mail(
    email=email,
    subject=NEW_DEVICE_LOGIN_SUBJECT,
    body=NEW_DEVICE_LOGIN_BODY.format(
      observed_at=observed_at,
      timezone=settings.TIME_ZONE,
      platform=_safe(platform),
      ip=_safe(ip),
    ),
  )


@shared_task
def flush_expired_jwt_tokens() -> None:
  call_command("flushexpiredtokens")


@shared_task
def purge_expired_email_codes() -> int:
  deleted, _ = EmailVerificationCode.objects.expired().delete()
  return deleted


@shared_task
def purge_expired_sessions() -> None:
  call_command("clearsessions")
