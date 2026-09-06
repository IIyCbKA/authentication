from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True, slots=True)
class IssuedTokens:
  access_token: str
  refresh_token: str | None
  is_authenticated: bool


@dataclass(frozen=True, slots=True)
class AuthSession:
  user: Any
  tokens: IssuedTokens
