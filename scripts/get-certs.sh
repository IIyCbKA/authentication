#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: sudo bash scripts/get-certs.sh DOMAIN_OR_IP" >&2
  exit 2
fi

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

TARGET=$1
CERTBOT_IMAGE=certbot/certbot:latest

docker pull "$CERTBOT_IMAGE"

ARGS=(
  certonly
  --standalone
  --non-interactive
  --agree-tos
  --register-unsafely-without-email
  --cert-name "$TARGET"
)

if [[ "$TARGET" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || "$TARGET" == *:* ]]; then
  ARGS+=(
    --preferred-profile shortlived
    --ip-address "$TARGET"
  )
else
  ARGS+=(
    -d "$TARGET"
  )
fi

docker run --rm \
  -p 80:80 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -v /var/log/letsencrypt:/var/log/letsencrypt \
  "$CERTBOT_IMAGE" \
  "${ARGS[@]}"

echo "Certificate created:"
echo "/etc/letsencrypt/live/$TARGET/fullchain.pem"
echo "/etc/letsencrypt/live/$TARGET/privkey.pem"
