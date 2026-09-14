from django.apps import AppConfig

class AuthenticationConfig(AppConfig):
  name = "authentication"
  verbose_name = "Authentication"

  def ready(self):
    from . import schema
