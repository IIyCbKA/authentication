from django.core.validators import RegexValidator

from .constants import PASSWORD_PATTERN, PASSWORD_VALIDATE_ERROR

ascii_password_validator = RegexValidator(
  regex=PASSWORD_PATTERN,
  message=PASSWORD_VALIDATE_ERROR,
)
