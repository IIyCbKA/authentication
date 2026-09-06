from django.http import HttpRequest, HttpResponse
from django.core.exceptions import PermissionDenied
from django.conf import settings

from .utils import get_client_ip

class AdminIPRestrictionMiddleware:
  def __init__(self, response):
    self.response = response

  def __call__(self, request: HttpRequest) -> HttpResponse:
    if request.path.startswith(f'/{settings.ADMIN_URL}'):
      client_ip: str = get_client_ip(request)
      if client_ip not in settings.ADMIN_IPS:
        raise PermissionDenied('Access denied')

    return self.response(request)
