from django.conf import settings
from drf_spectacular.utils import OpenApiParameter
from rest_framework import serializers

class ErrorResponseSerializer(serializers.Serializer):
  detail = serializers.CharField()


ORIGIN_PARAMETER = OpenApiParameter(
  "Origin",
  str,
  OpenApiParameter.HEADER,
  required=True,
  default=settings.CLIENT_BASE_URL,
  description="Allowed request origin. Browsers set this header automatically.",
)
