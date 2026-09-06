from datetime import datetime

class UsernameChangeError(Exception):
  """Base exception for username profile invariants."""


class UsernameAlreadyTakenError(UsernameChangeError):
  """Raised when another user already owns the requested username."""


class UsernameInvalidError(UsernameChangeError):
  def __init__(self, detail: str):
    self.detail = detail
    super().__init__(detail)


class UsernameChangeLimitExceeded(UsernameChangeError):
  def __init__(self, next_allowed_at: datetime):
    self.next_allowed_at = next_allowed_at
    super().__init__(f'Username change limit reached until {next_allowed_at!s}')
