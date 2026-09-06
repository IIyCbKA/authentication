import secrets
from datetime import datetime, timedelta
from functools import lru_cache

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models, router, transaction
from django.db.models import Q, UniqueConstraint
from django.db.models.functions import Upper
from django.utils import timezone

from .constants import VERIFICATION_CODE_LENGTH
from .managers import (
  CustomUserManager,
  DeviceManager,
  EmailVerificationCodeManager,
  SocialAccountManager,
  UserDeviceManager,
  UsernameChangeManager,
)

class CustomUser(AbstractUser):
  email = models.EmailField(null=True, blank=True)
  is_email_verified = models.BooleanField(default=False)
  auth_version = models.PositiveBigIntegerField(default=0)

  objects = CustomUserManager()

  class Meta:
    constraints = [
      UniqueConstraint(Upper('username'), name='uniq_username_ci'),
      UniqueConstraint(
        Upper('email'),
        condition=Q(email__isnull=False) & ~Q(email=''),
        name='uniq_email_ci',
      ),
    ]

  def verify_email(self) -> None:
    self.is_email_verified = True
    self.save(update_fields=['is_email_verified'])

  def set_username(self, new_username: str) -> None:
    self.username = new_username
    self.save(update_fields=['username'])

  def save(self, *args, **kwargs) -> None:
    update_fields = kwargs.get('update_fields')
    password_may_have_changed = not self._state.adding and (
      update_fields is None or 'password' in update_fields
    )
    if not password_may_have_changed:
      super().save(*args, **kwargs)
      return

    database = kwargs.get('using') or router.db_for_write(type(self), instance=self)
    kwargs['using'] = database
    with transaction.atomic(using=database):
      previous = (
        type(self)
        .objects.using(database)
        .select_for_update()
        .filter(pk=self.pk)
        .values('password', 'auth_version')
        .first()
      )

      if previous and previous['password'] != self.password:
        self.auth_version = max(self.auth_version, previous['auth_version'] + 1)
        if update_fields is not None:
          kwargs['update_fields'] = {*update_fields, 'auth_version'}

      super().save(*args, **kwargs)

  def clean(self) -> None:
    super().clean()
    conflicts = type(self).objects.exclude(pk=self.pk)
    errors = {}
    if (
      self.username
      and conflicts.filter(
        Q(username__iexact=self.username) | Q(email__iexact=self.username)
      ).exists()
    ):
      errors['username'] = 'This value is already used as a login identifier'

    if (
      self.email
      and conflicts.filter(
        Q(email__iexact=self.email) | Q(username__iexact=self.email)
      ).exists()
    ):
      errors['email'] = 'This value is already used as a login identifier'

    if errors:
      raise ValidationError(errors)


class EmailVerificationCode(models.Model):
  user = models.OneToOneField(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='verification_code',
  )
  secret_code = models.CharField(max_length=255, blank=True, editable=False)
  code_created_at = models.DateTimeField(null=True, blank=True, db_index=True)

  objects = EmailVerificationCodeManager()

  def generate_code(self) -> str:
    raw = f'{secrets.randbelow(10 ** VERIFICATION_CODE_LENGTH):0{VERIFICATION_CODE_LENGTH}d}'
    self.secret_code = make_password(raw)
    self.code_created_at = timezone.now()
    self.save(update_fields=['secret_code', 'code_created_at'])
    return raw

  def regenerate_code(self) -> str:
    return self.generate_code()

  def check_code(self, input_code: str) -> bool:
    return check_password(input_code, self.secret_code)

  def is_expired(self) -> bool:
    if not self.code_created_at:
      return True

    return timezone.now() - self.code_created_at > timedelta(
      seconds=settings.TIMEOUTS['VERIFICATION_CODE']
    )


class Provider(models.TextChoices):
  GOOGLE = 'google', 'Google'
  GITHUB = 'github', 'GitHub'
  YANDEX = 'yandex', 'Yandex'
  X = 'x', 'X'


class SocialAccount(models.Model):
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=255, blank=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )

    objects = SocialAccountManager()

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["provider", "provider_user_id"],
                name="uq_provider_uid",
            ),
        ]


class Device(models.Model):
    device_id = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(default=timezone.now, db_index=True)
    last_ip = models.GenericIPAddressField(null=True, blank=True)

    user_agent = models.TextField(null=True, blank=True)
    language = models.CharField(max_length=64, null=True, blank=True)
    screen = models.CharField(max_length=64, null=True, blank=True)
    logical_processors = models.IntegerField(null=True, blank=True)
    approx_memory = models.IntegerField(null=True, blank=True)
    cookies_enabled = models.BooleanField(null=True, blank=True)
    platform = models.CharField(max_length=128, null=True, blank=True)
    timezone = models.CharField(max_length=64, null=True, blank=True)

    objects = DeviceManager()

    @classmethod
    @lru_cache(maxsize=1)
    def get_updatable_fields(cls) -> set[str]:
        immutable = {"id", "device_id", "created_at"}
        names = {f.name for f in cls._meta.concrete_fields}
        return names - immutable

    def __str__(self) -> str:
        return self.device_id or f"Device {self.pk}"


class UserDevice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_devices"
    )
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="user_devices"
    )

    objects = UserDeviceManager()

    class Meta:
        unique_together = ("user", "device")


class UsernameChange(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="username_changes",
    )
    old_username = models.CharField(max_length=150)
    new_username = models.CharField(max_length=150)
    changed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = UsernameChangeManager()

    @staticmethod
    def get_window() -> timedelta:
        return timedelta(days=settings.USERNAME_CHANGE_WINDOW_DAYS)

    @classmethod
    def get_cutoff(cls) -> datetime:
        return timezone.now() - cls.get_window()

    def get_next_allowed_at(self) -> datetime:
        return self.changed_at + self.get_window()

    def time_until_next_change(self) -> timedelta:
        next_allowed_at: datetime = self.get_next_allowed_at()
        remaining: timedelta = next_allowed_at - timezone.now()

        if remaining.total_seconds() < 0:
            return timedelta(0)
        return remaining

    def __str__(self):
        return (
            f"{self.user} {self.old_username} → {self.new_username} @ {self.changed_at}"
        )