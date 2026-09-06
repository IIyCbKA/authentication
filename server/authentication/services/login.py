from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from ..exceptions import InvalidCredentialsError
from ..types import AuthSession

from .devices import DeviceService
from .tokens import TokenService
from .verification import EmailVerificationService

User = get_user_model()
_DUMMY_PASSWORD_HASH = make_password("authentication-dummy-password")


class LoginService:
  def __init__(
    self,
    token_service: TokenService | None = None,
    verification_service: EmailVerificationService | None = None,
    device_service: DeviceService | None = None,
  ):
    self.token_service = token_service or TokenService()
    self.verification_service = verification_service or EmailVerificationService(
      self.token_service,
    )
    self.device_service = device_service or DeviceService()

  def login(
    self,
    *,
    identifier: str,
    password: str,
    device: dict | None,
    ip: str | None,
    current_refresh: str | None = None,
  ) -> AuthSession:
    candidate = self._authenticate(identifier, password)
    owner_id = self.token_service.get_refresh_owner_id(current_refresh)

    with transaction.atomic():
      lock_ids = sorted({candidate.pk, owner_id} - {None})
      locked_users = {
        user.pk: user
        for user in User.objects.select_for_update().filter(pk__in=lock_ids).order_by("pk")
      }

      user = locked_users.get(candidate.pk)

      if (
        user is None
        or not User.objects.by_identifier(identifier).filter(pk=user.pk).exists()
        or not user.check_password(password)
        or not user.is_active
      ):
        raise InvalidCredentialsError()

      observed_at = timezone.now()
      user.last_login = observed_at
      user.save(update_fields=["last_login"])

      self.token_service.hard_revoke(current_refresh)
      if user.email and not user.is_email_verified:
        self.verification_service.send_code(user)
      else:
        self.device_service.record_login(
          user,
          device,
          ip,
          observed_at=observed_at,
        )

    tokens = self.token_service.issue_for_user(user)
    return AuthSession(user=user, tokens=tokens)

  def _authenticate(self, identifier: str, password: str):
    try:
      user = User.objects.get_by_identifier(identifier)
    except (User.DoesNotExist, User.MultipleObjectsReturned) as exc:
      check_password(password, _DUMMY_PASSWORD_HASH)
      raise InvalidCredentialsError() from exc

    if not check_password(password, user.password) or not user.is_active:
      raise InvalidCredentialsError()

    return user
