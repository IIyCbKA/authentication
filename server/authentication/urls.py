from django.urls import path

from .views import (
  EmailConfirmView,
  LoginView,
  LogoutView,
  PasswordResetConfirmView,
  PasswordResetRequestView,
  PasswordResetValidateView,
  RefreshView,
  RegisterView,
  ResendCodeView,
)
from .views import OAuthCallbackView, OAuthStartView

urlpatterns = [
  path("register/", RegisterView.as_view(), name="register"),
  path("email/confirm/", EmailConfirmView.as_view(), name="email_confirm"),
  path("code/resend/", ResendCodeView.as_view(), name="code_resend"),
  path("password/reset/", PasswordResetRequestView.as_view(),
       name="password_reset"),
  path(
    "password/reset/confirm/",
    PasswordResetConfirmView.as_view(),
    name="password_reset_confirm",
  ),
  path(
    "password/reset/validate/",
    PasswordResetValidateView.as_view(),
    name="password_reset_validate",
  ),
  path("login/", LoginView.as_view(), name="login"),
  path("refresh/", RefreshView.as_view(), name="token_refresh"),
  path("logout/", LogoutView.as_view(), name="logout"),
  path(
    "oauth/<str:provider>/start/",
    OAuthStartView.as_view(),
    name="oauth_start",
  ),
  path(
    "oauth/<str:provider>/callback/",
    OAuthCallbackView.as_view(),
    name="oauth_callback",
  ),
]
