from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import UserReadSerializer
from core.schema import ErrorResponseSerializer, ORIGIN_PARAMETER
from ..permissions import (
  CanUseEmailVerificationEndpoints,
  HasAllowedOrigin,
)
from ..serializers import (
  AuthenticationResponseSerializer,
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

  @extend_schema(
    summary="Register an account",
    description=(
      "Returns a pending access token (isAuthenticated=false), without a refresh cookie. "
      "Confirm the email to open a full session."
    ),
    parameters=[ORIGIN_PARAMETER],
    responses={201: AuthenticationResponseSerializer, "4XX": ErrorResponseSerializer},
  )
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

  @extend_schema(
    summary="Confirm email",
    description=(
      "Requires the pending access token. "
      "Returns a full session and sets the refresh cookie."
    ),
    parameters=[ORIGIN_PARAMETER],
    responses={200: AuthenticationResponseSerializer, "4XX": ErrorResponseSerializer},
  )
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

  @extend_schema(
    summary="Resend the email verification code",
    description=(
      "Requires the pending access token. "
      "Sends a new code and invalidates the previous one."
    ),
    request=None,
    responses={202: None, "4XX": ErrorResponseSerializer},
  )
  def post(self, request) -> Response:
    self.service_class().send_code(request.user)
    return Response(status=status.HTTP_202_ACCEPTED)


class LoginView(AuthResponseMixin, GenericAPIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  serializer_class = LoginSerializer
  service_class = LoginService
  throttle_scope = "login"

  @extend_schema(
    summary="Log in",
    description=(
      "Accepts a username or email. Unverified accounts receive a pending access token "
      "without a refresh cookie; full sessions receive both."
    ),
    parameters=[ORIGIN_PARAMETER],
    responses={200: AuthenticationResponseSerializer, "4XX": ErrorResponseSerializer},
  )
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

  @extend_schema(
    summary="Refresh the session",
    description=(
      "Requires the HttpOnly refresh_token cookie, sent automatically by the browser. "
      "Rotates the cookie and returns a new access token. Reusing the previous refresh "
      "token within the grace window returns its successor session."
    ),
    parameters=[ORIGIN_PARAMETER],
    request=None,
    responses={200: AuthenticationResponseSerializer, "4XX": ErrorResponseSerializer},
  )
  def post(self, request) -> Response:
    raw_refresh = self.cookie_service_class().read(request)
    session = self.service_class().rotate(raw_refresh)
    return self.auth_response(session, status.HTTP_200_OK)


class LogoutView(APIView):
  authentication_classes = []
  permission_classes = [AllowAny, HasAllowedOrigin]
  cookie_service_class = CookieService
  service_class = TokenService

  @extend_schema(
    summary="Log out",
    description=(
      "Revokes the refresh token from the cookie and clears the cookie. "
      "Succeeds even when the cookie is absent. Discard the access token on the client."
    ),
    parameters=[ORIGIN_PARAMETER],
    request=None,
    responses={200: None, "4XX": ErrorResponseSerializer},
  )
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

  @extend_schema(
    summary="Request a password reset email",
    description="Returns the same response whether or not the email belongs to an account.",
    responses={202: None, "4XX": ErrorResponseSerializer},
  )
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

  @extend_schema(
    summary="Set a new password using a reset link",
    parameters=[ORIGIN_PARAMETER],
    responses={200: AuthenticationResponseSerializer, "4XX": ErrorResponseSerializer},
  )
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

  @extend_schema(
    summary="Validate a password reset link",
    responses={200: None, "4XX": ErrorResponseSerializer},
  )
  def post(self, request) -> Response:
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    self.service_class().validate_token(
      serializer.validated_data["uid"],
      serializer.validated_data["token"],
    )
    return Response(status=status.HTTP_200_OK)
