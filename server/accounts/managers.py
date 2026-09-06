from __future__ import annotations

from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.contrib.auth.models import UserManager
from django.db import IntegrityError, models, transaction
from django.db.models import Q
from django.utils import timezone

if TYPE_CHECKING:
  from .models import CustomUser, Device, SocialAccount, UserDevice

from .identifiers import lock_identifiers


class CustomUserQuerySet(models.QuerySet):
  def by_email(self, email: str) -> "CustomUserQuerySet":
    return self.filter(email__iexact=email)

  def by_identifier(self, identifier: str) -> "CustomUserQuerySet":
    return self.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier))


class CustomUserManager(UserManager.from_queryset(CustomUserQuerySet)):
  use_in_migrations = True

  def _create_user(self, username, email, password, **extra_fields):
    username = self.model.normalize_username(username)
    email = self.normalize_email(email)

    with transaction.atomic(), lock_identifiers(username, email):
      identifiers = [value for value in (username, email) if value]
      if any(self.by_identifier(value).exists() for value in identifiers):
        raise IntegrityError("Login identifier already belongs to another user")
      return super()._create_user(username, email, password, **extra_fields)

  def get_by_email(self, email: str) -> "CustomUser":
    return self.by_email(email).get()

  def find_by_email(self, email: str) -> "CustomUser | None":
    return self.by_email(email).first()

  def get_by_identifier(self, identifier: str) -> "CustomUser":
    return self.by_identifier(identifier).get()

  def find_by_identifier(self, identifier: str) -> "CustomUser | None":
    try:
      return self.get_by_identifier(identifier)
    except (self.model.DoesNotExist, self.model.MultipleObjectsReturned):
      return None


class EmailVerificationCodeQuerySet(models.QuerySet):
  def for_user(self, user: "CustomUser") -> "EmailVerificationCodeQuerySet":
    return self.filter(user=user)

  def expired(self, *, at: datetime | None = None) -> "EmailVerificationCodeQuerySet":
    reference = at or timezone.now()
    cutoff = reference - timedelta(seconds=settings.TIMEOUTS["VERIFICATION_CODE"])
    return self.filter(code_created_at__lt=cutoff)


class EmailVerificationCodeManager(
  models.Manager.from_queryset(EmailVerificationCodeQuerySet)
):
  pass


class DeviceQuerySet(models.QuerySet):
  def by_device_id(self, device_id: str) -> "DeviceQuerySet":
    return self.filter(device_id=device_id)

  def for_user(self, user: "CustomUser") -> "DeviceQuerySet":
    return self.filter(user_devices__user=user)

  def recently_seen(self) -> "DeviceQuerySet":
    return self.order_by("-last_seen")


class DeviceManager(models.Manager.from_queryset(DeviceQuerySet)):
  def find_by_device_id(self, device_id: str) -> "Device | None":
    return self.by_device_id(device_id).first()

  def update_from_payload(
    self, *, device_id: str, payload: dict[str, Any]
  ) -> tuple["Device", bool]:
    updatable_fields = self.model.get_updatable_fields()
    defaults = {
      key: value
      for key, value in payload.items()
      if key in updatable_fields and value is not None
    }
    return self.update_or_create(device_id=device_id, defaults=defaults)


class UserDeviceQuerySet(models.QuerySet):
  def with_related(self) -> "UserDeviceQuerySet":
    return self.select_related("user", "device")

  def for_user(self, user: "CustomUser") -> "UserDeviceQuerySet":
    return self.filter(user=user)

  def for_device(self, device: "Device") -> "UserDeviceQuerySet":
    return self.filter(device=device)


class UserDeviceManager(models.Manager.from_queryset(UserDeviceQuerySet)):
  def link(self, *, user: "CustomUser", device: "Device") -> tuple["UserDevice", bool]:
    return self.get_or_create(user=user, device=device)


class SocialAccountQuerySet(models.QuerySet):
  def with_user(self) -> "SocialAccountQuerySet":
    return self.select_related("user")

  def for_identity(
    self, provider: str, provider_user_id: str
  ) -> "SocialAccountQuerySet":
    return self.filter(provider=provider, provider_user_id=provider_user_id)

  def for_user(self, user: "CustomUser") -> "SocialAccountQuerySet":
    return self.filter(user=user)


class SocialAccountManager(models.Manager.from_queryset(SocialAccountQuerySet)):
  def find_user(self, provider: str, provider_user_id: str) -> "CustomUser | None":
    account: SocialAccount | None = (
      self.with_user().for_identity(provider, provider_user_id).first()
    )
    return account.user if account is not None else None


class UsernameChangeQuerySet(models.QuerySet):
  def active(self, *, at: datetime | None = None) -> "UsernameChangeQuerySet":
    reference = at or timezone.now()
    cutoff = reference - timedelta(days=settings.USERNAME_CHANGE_WINDOW_DAYS)
    return self.filter(changed_at__gte=cutoff)

  def active_for(
    self, user: "CustomUser", *, at: datetime | None = None
  ) -> "UsernameChangeQuerySet":
    return self.active(at=at).filter(user=user).order_by("changed_at")

  def old(self, *, at: datetime | None = None) -> "UsernameChangeQuerySet":
    reference = at or timezone.now()
    cutoff = reference - timedelta(days=settings.USERNAME_CHANGE_WINDOW_DAYS)
    return self.filter(changed_at__lt=cutoff)


class UsernameChangeManager(models.Manager.from_queryset(UsernameChangeQuerySet)):
  pass
