from celery import shared_task

from .models import UsernameChange


@shared_task
def purge_old_username_changes() -> int:
  deleted, _ = UsernameChange.objects.old().delete()
  return deleted
