from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db import router, transaction

from .identifiers import lock_identifiers
from .models import (
  CustomUser,
  Device,
  EmailVerificationCode,
  SocialAccount,
  UserDevice,
  UsernameChange,
)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
  fieldsets = UserAdmin.fieldsets + (
    (None, {"fields": ["is_email_verified", "auth_version"]}),
  )

  add_fieldsets = UserAdmin.add_fieldsets + (
    (
      None,
      {
        "fields": [
          "is_email_verified",
        ]
      },
    ),
  )

  readonly_fields = ("auth_version",)
  list_display = UserAdmin.list_display + (
    "is_email_verified",
    "auth_version",
  )

  @transaction.atomic
  def save_model(self, request, obj, form, change):
    if change and obj.pk is not None:
      type(obj).objects.select_for_update().get(pk=obj.pk)

    with lock_identifiers(obj.username, obj.email):
      obj.full_clean()
      super().save_model(request, obj, form, change)


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
  search_fields = ("user__username", "user__email")
  readonly_fields = ("secret_code", "code_created_at")
  list_display = ("user", "code_created_at", "is_expired")


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
  search_fields = ("user__username", "user__email", "provider")
  readonly_fields = ("provider", "provider_user_id", "user")
  list_display = ("user", "provider", "provider_user_id")
  list_display_links = None


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
  list_display = ("device_id", "platform", "last_seen", "last_ip", "language")
  search_fields = ("device_id", "user_agent", "platform", "last_ip", "language")
  list_filter = ("platform", "language", "cookies_enabled")
  readonly_fields = ("created_at", "last_seen")
  ordering = ("-last_seen",)


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
  list_display = ("user", "device")
  search_fields = ("user__username", "user__email", "device__device_id")
  list_select_related = ("user", "device")


@admin.register(UsernameChange)
class UsernameChangeAdmin(admin.ModelAdmin):
  list_display = ("user", "old_username", "new_username", "changed_at")
  list_filter = ("changed_at",)
  search_fields = ("user__username", "old_username", "new_username")
  readonly_fields = ("user", "old_username", "new_username", "changed_at")
