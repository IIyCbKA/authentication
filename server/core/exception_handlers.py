from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

import re

TRAILING_PUNCT_PATTERN = getattr(settings, "TRAILING_PUNCT_PATTERN", r"[.!?…]+$")
_TRAILING_PUNCT_RE = re.compile(TRAILING_PUNCT_PATTERN)
_ERROR_DETAIL_KEY = getattr(settings, "ERROR_DETAIL_KEY", "detail")


def normalize_msg(text: object) -> str:
  if text is None:
    return ""

  text = str(text).strip()
  if not text:
    return ""

  return _TRAILING_PUNCT_RE.sub("", text)


def _first_error(data) -> str:
  if isinstance(data, (list, tuple)):
    if not data:
      return ""
    return _first_error(data[0])

  if isinstance(data, dict):
    for value in data.values():
      return _first_error(value)
    return ""

  return str(data)


def custom_exception_handler(exc, context) -> Response | None:
  response = exception_handler(exc, context)
  if response is None:
    return None

  if isinstance(exc, ValidationError):
    raw_msg = _first_error(response.data)
    response.data = {_ERROR_DETAIL_KEY: normalize_msg(raw_msg)}
  elif isinstance(response.data, dict) and _ERROR_DETAIL_KEY in response.data:
    response.data[_ERROR_DETAIL_KEY] = normalize_msg(response.data[_ERROR_DETAIL_KEY])

  return response
