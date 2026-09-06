from dataclasses import dataclass

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import (
  BlacklistedToken,
  OutstandingToken,
)
from rest_framework_simplejwt.tokens import (
  AccessToken,
  RefreshToken,
  TokenError,
  UntypedToken,
)

from ..constants import (
  AUTH_SCOPE_CLAIM,
  AUTH_SCOPE_EMAIL_VERIFICATION,
  AUTH_SCOPE_FULL,
  AUTH_VERSION_CLAIM,
)
from ..exceptions import InvalidRefreshTokenError
from ..types import AuthSession, IssuedTokens

from .token_grace import RefreshGraceStore

User = get_user_model()


@dataclass(frozen=True, slots=True)
class RefreshPayload:
  jti: str
  user_id: int
  auth_version: int


class TokenService:
  max_grace_chain_length = 64

  def __init__(self, grace_store: RefreshGraceStore | None = None):
    self.grace_store = grace_store or RefreshGraceStore()

  def replace_session(
    self,
    user_id: int,
    *,
    current_refresh: str | None = None,
  ) -> AuthSession:
    owner_id = self.get_refresh_owner_id(current_refresh)
    with transaction.atomic():
      lock_ids = sorted({user_id, owner_id} - {None})
      locked_users = {
        user.pk: user
        for user in User.objects.select_for_update()
        .filter(pk__in=lock_ids)
        .order_by("pk")
      }
      user = locked_users.get(user_id)
      if user is None:
        raise InvalidRefreshTokenError()
      self._ensure_active(user)
      self.hard_revoke(current_refresh)
      return AuthSession(user=user, tokens=self.issue_for_user(user))

  def issue_for_user(self, user) -> IssuedTokens:
    self._ensure_active(user)

    auth_scope = (
      AUTH_SCOPE_EMAIL_VERIFICATION
      if user.email and not user.is_email_verified
      else AUTH_SCOPE_FULL
    )

    if auth_scope == AUTH_SCOPE_EMAIL_VERIFICATION:
      access = AccessToken.for_user(user)
      self._add_claims(access, user, auth_scope)
      return IssuedTokens(
        access_token=str(access),
        refresh_token=None,
        is_authenticated=False,
      )

    refresh = RefreshToken.for_user(user)
    self._add_claims(refresh, user, auth_scope)
    access = refresh.access_token
    return IssuedTokens(
      access_token=str(access),
      refresh_token=str(refresh),
      is_authenticated=True,
    )

  def rotate(self, raw_refresh: str | None) -> AuthSession:
    payload = self._decode_refresh(raw_refresh)

    with transaction.atomic():
      try:
        user = User.objects.select_for_update().get(pk=payload.user_id)
      except User.DoesNotExist as exc:
        raise InvalidRefreshTokenError() from exc

      self._validate_user_and_version(user, payload.auth_version)
      if user.email and not user.is_email_verified:
        raise InvalidRefreshTokenError()

      outstanding = (
        OutstandingToken.objects.select_for_update()
        .filter(jti=payload.jti, user_id=user.pk)
        .first()
      )
      if outstanding is None:
        raise InvalidRefreshTokenError()

      if BlacklistedToken.objects.filter(token=outstanding).exists():
        successor = self._resolve_grace_successor(payload.jti, raw_refresh, user)
        if successor is None:
          raise InvalidRefreshTokenError()
        return AuthSession(user=user, tokens=successor)

      successor = self.issue_for_user(user)
      self.grace_store.put(payload.jti, raw_refresh, successor)
      BlacklistedToken.objects.create(token=outstanding)
      return AuthSession(user=user, tokens=successor)

  def get_refresh_owner_id(self, raw_refresh: str | None) -> int | None:
    try:
      return self._decode_refresh(raw_refresh).user_id
    except InvalidRefreshTokenError:
      return None

  def hard_revoke(self, raw_refresh: str | None) -> None:
    if not raw_refresh:
      return

    try:
      payload = self._decode_refresh(raw_refresh)
    except InvalidRefreshTokenError:
      return

    with transaction.atomic():
      user = User.objects.select_for_update().filter(pk=payload.user_id).first()

      chain = self._successor_chain(raw_refresh, payload)
      if (
        len(chain) >= self.max_grace_chain_length
        and user is not None
        and payload.auth_version == user.auth_version
      ):
        self.revoke_all_for_user(user)
        return
      jtis = sorted(item.jti for _, item in chain)
      outstanding_tokens = list(
        OutstandingToken.objects.select_for_update()
        .filter(jti__in=jtis)
        .order_by("jti")
      )
      for outstanding in outstanding_tokens:
        BlacklistedToken.objects.get_or_create(token=outstanding)
      for _, item in chain:
        transaction.on_commit(
          lambda jti=item.jti: self.grace_store.delete(jti),
          robust=True,
        )

  def revoke_all_for_user(self, user) -> None:
    with transaction.atomic():
      locked_user = User.objects.select_for_update().get(pk=user.pk)
      outstanding_tokens = list(
        OutstandingToken.objects.select_for_update()
        .filter(user=locked_user)
        .order_by("jti")
      )
      for outstanding in outstanding_tokens:
        BlacklistedToken.objects.get_or_create(token=outstanding)
        transaction.on_commit(
          lambda jti=outstanding.jti: self.grace_store.delete(jti),
          robust=True,
        )

  def build_password_reset_link(self, user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    endpoint = settings.CLIENT_ENDPOINTS["PASSWORD_RESET"]
    return f"{endpoint}?uid={uid}&token={token}"

  def _decode_refresh(self, raw_refresh: str | None) -> RefreshPayload:
    if not raw_refresh:
      raise InvalidRefreshTokenError()

    try:
      token = UntypedToken(raw_refresh)
      if token.get("token_type") != "refresh":
        raise TokenError("Wrong token type")

      return RefreshPayload(
        jti=str(token["jti"]),
        user_id=int(token["user_id"]),
        auth_version=int(token.get(AUTH_VERSION_CLAIM, 0)),
      )
    except (KeyError, TypeError, ValueError, TokenError) as exc:
      raise InvalidRefreshTokenError() from exc

  def _add_claims(self, token, user, auth_scope: str) -> None:
    token[AUTH_VERSION_CLAIM] = user.auth_version
    token[AUTH_SCOPE_CLAIM] = auth_scope

  def _ensure_active(self, user) -> None:
    if not user.is_active:
      raise InvalidRefreshTokenError()

  def _validate_user_and_version(self, user, token_version: int) -> None:
    self._ensure_active(user)
    if token_version != user.auth_version:
      raise InvalidRefreshTokenError()

  def _resolve_grace_successor(
    self,
    old_jti: str,
    old_refresh: str,
    user,
  ) -> IssuedTokens | None:
    seen: set[str] = set()
    current_jti, current_raw = old_jti, old_refresh
    for _ in range(self.max_grace_chain_length):
      if current_jti in seen:
        return None
      seen.add(current_jti)
      successor = self.grace_store.get(current_jti, current_raw)
      if successor is None:
        return None
      try:
        payload = self._decode_refresh(successor.refresh_token)
      except InvalidRefreshTokenError:
        return None
      if payload.user_id != user.pk or payload.auth_version != user.auth_version:
        return None

      outstanding = OutstandingToken.objects.filter(
        jti=payload.jti,
        user_id=user.pk,
      ).first()
      if outstanding is None:
        return None
      if not BlacklistedToken.objects.filter(token=outstanding).exists():
        return successor

      current_jti, current_raw = payload.jti, successor.refresh_token
    return None

  def _successor_chain(
    self,
    raw_refresh: str,
    payload: RefreshPayload,
  ) -> list[tuple[str, RefreshPayload]]:
    chain: list[tuple[str, RefreshPayload]] = []
    seen: set[str] = set()
    current_raw = raw_refresh
    current_payload = payload

    for _ in range(self.max_grace_chain_length):
      if current_payload.jti in seen:
        break
      seen.add(current_payload.jti)
      chain.append((current_raw, current_payload))

      successor = self.grace_store.get(
        current_payload.jti,
        current_raw,
      )
      if successor is None or successor.refresh_token is None:
        break
      try:
        successor_payload = self._decode_refresh(
          successor.refresh_token,
        )
      except InvalidRefreshTokenError:
        break
      if successor_payload.user_id != payload.user_id:
        break

      current_raw = successor.refresh_token
      current_payload = successor_payload

    return chain


class CookieService:
  def __init__(self):
    jwt_settings = settings.SIMPLE_JWT
    self.name = jwt_settings["REFRESH_COOKIE"]
    self.http_only = jwt_settings["REFRESH_COOKIE_HTTP_ONLY"]
    self.secure = jwt_settings["REFRESH_COOKIE_SECURE"]
    self.same_site = jwt_settings["REFRESH_COOKIE_SAMESITE"]
    self.max_age = int(jwt_settings["REFRESH_TOKEN_LIFETIME"].total_seconds())
    self.path = jwt_settings.get("REFRESH_COOKIE_PATH", "/")
    self.domain = jwt_settings.get("REFRESH_COOKIE_DOMAIN")

  def read(self, request) -> str | None:
    return request.COOKIES.get(self.name)

  def apply(self, response, refresh_token: str | None) -> None:
    if refresh_token is None:
      self.delete(response)
      return

    response.set_cookie(
      key=self.name,
      value=refresh_token,
      max_age=self.max_age,
      httponly=self.http_only,
      secure=self.secure,
      samesite=self.same_site,
      path=self.path,
      domain=self.domain,
    )

  def delete(self, response) -> None:
    response.delete_cookie(
      key=self.name,
      path=self.path,
      domain=self.domain,
      samesite=self.same_site,
    )
