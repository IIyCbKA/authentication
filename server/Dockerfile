FROM python:3.12-slim-bookworm AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-base.txt requirements-prod.txt ./

RUN python -m pip wheel --wheel-dir /wheels -r requirements-prod.txt


FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
COPY requirements-base.txt requirements-prod.txt ./

RUN python -m pip install --no-index --find-links=/wheels -r requirements-prod.txt \
    && rm -rf /wheels

RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && mkdir -p /app/static /data \
    && chown appuser:appgroup /app/static /data

COPY . .

USER appuser:appgroup

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "-euc", "\
if [ \"$#\" -eq 0 ]; then set -- gunicorn; fi; \
case \"$1\" in \
    gunicorn) \
        shift; \
        python manage.py migrate --noinput; \
        if ! python manage.py shell -c '\
from django.contrib.auth import get_user_model; \
import os, sys; \
User = get_user_model(); \
sys.exit(0 if User.objects.filter(username=os.environ[\"DJANGO_SUPERUSER_USERNAME\"]).exists() else 1)' \
        ; then \
            python manage.py createsuperuser --noinput; \
        fi; \
        python manage.py collectstatic --noinput; \
        exec gunicorn core.wsgi:application \
            --bind 0.0.0.0:8000 \
            --workers \"${GUNICORN_WORKERS:-4}\" \
            --log-level \"${GUNICORN_LOG_LEVEL:-info}\" \
            --access-logfile - \
            --error-logfile - \
            \"$@\" \
        ;; \
    celery_worker) \
        shift; \
        exec celery -A core worker \
            --loglevel \"${CELERY_LOG_LEVEL:-info}\" \
            \"$@\" \
        ;; \
    celery_beat) \
        shift; \
        exec celery -A core beat \
            --loglevel \"${CELERY_LOG_LEVEL:-info}\" \
            --schedule /data/celerybeat-schedule \
            --pidfile= \
            \"$@\" \
        ;; \
    *) \
        exec \"$@\" \
        ;; \
esac", "--"]

CMD ["gunicorn"]
