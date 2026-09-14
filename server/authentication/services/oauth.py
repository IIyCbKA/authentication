from __future__ import annotations

import base64
import hashlib
import secrets
import time
import uuid
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils.crypto import constant_time_compare, salted_hmac
from django.utils.http import url_has_allowed_host_and_scheme, urlencode
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework.request import Request

from accounts.models import SocialAccount
from authentication.exceptions import (
  OAuthConflictError,
  OAuthProviderError,
  OAuthRedirectMismatch,
  OAuthStateError,
  OAuthTokenExchangeError,
  OAuthAuthorizationError,
)

from .providers import ProviderProfile, fetch_provider_profile

User = get_user_model()

FLOW_LOGIN = "login"
FLOW_LINK = "link"
ALLOWED_FLOWS = frozenset({FLOW_LOGIN, FLOW_LINK})
SESSION_STATES_KEY = "oauth_pending_states"
MAX_PENDING_SESSION_STATES = 20


@dataclass(frozen=True, slots=True)
class OAuthCallbackContext:
  provider: str
  code: str
  flow: str
  next_url: str | None
  redirect_uri: str
  code_verifier: str
  initiating_user_id: str | None
  initiating_auth_version: int | None


@dataclass(frozen=True, slots=True)
class OAuthFlowResult:
  flow: str
  user: object
  next_url: str | None
  created: bool = False
  linked: bool = False


class OAuthService:
  @staticmethod
  def ensure_provider(provider: str | None) -> str:
    if not provider or provider not in settings.OAUTH_CLIENTS:
      raise OAuthStateError("Unknown OAuth provider")

    config = settings.OAUTH_CLIENTS[provider]
    if not config.get("client_id") or not config.get("client_secret"):
      raise OAuthProviderError("OAuth provider is not configured")
    return provider

  def build_authorization_url(self, provider: str | None, request: Request) -> str:
    provider = self.ensure_provider(provider)
    state, code_verifier = self._store_state(provider, request)
    config = settings.OAUTH_CLIENTS[provider]
    params = {
      "client_id": config["client_id"],
      "redirect_uri": self._callback_uri(provider, request),
      "response_type": "code",
      "scope": config["scope"],
      "state": state,
      "code_challenge": self._code_challenge(code_verifier),
      "code_challenge_method": "S256",
    }

    if provider == "google":
      params.update({"access_type": "online", "include_granted_scope": "true"})

    return f"{config["authorize_url"]}?{urlencode(params)}"

  def complete(self, provider: str | None, request: Request) -> OAuthFlowResult:
    provider = self.ensure_provider(provider)
    context = self._parse_callback(provider, request)
    token_payload = self._exchange_code(context)
    profile = fetch_provider_profile(provider, token_payload["access_token"])
    return self._finalize(context, profile)

  @staticmethod
  def _state_key(provider: str, state: str) -> str:
    return f"oauth:{provider}:state:{state}"

  @staticmethod
  def _consumed_state_key(provider: str, state: str) -> str:
    return f"oauth:{provider}:consumed:{state}"

  @staticmethod
  def _new_code_verifier() -> str:
    # RFC 7636 permits 43-128 characters from the unreserved URI set.
    return secrets.token_urlsafe(72)[:128]

  @staticmethod
  def _code_challenge(code_verifier: str) -> str:
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")

  @staticmethod
  def _callback_uri(provider: str, request: Request) -> str:
    callback_path = reverse("oauth_callback", kwargs={"provider": provider})
    return request.build_absolute_uri(callback_path)

  @classmethod
  def _store_state(cls, provider: str, request: Request) -> tuple[str, str]:
    flow = request.query_params.get("flow", FLOW_LOGIN)
    if flow not in ALLOWED_FLOWS:
      raise OAuthStateError("Unknown OAuth flow")

    initiating_user_id = None
    initiating_auth_version = None
    if flow == FLOW_LINK:
      user = getattr(request, "user", None)
      if user is None or not user.is_authenticated:
        raise NotAuthenticated("Authentication is required to link an account")
      initiating_user_id = str(user.pk)
      initiating_auth_version = user.auth_version

    next_url = cls._allowed_next_url(request.query_params.get("next"))
    redirect_uri = cls._callback_uri(provider, request)
    timeout = settings.TIMEOUTS["OAUTH_STATE"]

    # add() makes the already-improbable state collision impossible to
    # overwrite. The loop is bounded so a broken cache fails clearly.
    for _ in range(3):
      state = secrets.token_urlsafe(48)
      code_verifier = cls._new_code_verifier()
      session_binding = secrets.token_urlsafe(32)
      payload = {
        "issued_at": int(time.time()),
        "redirect_uri": redirect_uri,
        "flow": flow,
        "next_url": next_url,
        "code_verifier": code_verifier,
        "initiating_user_id": initiating_user_id,
        "initiating_auth_version": initiating_auth_version,
        "session_binding": cls._binding_fingerprint(session_binding),
      }
      if cache.add(cls._state_key(provider, state), payload, timeout=timeout):
        cls._remember_session_state(
          request,
          provider,
          state,
          session_binding,
        )
        return state, code_verifier

    raise OAuthStateError("Could not initialize OAuth state")

  @staticmethod
  def _binding_fingerprint(binding: str) -> str:
    return salted_hmac(
      key_salt="authentication.oauth.session-binding",
      value=binding,
    ).hexdigest()

  @classmethod
  def _remember_session_state(
    cls,
    request: Request,
    provider: str,
    state: str,
    binding: str,
  ) -> None:
    now = int(time.time())
    cutoff = now - settings.TIMEOUTS["OAUTH_STATE"]
    pending = dict(request.session.get(SESSION_STATES_KEY, {}))
    pending = {
      key: value
      for key, value in pending.items()
      if isinstance(value, dict) and value.get("issued_at", 0) >= cutoff
    }
    pending[f"{provider}:{state}"] = {
      "binding": binding,
      "issued_at": now,
    }
    if len(pending) > MAX_PENDING_SESSION_STATES:
      ordered = sorted(
        pending.items(),
        key=lambda item: item[1].get("issued_at", 0),
        reverse=True,
      )
      pending = dict(ordered[:MAX_PENDING_SESSION_STATES])
    request.session[SESSION_STATES_KEY] = pending
    request.session.modified = True

  @staticmethod
  def _pop_session_binding(
    request: Request,
    provider: str,
    state: str,
  ) -> str:
    pending = dict(request.session.get(SESSION_STATES_KEY, {}))
    entry = pending.pop(f"{provider}:{state}", None)
    if pending:
      request.session[SESSION_STATES_KEY] = pending
    else:
      request.session.pop(SESSION_STATES_KEY, None)
    request.session.modified = True

    binding = entry.get("binding") if isinstance(entry, dict) else None
    if not isinstance(binding, str) or not binding:
      raise OAuthStateError("OAuth state does not belong to this session")
    return binding

  @classmethod
  def _consume_state(cls, provider: str, state: str) -> dict:
    timeout = settings.TIMEOUTS["OAUTH_STATE"]

    # cache.add() is atomic for both supported backends. Whichever callback
    # creates this marker first is the only callback allowed to consume the
    # state, even if two requests read the state at nearly the same time.
    claimed = cache.add(
      cls._consumed_state_key(provider, state),
      True,
      timeout=timeout,
    )
    if not claimed:
      raise OAuthStateError("OAuth state was already used")

    key = cls._state_key(provider, state)
    payload = cache.get(key)
    cache.delete(key)
    if not isinstance(payload, dict):
      raise OAuthStateError("OAuth state not found or expired")
    return payload

  @classmethod
  def _parse_callback(
    cls,
    provider: str,
    request: Request,
  ) -> OAuthCallbackContext:
    state = request.query_params.get("state")
    if not state:
      raise OAuthStateError("Missing OAuth state")

    session_binding = cls._pop_session_binding(request, provider, state)
    state_data = cls._consume_state(provider, state)
    expected_binding = state_data.get("session_binding")
    if not expected_binding or not constant_time_compare(
      cls._binding_fingerprint(session_binding),
      expected_binding,
    ):
      raise OAuthStateError("OAuth state does not belong to this session")

    expected_redirect = state_data.get("redirect_uri")
    redirect_uri = cls._callback_uri(provider, request)
    if not expected_redirect or expected_redirect != redirect_uri:
      raise OAuthRedirectMismatch("OAuth redirect URI does not match")

    if request.query_params.get("error"):
      raise OAuthAuthorizationError(
        next_url=cls._allowed_next_url(state_data.get("next_url")),
      )

    code = request.query_params.get("code")
    code_verifier = state_data.get("code_verifier")
    flow = state_data.get("flow")
    if not code:
      raise OAuthStateError("Missing authorization code")
    if not code_verifier:
      raise OAuthStateError("PKCE verifier is missing")
    if flow not in ALLOWED_FLOWS:
      raise OAuthStateError("Unknown OAuth flow")

    initiating_user_id = state_data.get("initiating_user_id")
    initiating_auth_version = state_data.get("initiating_auth_version")
    if flow == FLOW_LINK and (
      not initiating_user_id or not isinstance(initiating_auth_version, int)
    ):
      raise OAuthStateError("Link flow has no initiating authorization")

    return OAuthCallbackContext(
      provider=provider,
      code=code,
      flow=flow,
      next_url=state_data.get("next_url"),
      redirect_uri=redirect_uri,
      code_verifier=code_verifier,
      initiating_user_id=initiating_user_id,
      initiating_auth_version=initiating_auth_version,
    )

  @staticmethod
  def _token_request_payload(context: OAuthCallbackContext) -> dict:
    config = settings.OAUTH_CLIENTS[context.provider]
    payload = {
      "code": context.code,
      "redirect_uri": context.redirect_uri,
      "code_verifier": context.code_verifier,
    }

    if context.provider in {"x", "google", "yandex"}:
      payload["grant_type"] = "authorization_code"
    if context.provider != "x":
      payload.update(
        {
          "client_id": config["client_id"],
          "client_secret": config["client_secret"],
        }
      )
    return payload

  @staticmethod
  def _token_request_headers(provider: str) -> dict[str, str]:
    headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    }
    if provider == "x":
      config = settings.OAUTH_CLIENTS[provider]
      credentials = f"{config["client_id"]}:{config["client_secret"]}"
      encoded = base64.b64encode(credentials.encode("ascii")).decode("ascii")
      headers["Authorization"] = f"Basic {encoded}"
    return headers

  @classmethod
  def _exchange_code(cls, context: OAuthCallbackContext) -> dict:
    config = settings.OAUTH_CLIENTS[context.provider]
    try:
      response = requests.post(
        config["access_token_url"],
        data=cls._token_request_payload(context),
        headers=cls._token_request_headers(context.provider),
        timeout=settings.OAUTH_HTTP_TIMEOUT_SECONDS,
      )
      response.raise_for_status()
      payload = response.json()
    except (requests.RequestException, ValueError) as exc:
      raise OAuthTokenExchangeError() from exc

    access_token = payload.get("access_token") if isinstance(payload, dict) else None
    if not isinstance(access_token, str) or not access_token:
      raise OAuthTokenExchangeError("Provider returned no access token")
    return payload

  @classmethod
  def _finalize(
    cls,
    context: OAuthCallbackContext,
    profile: ProviderProfile,
  ) -> OAuthFlowResult:
    if context.flow == FLOW_LINK:
      user, linked = cls._link_identity(
        context.initiating_user_id,
        context.initiating_auth_version,
        profile,
      )
      return OAuthFlowResult(
        flow=FLOW_LINK,
        user=user,
        next_url=context.next_url,
        linked=linked,
      )

    user, created = cls._login_or_register(profile)
    return OAuthFlowResult(
      flow=FLOW_LOGIN,
      user=user,
      next_url=context.next_url,
      created=created,
    )

  @staticmethod
  def _find_user(profile: ProviderProfile):
    return SocialAccount.objects.find_user(
      profile.provider,
      profile.provider_user_id,
    )

  @classmethod
  def _login_or_register(cls, profile: ProviderProfile) -> tuple[object, bool]:
    existing_user = cls._find_user(profile)
    if existing_user is not None:
      if not existing_user.is_active:
        raise AuthenticationFailed("User account is disabled")
      return existing_user, False

    try:
      with transaction.atomic():
        user = User.objects.create_user(
          username=(f"{settings.DEFAULT_USERNAME_PREFIX}_{uuid.uuid4().hex}"),
          password=None,
        )
        SocialAccount.objects.create(
          provider=profile.provider,
          provider_user_id=profile.provider_user_id,
          user=user,
        )
      return user, True
    except IntegrityError as exc:
      existing_user = cls._find_user(profile)
      if existing_user is not None:
        if not existing_user.is_active:
          raise AuthenticationFailed("User account is disabled") from exc
        return existing_user, False
      raise OAuthConflictError("Could not create social account") from exc

  @staticmethod
  def _link_identity(
    initiating_user_id: str | None,
    initiating_auth_version: int | None,
    profile: ProviderProfile,
  ) -> tuple[object, bool]:
    with transaction.atomic():
      try:
        user = User.objects.select_for_update().get(
          pk=initiating_user_id,
          is_active=True,
        )
      except User.DoesNotExist as exc:
        raise NotAuthenticated("Initiating user is no longer available") from exc

      if user.auth_version != initiating_auth_version:
        raise OAuthStateError("OAuth link authorization is no longer valid")

      social_account, created = SocialAccount.objects.get_or_create(
        provider=profile.provider,
        provider_user_id=profile.provider_user_id,
        defaults={"user": user},
      )
      if social_account.user_id != user.pk:
        raise OAuthConflictError()
      return user, created

  @staticmethod
  def _allowed_next_url(next_url: str | None) -> str | None:
    if not next_url:
      return None

    candidate = next_url.strip()
    if candidate.startswith("/") and not candidate.startswith("//"):
      candidate = urljoin(f"{settings.CLIENT_BASE_URL.rstrip("/")}/", candidate)

    allowed_origins = {
      origin.rstrip("/").lower()
      for origin in settings.OAUTH_ALLOWED_NEXT_ORIGINS
      if origin
    }
    allowed_hosts = {urlsplit(origin).netloc for origin in allowed_origins}
    if not url_has_allowed_host_and_scheme(candidate, allowed_hosts=allowed_hosts):
      raise OAuthRedirectMismatch("OAuth next URL is not allowed")

    try:
      parsed = urlsplit(candidate)
      origin = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"
      has_credentials = parsed.username is not None or parsed.password is not None
    except ValueError as exc:
      raise OAuthRedirectMismatch("OAuth next URL is invalid") from exc

    if (
      parsed.scheme.lower() not in {"http", "https"}
      or has_credentials
      or origin.rstrip("/") not in allowed_origins
    ):
      raise OAuthRedirectMismatch("OAuth next URL is not allowed")
    return candidate
