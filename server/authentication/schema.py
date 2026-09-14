from django.conf import settings
from drf_spectacular.contrib.rest_framework_simplejwt import SimpleJWTScheme
from drf_spectacular.utils import OpenApiParameter

class VersionedJWTScheme(SimpleJWTScheme):
  target_class = "authentication.authentication.VersionedJWTAuthentication"


OAUTH_PROVIDER_PARAMETER = OpenApiParameter(
  "provider", str, OpenApiParameter.PATH, enum=list(settings.OAUTH_CLIENTS),
)

OAUTH_NEXT_PARAMETER = OpenApiParameter(
  "next",
  str,
  description="Optional return URL: a relative path or a URL from the allowed origins.",
)

OAUTH_LOCATION_HEADER = OpenApiParameter(
  "Location", str, OpenApiParameter.HEADER, response=[302, 303],
)
