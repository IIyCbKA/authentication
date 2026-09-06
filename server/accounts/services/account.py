from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from authentication.services.tokens import TokenService

from ..models import CustomUser


class AccountService:
  def __init__(self, token_service: TokenService | None = None):
    self.token_service = token_service or TokenService()

  def delete(self, user: CustomUser) -> None:
    with transaction.atomic():
      locked_user = CustomUser.objects.select_for_update().filter(pk=user.pk).first()
      if locked_user is None or not locked_user.is_active:
        raise AuthenticationFailed('Account session is no longer valid')

      if locked_user.email and not locked_user.is_email_verified:
        raise PermissionDenied('Email verification is required')

      self.token_service.revoke_all_for_user(locked_user)
      locked_user.delete()
