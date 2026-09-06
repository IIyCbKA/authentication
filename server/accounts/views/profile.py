from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from authentication.permissions import HasAllowedOrigin, IsVerifiedOrEmailLess
from authentication.services.tokens import CookieService

from ..serializers import (
  UpdateUsernameSerializer,
  UsernameUpdateResponseSerializer,
  UserReadSerializer,
)
from ..services import AccountService

CustomUser = get_user_model()


class CurrentAccountView(GenericAPIView):
  serializer_class = UserReadSerializer
  permission_classes = [IsVerifiedOrEmailLess, HasAllowedOrigin]
  service_class = AccountService
  cookie_service_class = CookieService

  def get(self, request: Request) -> Response:
    return Response(self.get_serializer(request.user).data)

  def delete(self, request: Request) -> Response:
    self.service_class().delete(request.user)
    response = Response(status=status.HTTP_204_NO_CONTENT)
    self.cookie_service_class().delete(response)
    return response


class UpdateUsernameView(GenericAPIView):
  serializer_class = UpdateUsernameSerializer
  permission_classes = [IsVerifiedOrEmailLess]
  throttle_scope = "update_username"

  def patch(self, request: Request) -> Response:
    serializer = self.get_serializer(
      data=request.data,
      partial=True,
      context={"user": request.user},
    )
    serializer.is_valid(raise_exception=True)
    user: CustomUser = serializer.save()

    response = UsernameUpdateResponseSerializer({"user": user})
    return Response(data=response.data, status=status.HTTP_200_OK)
