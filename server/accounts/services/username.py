from django.conf import settings
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from ..constants import USERNAME_MAX_LENGTH
from ..exceptions import (
  UsernameAlreadyTakenError,
  UsernameChangeLimitExceeded,
  UsernameInvalidError,
)
from ..identifiers import lock_identifiers
from ..models import CustomUser, UsernameChange


class UsernameService:
  def change(self, user: CustomUser, new_username: str | None) -> CustomUser:
    with transaction.atomic():
      locked_user = CustomUser.objects.select_for_update().filter(pk=user.pk).first()
      if locked_user is None or not locked_user.is_active:
        raise AuthenticationFailed("Account session is no longer valid")

      if locked_user.email and not locked_user.is_email_verified:
        raise PermissionDenied("Email verification is required")

      if new_username is None or locked_user.username == new_username:
        return locked_user

      with lock_identifiers(new_username):
        self._validate_syntax(new_username)
        if (
          CustomUser.objects.filter(
            Q(username__iexact=new_username) | Q(email__iexact=new_username)
          )
          .exclude(pk=locked_user.pk)
          .exists()
        ):
          raise UsernameAlreadyTakenError()

        self._ensure_quota_available(locked_user)
        old_username = locked_user.username

        try:
          with transaction.atomic():
            locked_user.set_username(new_username)
        except IntegrityError as exc:
          raise UsernameAlreadyTakenError() from exc

        UsernameChange.objects.create(
          user=locked_user,
          old_username=old_username,
          new_username=new_username,
        )

        return locked_user

  @staticmethod
  def _validate_syntax(username: str) -> None:
    if len(username) > USERNAME_MAX_LENGTH:
      raise UsernameInvalidError(
        f"Ensure this field has no more than {USERNAME_MAX_LENGTH} characters"
      )

    try:
      UnicodeUsernameValidator()(username)
    except DjangoValidationError as exc:
      raise UsernameInvalidError(exc.messages[0]) from exc

  @staticmethod
  def _ensure_quota_available(user: CustomUser) -> None:
    active_changes = UsernameChange.objects.active_for(user, at=timezone.now())
    if active_changes.count() < settings.USERNAME_CHANGE_LIMIT:
      return

    first_active = active_changes.first()
    raise UsernameChangeLimitExceeded(first_active.get_next_allowed_at())
