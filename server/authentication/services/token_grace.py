from django.conf import settings
from django.core.cache import cache
from django.utils.crypto import constant_time_compare, salted_hmac

from ..types import IssuedTokens


class RefreshGraceStore:
  key_prefix = "refresh:successor"

  def __init__(self, cache_backend=cache, timeout: int | None = None):
    self.cache = cache_backend
    self.timeout = (
      settings.REFRESH_ROTATION_GRACE_SECONDS if timeout is None else timeout
    )

  def _key(self, jti: str) -> str:
    return f"{self.key_prefix}:{jti}"

  def _fingerprint(self, raw_refresh: str) -> str:
    return salted_hmac(
      key_salt="refresh:successor",
      value=raw_refresh,
      secret=getattr(settings, "REFRESH_GRACE_SECRET", None),
    ).hexdigest()

  def put(
    self,
    old_jti: str,
    old_refresh: str,
    successor: IssuedTokens,
  ) -> None:
    if successor.refresh_token is None:
      raise ValueError("A refresh successor must contain a refresh token")

    self.cache.set(
      self._key(old_jti),
      {
        "fingerprint": self._fingerprint(old_refresh),
        "access_token": successor.access_token,
        "refresh_token": successor.refresh_token,
      },
      timeout=self.timeout,
    )

  def get(self, old_jti: str, old_refresh: str) -> IssuedTokens | None:
    value = self.cache.get(self._key(old_jti))
    if not isinstance(value, dict):
      return None

    fingerprint = value.get("fingerprint")
    access_token = value.get("access_token")
    refresh_token = value.get("refresh_token")
    if not all(
      isinstance(item, str)
      for item in (
        fingerprint,
        access_token,
        refresh_token,
      )
    ):
      return None

    if not constant_time_compare(
      self._fingerprint(old_refresh),
      fingerprint,
    ):
      return None

    return IssuedTokens(
      access_token=access_token,
      refresh_token=refresh_token,
      is_authenticated=True,
    )

  def delete(self, old_jti: str) -> None:
    self.cache.delete(self._key(old_jti))

  def delete_many(self, jtis: list[str]) -> None:
    self.cache.delete_many([self._key(jti) for jti in jtis])
