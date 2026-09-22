from django.urls import path

from .views import CurrentAccountView, UpdateUsernameView, GetAllUsersView

urlpatterns = [
  path("me/", CurrentAccountView.as_view(), name="current_account"),
  path("username/update/", UpdateUsernameView.as_view(), name="update_username"),
  path("users/all/", GetAllUsersView.as_view(), name="get_all_users"),
]
