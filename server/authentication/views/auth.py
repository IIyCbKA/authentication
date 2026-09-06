from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import UserReadSerializer
from ..permissions import (
  CanUseEmailVerificationEndpoints,
  HasAllowedOrigin,
)
from ..serializers import (
  EmailVerificationSerializer,
  LoginSerializer,
  PasswordResetConfirmSerializer,
  PasswordResetRequestSerializer,
  PasswordResetValidateSerializer,
  RegistrationSerializer,
)
from ..services import (
  CookieService,
  EmailVerificationService,
  LoginService,
  PasswordResetService,
  RegistrationService,
  TokenService,
)
from ..types import AuthSession
from core.utils import get_client_ip


class AuthResponseMixin:
  cookie_service_class = CookieService

  def auth_response(self, session: AuthSession, http_status: int) -> Response:
    response = Response(
      data={
        "access_token": session.tokens.access_token,
        "user": UserReadSerializer(session.user).data,
        "is_authenticated": session.tokens.is_authenticated,
      },
      status=http_status,
    )
    self.cookie_service_class().apply(response, session.tokens.refresh_token)
    return response


class RegisterView(AuthResponseMixin, GenericAPIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  serializer_class = RegistrationSerializer
  service_class = RegistrationService
  throttle_scope = "register"

  def post(self, request) -> Response:
      serializer = self.get_serializer(data=request.data)
      serializer.is_valid(raise_exception=True)
      cookie_service = self.cookie_service_class()
      session = self.service_class().register(
        serializer.validated_data,
        current_refresh=cookie_service.read(request),
      )
      return self.auth_response(session, status.HTTP_201_CREATED)


class EmailConfirmView(AuthResponseMixin, GenericAPIView):
  permission_classes = [CanUseEmailVerificationEndpoints, HasAllowedOrigin]
  serializer_class = EmailVerificationSerializer
  service_class = EmailVerificationService
  throttle_scope = "email_confirm"

  def post(self, request) -> Response:
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cookie_service = self.cookie_service_class()
    session = self.service_class().confirm(
      request.user,
      serializer.validated_data["code"],
      current_refresh=cookie_service.read(request),
    )
    return self.auth_response(session, status.HTTP_200_OK)


class ResendCodeView(APIView):
  permission_classes = [CanUseEmailVerificationEndpoints]
  service_class = EmailVerificationService
  throttle_scope = "resend_code"

  def post(self, request) -> Response:
    self.service_class().send_code(request.user)
    return Response(status=status.HTTP_202_ACCEPTED)


class LoginView(AuthResponseMixin, GenericAPIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  serializer_class = LoginSerializer
  service_class = LoginService
  throttle_scope = "login"

  def post(self, request) -> Response:
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cookie_service = self.cookie_service_class()
    session = self.service_class().login(
      identifier=serializer.validated_data["identifier"],
      password=serializer.validated_data["password"],
      device=serializer.validated_data.get("device"),
      ip=get_client_ip(request),
      current_refresh=cookie_service.read(request),
    )
    return self.auth_response(session, status.HTTP_200_OK)


class RefreshView(AuthResponseMixin, APIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  service_class = TokenService
  throttle_scope = "refresh"

  def post(self, request) -> Response:
    raw_refresh = self.cookie_service_class().read(request)
    session = self.service_class().rotate(raw_refresh)
    return self.auth_response(session, status.HTTP_200_OK)


class LogoutView(APIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  cookie_service_class = CookieService
  service_class = TokenService

  def post(self, request) -> Response:
    cookie_service = self.cookie_service_class()
    self.service_class().hard_revoke(cookie_service.read(request))
    response = Response(status=status.HTTP_200_OK)
    cookie_service.delete(response)
    return response


class PasswordResetRequestView(GenericAPIView):
  authentication_classes = []
  permission_classes = [AllowAny]
  serializer_class = PasswordResetRequestSerializer
  service_class = PasswordResetService
  throttle_scope = "reset_password"

  def post(self, request) -> Response:
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    self.service_class().request_reset(serializer.validated_data["email"])
    return Response(status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(AuthResponseMixin, GenericAPIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  serializer_class = PasswordResetConfirmSerializer
  service_class = PasswordResetService
  throttle_scope = "password_reset_confirm"

  def post(self, request) -> Response:
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cookie_service = self.cookie_service_class()
    session = self.service_class().confirm_reset(
      uid=serializer.validated_data["uid"],
      token=serializer.validated_data["token"],
      new_password=serializer.validated_data["new_password"],
      current_refresh=cookie_service.read(request),
    )
    return self.auth_response(session, status.HTTP_200_OK)


class PasswordResetValidateView(GenericAPIView):
  authentication_classes = []
  permission_classes = [AllowAny]
  serializer_class = PasswordResetValidateSerializer
  service_class = PasswordResetService
  throttle_scope = "validate_reset_token"

  def post(self, request) -> Response:
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    self.service_class().validate_token(
      serializer.validated_data["uid"],
      serializer.validated_data["token"],
    )
    return Response(status=status.HTTP_200_OK)
