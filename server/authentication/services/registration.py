from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q
from email_validator import EmailNotValidError, validate_email

from accounts.validators import ascii_password_validator
from ..exceptions import (
  EmailAlreadyTakenError,
  InvalidEmailError,
  InvalidPasswordError,
  RegistrationConflictError,
  UsernameAlreadyTakenError,
)
from ..types import AuthSession

from .tokens import TokenService
from .verification import EmailVerificationService

User = get_user_model()


class RegistrationService:
  def __init__(
    self,
    token_service: TokenService | None = None,
    verification_service: EmailVerificationService | None = None,
  ):
    self.token_service = token_service or TokenService()
    self.verification_service = verification_service or EmailVerificationService(
      self.token_service,
    )

  def register(
    self,
    data: dict,
    current_refresh: str | None = None,
  ) -> AuthSession:
    username = data["username"]
    email = self._validated_email(data["email"])
    password = data["password"]

    candidate = User(username=username, email=email)
    self._validate_password(password, candidate)

    try:
      with transaction.atomic():
        self.token_service.hard_revoke(current_refresh)

        if User.objects.filter(
          Q(username__iexact=username) | Q(email__iexact=username),
        ).exists():
          raise UsernameAlreadyTakenError()
        if User.objects.filter(
          Q(email__iexact=email) | Q(username__iexact=email),
        ).exists():
          raise EmailAlreadyTakenError()

        user = User.objects.create_user(
          username=username,
          email=email,
          password=password,
        )
        self.verification_service.send_code(user)
        tokens = self.token_service.issue_for_user(user)
        return AuthSession(user=user, tokens=tokens)
    except IntegrityError as exc:
      if User.objects.filter(
        Q(username__iexact=username) | Q(email__iexact=username),
      ).exists():
        raise UsernameAlreadyTakenError() from exc
      if User.objects.filter(
        Q(email__iexact=email) | Q(username__iexact=email),
      ).exists():
        raise EmailAlreadyTakenError() from exc
      raise RegistrationConflictError() from exc

  def _validated_email(self, email: str) -> str:
    try:
      result = validate_email(
        email,
        check_deliverability=settings.EMAIL_CHECK_DELIVERABILITY,
        allow_smtputf8=True,
        test_environment=not settings.EMAIL_CHECK_DELIVERABILITY,
      )
    except EmailNotValidError as exc:
      raise InvalidEmailError() from exc
    return result.normalized

  def _validate_password(self, password: str, user) -> None:
    try:
      ascii_password_validator(password)
      validate_password(password, user=user)
    except DjangoValidationError as exc:
      raise InvalidPasswordError(list(exc.messages)) from exc
