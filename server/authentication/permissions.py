from urllib.parse import urlsplit

from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .constants import AUTH_SCOPE_EMAIL_VERIFICATION


def _origin(value: str | None) -> str | None:
  if not value:
    return None

  parsed = urlsplit(value)
  if parsed.scheme not in {"http", "https"} or not parsed.netloc:
    return None

  return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


class HasAllowedOrigin(BasePermission):
  """CSRF protection for endpoints which mutate an HttpOnly cookie.

  The browser client already sends an Origin header, so this keeps the
  existing client contract without introducing a separate CSRF header.
  Requests without an Origin are rejected on purpose for these endpoints.
  """

  message = "Request origin is not allowed"

  def has_permission(self, request, view) -> bool:
    if request.method in SAFE_METHODS:
      return True

    supplied = _origin(request.headers.get("Origin"))
    if supplied is None:
      return False

    configured = {
      normalized
      for value in (
        *getattr(settings, "CORS_ALLOWED_ORIGINS", ()),
        *getattr(settings, "CSRF_TRUSTED_ORIGINS", ()),
      )
      if (normalized := _origin(value)) is not None
    }

    try:
      request_origin = _origin(request.build_absolute_uri("/"))
      if request_origin is not None:
        configured.add(request_origin)
    except Exception:
      pass

    return supplied in configured


class IsVerifiedOrEmailLess(BasePermission):
  """Default permission for full account/application endpoints."""

  message = "Email verification is required"

  def has_permission(self, request, view) -> bool:
    user = request.user
    if not user or not user.is_authenticated or not user.is_active:
      return False

    token_scope = None
    if request.auth is not None:
      try:
        token_scope = request.auth.get("auth_scope")
      except AttributeError:
        token_scope = None

    if token_scope == AUTH_SCOPE_EMAIL_VERIFICATION:
      return False

    return not user.email or user.is_email_verified


class CanUseEmailVerificationEndpoints(BasePermission):
  """Allows a pending access token to call confirm/resend only."""

  message = "Email verification is not available for this account"

  def has_permission(self, request, view) -> bool:
    user = request.user
    return bool(user and user.is_authenticated and user.is_active and user.email)
