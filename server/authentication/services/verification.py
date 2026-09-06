from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import EmailVerificationCode
from ..exceptions import (
    EmailAlreadyVerifiedError,
    NoVerificationCodeError,
    VerificationCodeExpiredError,
    VerificationCodeIncorrectError,
)
from ..tasks import send_verification_email
from ..types import AuthSession

from .tokens import TokenService

User = get_user_model()


class EmailVerificationService:
    def __init__(self, token_service: TokenService | None = None):
        self.token_service = token_service or TokenService()

    def send_code(self, user) -> None:
        with transaction.atomic():
            locked_user = User.objects.select_for_update().get(pk=user.pk)
            self._ensure_pending(locked_user)
            self._issue_and_schedule(locked_user)

    def confirm(
        self,
        user,
        code: str,
        current_refresh: str | None = None,
    ) -> AuthSession:
        owner_id = self.token_service.get_refresh_owner_id(current_refresh)
        with transaction.atomic():
            lock_ids = sorted({user.pk, owner_id} - {None})
            locked_users = {
                item.pk: item
                for item in User.objects.select_for_update()
                .filter(pk__in=lock_ids)
                .order_by("pk")
            }
            locked_user = locked_users.get(user.pk)
            if locked_user is None:
                raise NoVerificationCodeError()
            if not locked_user.is_active:
                raise NoVerificationCodeError()
            if locked_user.is_email_verified:
                raise EmailAlreadyVerifiedError()

            try:
                verification = EmailVerificationCode.objects.select_for_update().get(
                    user=locked_user
                )
            except EmailVerificationCode.DoesNotExist as exc:
                raise NoVerificationCodeError() from exc

            if verification.is_expired():
                raise VerificationCodeExpiredError()
            if not verification.check_code(code):
                raise VerificationCodeIncorrectError()

            locked_user.verify_email()
            verification.delete()
            self.token_service.hard_revoke(current_refresh)
            tokens = self.token_service.issue_for_user(locked_user)
            return AuthSession(user=locked_user, tokens=tokens)

    def _ensure_pending(self, user) -> None:
        if not user.is_active:
            raise NoVerificationCodeError()
        if user.is_email_verified:
            raise EmailAlreadyVerifiedError()
        if not user.email:
            raise NoVerificationCodeError()

    def _issue_and_schedule(self, user) -> None:
        verification, _ = (
            EmailVerificationCode.objects.select_for_update().get_or_create(user=user)
        )
        raw_code = verification.regenerate_code()
        created_at = verification.code_created_at
        expires_at = created_at + timedelta(
            seconds=settings.TIMEOUTS["VERIFICATION_CODE"],
        )
        send_verification_email.delay_on_commit(
            user.email,
            raw_code,
            created_at.isoformat(),
            expires_at.isoformat(),
        )
