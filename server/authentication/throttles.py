from rest_framework.throttling import ScopedRateThrottle

from core.utils import get_client_ip


class TrustedProxyScopedRateThrottle(ScopedRateThrottle):
  """Rate-limit by the same sanitized client address used by auth logging."""

  def get_ident(self, request) -> str:
    return get_client_ip(request) or "unknown"
