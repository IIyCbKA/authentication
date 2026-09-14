from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.schema import ErrorResponseSerializer, ORIGIN_PARAMETER
from ..schema import OAUTH_LOCATION_HEADER, OAUTH_NEXT_PARAMETER, OAUTH_PROVIDER_PARAMETER
from ..serializers import (
  AuthenticationResponseSerializer,
  OAuthAuthorizationResponseSerializer,
  UserReadSerializer,
)
from ..exceptions import OAuthStateError, OAuthAuthorizationError
from ..permissions import HasAllowedOrigin, IsVerifiedOrEmailLess
from ..services.oauth import FLOW_LINK, OAuthService
from ..services import CookieService, TokenService


@extend_schema(tags=["oauth"], parameters=[OAUTH_PROVIDER_PARAMETER])
class OAuthStartView(APIView):
  service_class = OAuthService
  throttle_scope = "oauth_start"

  def get_permissions(self):
    if self.request.method == "POST":
      return [IsVerifiedOrEmailLess(), HasAllowedOrigin()]
    return [AllowAny()]

  @extend_schema(
    summary="Start OAuth login",
    description=(
      "Open this URL in the browser, not via an AJAX request. "
      "Redirects to the provider and stores OAuth state in a session cookie."
    ),
    auth=[],
    parameters=[
      OAUTH_NEXT_PARAMETER,
      OpenApiParameter("flow", str, enum=["login"], default="login"),
      OAUTH_LOCATION_HEADER,
    ],
    responses={302: None, "4XX": ErrorResponseSerializer, 502: ErrorResponseSerializer},
  )
  def get(self, request: Request, provider: str | None = None) -> Response:
    if request.query_params.get("flow", "login") == FLOW_LINK:
      raise OAuthStateError("OAuth link flow must be initialized with POST")

    authorize_url = self.service_class().build_authorization_url(provider, request)
    return Response(status=status.HTTP_302_FOUND, headers={"Location": authorize_url})

  @extend_schema(
    summary="Start linking an OAuth identity",
    description=(
      "Requires a full session. Navigate the browser to the returned authorizationUrl; "
      "the callback must retain the session cookie."
    ),
    parameters=[
      ORIGIN_PARAMETER,
      OAUTH_NEXT_PARAMETER,
      OpenApiParameter("flow", str, enum=["link"], required=True),
    ],
    request=None,
    responses={
      200: OAuthAuthorizationResponseSerializer,
      "4XX": ErrorResponseSerializer,
      502: ErrorResponseSerializer,
    },
  )
  def post(self, request: Request, provider: str | None = None) -> Response:
    if request.query_params.get("flow") != FLOW_LINK:
      raise OAuthStateError("POST OAuth start is reserved for link flow")

    authorize_url = self.service_class().build_authorization_url(provider, request)
    return Response(
      data={"authorization_url": authorize_url}, status=status.HTTP_200_OK
    )


@extend_schema(tags=["oauth"], parameters=[OAUTH_PROVIDER_PARAMETER])
class OAuthCallbackView(APIView):
  authentication_classes = []
  permission_classes = [AllowAny]
  service_class = OAuthService
  throttle_scope = "oauth_callback"

  @extend_schema(
    summary="Complete OAuth login or linking",
    description=(
      "Called by the provider in the same browser session. Requires state and either "
      "code or error. Successful login sets a refresh cookie; when next was supplied "
      "at start, redirects there. Errors currently return JSON."
    ),
    parameters=[
      OpenApiParameter("state", str, required=True),
      OpenApiParameter("code", str, description="Authorization code on success."),
      OpenApiParameter(
        "error", str, description="Provider error, including access_denied on cancellation.",
      ),
      OAUTH_LOCATION_HEADER,
    ],
    responses={
      200: OpenApiResponse(
        AuthenticationResponseSerializer, description="Login without next.",
      ),
      204: OpenApiResponse(description="Linking without next."),
      303: OpenApiResponse(
        description="Redirect to the validated next URL, without a response body.",
      ),
      "4XX": ErrorResponseSerializer,
      502: ErrorResponseSerializer,
    },
  )
  def get(self, request: Request, provider: str | None = None) -> Response:
    try:
      result = self.service_class().complete(provider, request)
    except OAuthAuthorizationError as exc:
      target = exc.next_url or settings.CLIENT_BASE_URL
      return Response(
        status=status.HTTP_303_SEE_OTHER,
        headers={"Location": target},
      )

    if result.flow == FLOW_LINK:
      response = Response(status=status.HTTP_204_NO_CONTENT)
    else:
      token_service = TokenService()
      cookie_service = CookieService()
      session = token_service.replace_session(
        result.user.pk,
        current_refresh=cookie_service.read(request),
      )

      response = Response(
        data={
          "access_token": session.tokens.access_token,
          "user": UserReadSerializer(session.user).data,
          "is_authenticated": session.tokens.is_authenticated,
        },
        status=status.HTTP_200_OK,
      )
      cookie_service.apply(response, session.tokens.refresh_token)

    if result.next_url:
      response.status_code = status.HTTP_303_SEE_OTHER
      response["Location"] = result.next_url
      response.data = None

    return response
