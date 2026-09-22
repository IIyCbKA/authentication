from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from authentication.permissions import HasAllowedOrigin, IsVerifiedOrEmailLess
from authentication.services.tokens import CookieService
from core.schema import ErrorResponseSerializer, ORIGIN_PARAMETER

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

  @extend_schema(
    summary="Get the current account",
    responses={200: UserReadSerializer, "4XX": ErrorResponseSerializer},
  )
  def get(self, request: Request) -> Response:
    return Response(self.get_serializer(request.user).data)

  @extend_schema(
    summary="Delete the current account",
    description=(
      "Requires a full session (verified email or no email). Permanently deletes "
      "the account, revokes its refresh tokens and clears the cookie."
    ),
    parameters=[ORIGIN_PARAMETER],
    responses={204: None, "4XX": ErrorResponseSerializer},
  )
  def delete(self, request: Request) -> Response:
    self.service_class().delete(request.user)
    response = Response(status=status.HTTP_204_NO_CONTENT)
    self.cookie_service_class().delete(response)
    return response


class UpdateUsernameView(GenericAPIView):
  serializer_class = UpdateUsernameSerializer
  permission_classes = [IsVerifiedOrEmailLess]
  throttle_scope = "update_username"

  @extend_schema(
    summary="Update the username",
    responses={200: UsernameUpdateResponseSerializer, "4XX": ErrorResponseSerializer},
  )
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


class GetAllUsersView(GenericAPIView):
  serializer_class = UserReadSerializer
  permission_classes = [IsVerifiedOrEmailLess]

  @extend_schema(
    summary="Get the list of all users (limit 500)",
    responses={200: UserReadSerializer(many=True), "4XX": ErrorResponseSerializer},
  )
  def get(self, _: Request) -> Response:
    all_users = CustomUser.objects.all()[:500]
    response = self.get_serializer(all_users, many=True).data
    return Response(data=response, status=status.HTTP_200_OK)
