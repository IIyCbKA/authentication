from contextlib import contextmanager
from hashlib import blake2b
from typing import Iterator

from django.db import connection


def _lock_key(value: str) -> int:
  digest = blake2b(value.encode("utf-8"), digest_size=8, person=b"auth-id").digest()
  return int.from_bytes(digest, byteorder="big", signed=True)


@contextmanager
def lock_identifiers(*values: str | None) -> Iterator[None]:
  """Serialize cross-column identifier reservations on PostgreSQL.

  Username and email have separate database indexes, so a normal unique
  constraint cannot prevent one transaction's username from becoming a
  second transaction's email. Transaction-scoped advisory locks close that
  gap for all account creation and username-change use cases.
  """

  if not connection.in_atomic_block:
    raise RuntimeError("Identifier locks require an atomic transaction")

  identifiers = tuple(value for value in values if value)
  if connection.vendor == "postgresql" and identifiers:
    with connection.cursor() as cursor:
      expressions = ", ".join("UPPER(%s)" for _ in identifiers)
      cursor.execute(f"SELECT {expressions}", identifiers)
      normalized = cursor.fetchone()
      keys = sorted({_lock_key(value) for value in normalized})
      for key in keys:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [key])

    yield
