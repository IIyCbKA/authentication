#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[a-zA-Z0-9][a-zA-Z0-9._:-]*$ ]]; then
  echo "Usage: sudo bash scripts/update-certs.sh CERTIFICATE_NAME" >&2
  exit 2
fi

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo to access /etc/letsencrypt." >&2
  exit 1
fi

CERTIFICATE_NAME=$1
PROJECT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
CERTBOT_IMAGE=certbot/certbot:latest
COMPOSE=(docker compose --project-directory "$PROJECT_DIR" --env-file "$PROJECT_DIR/.env" -f "$PROJECT_DIR/docker-compose.yml")

if [[ ! -s "/etc/letsencrypt/live/$CERTIFICATE_NAME/fullchain.pem" ]]; then
  echo "Certificate not found. Obtain it with certbot certonly before using renew." >&2
  exit 1
fi

"${COMPOSE[@]}" config --quiet
if [[ -z "$("${COMPOSE[@]}" ps --status running --quiet nginx)" ]]; then
  echo "nginx is not running. This script only renews an already deployed service." >&2
  exit 1
fi

# Download before stopping nginx so a registry failure causes no downtime
docker pull "$CERTBOT_IMAGE"

restore_nginx() {
  local result=$?
  trap - EXIT
  if ! "${COMPOSE[@]}" start nginx; then
    echo "Could not restart nginx. Check docker compose logs nginx." >&2
    result=1
  fi
  exit "$result"
}

trap restore_nginx EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Standalone needs port 80; PostgreSQL, Redis and application workers stay up
"${COMPOSE[@]}" stop nginx
docker run --rm -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/log/letsencrypt:/var/log/letsencrypt \
  "$CERTBOT_IMAGE" renew \
  --cert-name "$CERTIFICATE_NAME" \
  --standalone \
  --http-01-address 0.0.0.0 \
  --no-random-sleep-on-renew \
  --non-interactive

"${COMPOSE[@]}" run --rm --no-deps nginx nginx -t
