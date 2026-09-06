from datetime import timezone as dt_timezone

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .constants import USERNAME_ALREADY_TAKEN_ERROR, USERNAME_CHANGE_LIMIT_ERROR
from .exceptions import (
  UsernameAlreadyTakenError,
  UsernameChangeLimitExceeded,
  UsernameInvalidError,
)
from .services import UsernameService

User = get_user_model()


class UserReadSerializer(serializers.ModelSerializer):
  class Meta:
    model = User
    fields = ("id", "username", "email", "is_email_verified")
    read_only_fields = fields


class UpdateUsernameSerializer(serializers.Serializer):
  username = serializers.CharField(max_length=150, allow_blank=False)
  service_class = UsernameService

  def save(self, **kwargs):
    user = self.context["user"]
    try:
      return self.service_class().change(user, self.validated_data.get("username"))
    except UsernameAlreadyTakenError as exc:
      raise serializers.ValidationError(
        {"username": USERNAME_ALREADY_TAKEN_ERROR},
      ) from exc
    except UsernameInvalidError as exc:
      raise serializers.ValidationError({"username": exc.detail}) from exc
    except UsernameChangeLimitExceeded as exc:
      next_allowed_utc = exc.next_allowed_at.astimezone(dt_timezone.utc)
      human = next_allowed_utc.strftime(settings.DEFAULT_HUMAN_DATETIME_FORMAT)
      raise serializers.ValidationError(
        {"username": USERNAME_CHANGE_LIMIT_ERROR.format(human=human)},
      ) from exc


class UsernameUpdateResponseSerializer(serializers.Serializer):
  user = UserReadSerializer(read_only=True)
