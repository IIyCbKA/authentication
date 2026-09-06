from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from accounts.validators import ascii_password_validator
from ..exceptions import InvalidPasswordError, InvalidPasswordResetTokenError
from ..tasks import send_password_reset_email
from ..types import AuthSession

from .tokens import TokenService

User = get_user_model()


class PasswordResetService:
    def __init__(self, token_service: TokenService | None = None):
        self.token_service = token_service or TokenService()

    def request_reset(self, email: str) -> None:
        user = User.objects.find_by_email(email)
        if user is None or not user.is_active:
            return

        created_at = timezone.now()
        expires_at = created_at + timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT)
        reset_link = self.token_service.build_password_reset_link(user)
        send_password_reset_email.delay(
            user.email,
            reset_link,
            created_at.isoformat(),
            expires_at.isoformat(),
        )

    def validate_token(self, uid: str, token: str) -> None:
        with transaction.atomic():
            user_id = self._decode_user_id(uid)
            try:
                user = User.objects.get(pk=user_id, is_active=True)
            except User.DoesNotExist as exc:
                raise InvalidPasswordResetTokenError() from exc
            self._ensure_valid_token(user, token)

    def confirm_reset(
        self,
        *,
        uid: str,
        token: str,
        new_password: str,
        current_refresh: str | None = None,
    ) -> AuthSession:
        user_id = self._decode_user_id(uid)

        with transaction.atomic():
            try:
                user = User.objects.select_for_update().get(
                    pk=user_id,
                    is_active=True,
                )
            except User.DoesNotExist as exc:
                raise InvalidPasswordResetTokenError() from exc

            self._ensure_valid_token(user, token)
            try:
                ascii_password_validator(new_password)
                validate_password(new_password, user=user)
            except DjangoValidationError as exc:
                raise InvalidPasswordError(list(exc.messages)) from exc

            user.set_password(new_password)
            user.save(update_fields=["password"])

            self.token_service.revoke_all_for_user(user)
            tokens = self.token_service.issue_for_user(user)
            session = AuthSession(user=user, tokens=tokens)

        self.token_service.hard_revoke(current_refresh)
        return session

    def _decode_user_id(self, uid: str) -> int:
        try:
            user_id = int(force_str(urlsafe_base64_decode(uid)))
            if user_id <= 0:
                raise ValueError("User id must be positive")
            return user_id
        except (TypeError, ValueError, OverflowError) as exc:
            raise InvalidPasswordResetTokenError() from exc

    def _ensure_valid_token(self, user, token: str) -> None:
        if not default_token_generator.check_token(user, token):
            raise InvalidPasswordResetTokenError()
