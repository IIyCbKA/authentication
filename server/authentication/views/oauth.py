from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..serializers import UserReadSerializer
from ..exceptions import OAuthStateError
from ..permissions import HasAllowedOrigin, IsVerifiedOrEmailLess
from ..services.oauth import FLOW_LINK, OAuthService
from ..services import CookieService, TokenService


class OAuthStartView(APIView):
  service_class = OAuthService
  throttle_scope = "oauth_start"

  def get_permissions(self):
    if self.request.method == "POST":
      return [IsVerifiedOrEmailLess(), HasAllowedOrigin()]
    return [AllowAny()]

  def get(self, request: Request, provider: str | None = None) -> Response:
    if request.query_params.get("flow", "login") == FLOW_LINK:
      raise OAuthStateError("OAuth link flow must be initialized with POST")

    authorize_url = self.service_class().build_authorization_url(provider, request)
    return Response(status=status.HTTP_302_FOUND, headers={"Location": authorize_url})

  def post(self, request: Request, provider: str | None = None) -> Response:
    if request.query_params.get("flow") != FLOW_LINK:
      raise OAuthStateError("POST OAuth start is reserved for link flow")

    authorize_url = self.service_class().build_authorization_url(provider, request)
    return Response(
      data={"authorization_url": authorize_url}, status=status.HTTP_200_OK
    )


class OAuthCallbackView(APIView):
  authentication_classes = []
  permission_classes = [AllowAny]
  service_class = OAuthService
  throttle_scope = "oauth_callback"

  def get(self, request: Request, provider: str | None = None) -> Response:
    result = self.service_class().complete(provider, request)

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
