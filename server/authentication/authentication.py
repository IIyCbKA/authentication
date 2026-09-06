from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .constants import AUTH_VERSION_CLAIM


class VersionedJWTAuthentication(JWTAuthentication):
  def get_user(self, validated_token):
    user = super().get_user(validated_token)
    if not user.is_active:
      raise AuthenticationFailed("User is inactive", code="user_inactive")

    token_version = validated_token.get(AUTH_VERSION_CLAIM, 0)
    if token_version != user.auth_version:
      raise AuthenticationFailed("Token has been revoked", code="token_revoked")

    return user
