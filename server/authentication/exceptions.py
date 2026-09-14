from rest_framework import status
from rest_framework.exceptions import APIException


class AuthenticationServiceError(APIException):
  status_code = status.HTTP_400_BAD_REQUEST


class InvalidCredentialsError(AuthenticationServiceError):
  default_detail = "Invalid identifier or password"
  default_code = "invalid_credentials"


class InvalidRefreshTokenError(AuthenticationServiceError):
  status_code = status.HTTP_401_UNAUTHORIZED
  default_detail = "Invalid or expired refresh token"
  default_code = "invalid_refresh_token"


class InactiveAccountError(InvalidCredentialsError):
  """Deliberately indistinguishable from invalid credentials."""


class EmailAlreadyVerifiedError(AuthenticationServiceError):
  status_code = status.HTTP_409_CONFLICT
  default_detail = "Email address already verified"
  default_code = "email_already_verified"


class NoVerificationCodeError(AuthenticationServiceError):
  default_detail = "No verification code available"
  default_code = "verification_code_missing"


class VerificationCodeExpiredError(AuthenticationServiceError):
  default_detail = "Verification code expired"
  default_code = "verification_code_expired"


class VerificationCodeIncorrectError(AuthenticationServiceError):
  default_detail = "Verification code incorrect"
  default_code = "verification_code_incorrect"


class InvalidPasswordResetTokenError(AuthenticationServiceError):
  default_detail = "Password reset link is invalid or has expired"
  default_code = "invalid_password_reset_token"


class UsernameAlreadyTakenError(AuthenticationServiceError):
  default_detail = "Username already taken"
  default_code = "username_taken"


class EmailAlreadyTakenError(AuthenticationServiceError):
  default_detail = "Email already taken"
  default_code = "email_taken"


class RegistrationConflictError(AuthenticationServiceError):
  default_detail = "Unable to create account with the supplied credentials"
  default_code = "registration_conflict"


class InvalidEmailError(AuthenticationServiceError):
  default_detail = "Email address is invalid or cannot receive mail"
  default_code = "invalid_email"


class InvalidPasswordError(AuthenticationServiceError):
  default_detail = "Password does not satisfy the password policy"
  default_code = "invalid_password"

  def __init__(self, messages: list[str] | tuple[str, ...] | None = None):
    detail = "; ".join(messages) if messages else self.default_detail
    super().__init__(detail=detail, code=self.default_code)


class OAuthConflictError(AuthenticationServiceError):
  status_code = status.HTTP_409_CONFLICT
  default_detail = "Social account already linked to another user"
  default_code = "oauth_identity_conflict"


class OAuthProviderError(AuthenticationServiceError):
  status_code = status.HTTP_502_BAD_GATEWAY
  default_detail = "OAuth provider request failed"
  default_code = "oauth_provider_error"


class OAuthRedirectMismatch(AuthenticationServiceError):
  default_detail = "OAuth redirect URI is not allowed"
  default_code = "oauth_redirect_mismatch"


class OAuthStateError(AuthenticationServiceError):
  default_detail = "Invalid or expired OAuth state"
  default_code = "oauth_state_invalid"


class OAuthTokenExchangeError(AuthenticationServiceError):
  status_code = status.HTTP_502_BAD_GATEWAY
  default_detail = "Failed to exchange OAuth authorization code"
  default_code = "oauth_token_exchange_failed"


class OAuthAuthorizationError(AuthenticationServiceError):
  default_detail = "OAuth authorization was not completed"
  default_code = "oauth_authorization_failed"

  def __init__(self, next_url: str | None):
    super().__init__()
    self.next_url = next_url
