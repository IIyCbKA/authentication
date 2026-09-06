from dataclasses import dataclass
from typing import Callable

import requests
from django.conf import settings

from accounts.models import Provider
from ..exceptions import OAuthProviderError


@dataclass(frozen=True, slots=True)
class ProviderProfile:
    provider: str
    provider_user_id: str
    name: str | None = None
    preferred_username: str | None = None


def _provider_config(provider: str) -> dict:
    try:
        return settings.OAUTH_CLIENTS[provider]
    except KeyError as exc:
        raise OAuthProviderError("Provider is not configured") from exc


def _api_url(provider: str, path: str) -> str:
    base_url = _provider_config(provider)["api_base_url"].rstrip("/")
    return f"{base_url}/{path.lstrip('/')}"


def _request_json(url: str, *, headers: dict[str, str]) -> dict:
    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.OAUTH_HTTP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise OAuthProviderError("Provider profile request failed") from exc

    if not isinstance(payload, dict):
        raise OAuthProviderError("Provider returned an invalid profile")
    return payload


def _profile(
    provider: str,
    provider_user_id,
    *,
    name: str | None,
    preferred_username: str | None,
) -> ProviderProfile:
    if provider_user_id is None or str(provider_user_id).strip() == "":
        raise OAuthProviderError("Provider profile has no stable identifier")

    return ProviderProfile(
        provider=provider,
        provider_user_id=str(provider_user_id),
        name=name,
        preferred_username=preferred_username,
    )


def fetch_github_profile(access_token: str) -> ProviderProfile:
    payload = _request_json(
        _api_url(Provider.GITHUB, "user"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    return _profile(
        Provider.GITHUB,
        payload.get("id"),
        name=payload.get("name") or payload.get("login"),
        preferred_username=payload.get("login"),
    )


def fetch_x_profile(access_token: str) -> ProviderProfile:
    payload = _request_json(
        _api_url(Provider.X, "users/me?user.fields=id,name,username"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": settings.OAUTH_USER_AGENT,
        },
    )
    user = payload.get("data") or {}
    if not isinstance(user, dict):
        raise OAuthProviderError("Provider returned an invalid profile")
    return _profile(
        Provider.X,
        user.get("id"),
        name=user.get("name"),
        preferred_username=user.get("username"),
    )


def fetch_google_profile(access_token: str) -> ProviderProfile:
    payload = _request_json(
        _api_url(Provider.GOOGLE, "v1/userinfo"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
    )
    return _profile(
        Provider.GOOGLE,
        payload.get("sub"),
        name=payload.get("name") or payload.get("email"),
        preferred_username=payload.get("email"),
    )


def fetch_yandex_profile(access_token: str) -> ProviderProfile:
    payload = _request_json(
        _api_url(Provider.YANDEX, "info?format=json"),
        headers={
            "Authorization": f"OAuth {access_token}",
            "Accept": "application/json",
        },
    )
    return _profile(
        Provider.YANDEX,
        payload.get("id") or payload.get("uid"),
        name=(
            payload.get("real_name")
            or payload.get("display_name")
            or payload.get("login")
        ),
        preferred_username=payload.get("login") or payload.get("email"),
    )


ProviderHandler = Callable[[str], ProviderProfile]

PROVIDER_HANDLERS: dict[str, ProviderHandler] = {
    Provider.GITHUB: fetch_github_profile,
    Provider.X: fetch_x_profile,
    Provider.GOOGLE: fetch_google_profile,
    Provider.YANDEX: fetch_yandex_profile,
}


def fetch_provider_profile(provider: str, access_token: str) -> ProviderProfile:
    try:
        handler = PROVIDER_HANDLERS[provider]
    except KeyError as exc:
        raise OAuthProviderError("Provider handler is not implemented") from exc
    return handler(access_token)
