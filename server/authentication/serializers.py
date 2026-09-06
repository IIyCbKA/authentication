from django.contrib.auth.validators import UnicodeUsernameValidator
from rest_framework import serializers

from accounts.serializers import UserReadSerializer

from .constants import VERIFICATION_CODE_LENGTH


class RegistrationSerializer(serializers.Serializer):
  username = serializers.CharField(
    min_length=1,
    max_length=150,
    validators=[UnicodeUsernameValidator()],
  )
  email = serializers.EmailField(allow_blank=False, max_length=254)
  password = serializers.CharField(
    min_length=8,
    max_length=128,
    trim_whitespace=False,
    write_only=True,
  )


class DeviceInfoSerializer(serializers.Serializer):
  device_id = serializers.CharField(min_length=1, max_length=64)
  user_agent = serializers.CharField(
    allow_blank=True,
    allow_null=True,
    max_length=2048,
    required=False,
  )
  language = serializers.CharField(
    allow_blank=True,
    allow_null=True,
    max_length=64,
    required=False,
  )
  screen = serializers.CharField(
    allow_blank=True,
    allow_null=True,
    max_length=64,
    required=False,
  )
  logical_processors = serializers.IntegerField(
    allow_null=True,
    min_value=1,
    max_value=4096,
    required=False,
  )
  approx_memory = serializers.IntegerField(
    allow_null=True,
    min_value=0,
    max_value=1_048_576,
    required=False,
  )
  cookies_enabled = serializers.BooleanField(allow_null=True, required=False)
  platform = serializers.CharField(
    allow_blank=True,
    allow_null=True,
    max_length=128,
    required=False,
  )
  timezone = serializers.CharField(
    allow_blank=True,
    allow_null=True,
    max_length=64,
    required=False,
  )


class LoginSerializer(serializers.Serializer):
  identifier = serializers.CharField(min_length=1, max_length=254)
  password = serializers.CharField(trim_whitespace=False, write_only=True)
  device = DeviceInfoSerializer(required=False)


class EmailVerificationSerializer(serializers.Serializer):
  code = serializers.RegexField(
    regex=rf"^\d{{{VERIFICATION_CODE_LENGTH}}}$",
    max_length=VERIFICATION_CODE_LENGTH,
    min_length=VERIFICATION_CODE_LENGTH,
    trim_whitespace=False,
    write_only=True,
  )


class PasswordResetRequestSerializer(serializers.Serializer):
  email = serializers.EmailField(allow_blank=False, max_length=254)


class BasePasswordResetTokenSerializer(serializers.Serializer):
  uid = serializers.CharField(allow_blank=False, max_length=128)
  token = serializers.CharField(allow_blank=False, max_length=256)


class PasswordResetConfirmSerializer(BasePasswordResetTokenSerializer):
  new_password = serializers.CharField(
    min_length=8,
    max_length=128,
    trim_whitespace=False,
    write_only=True,
  )


class PasswordResetValidateSerializer(BasePasswordResetTokenSerializer):
  pass


class AuthenticationResponseSerializer(serializers.Serializer):
  access_token = serializers.CharField(read_only=True)
  user = UserReadSerializer(read_only=True)
  is_authenticated = serializers.BooleanField(read_only=True)


class OAuthAuthorizationResponseSerializer(serializers.Serializer):
  authorization_url = serializers.URLField(read_only=True)
