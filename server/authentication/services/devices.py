from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import Device, UserDevice
from ..tasks import send_new_device_email


class DeviceService:
  def record_login(
    self,
    user,
    payload: dict | None,
    ip: str | None,
    *,
    observed_at=None,
  ) -> None:
    if payload is None:
      return

    observed_at = observed_at or timezone.now()
    data = dict(payload)
    device_id = data.pop("device_id")
    data["last_seen"] = observed_at
    if ip is not None:
      data["last_ip"] = ip

    with transaction.atomic():
      device, _ = Device.objects.update_from_payload(device_id=device_id, payload=data)

      try:
        with transaction.atomic():
          _, link_created = UserDevice.objects.link(user=user, device=device)
      except IntegrityError:
        link_created = False

      if link_created:
        send_new_device_email.delay_on_commit(
          user.email,
          data.get("platform"),
          ip,
          observed_at.isoformat(),
        )
