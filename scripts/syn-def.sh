#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/syn-def.sh EXTERNAL_INTERFACE (for example, eth0)" >&2
  exit 2
fi

EXTERNAL_INTERFACE=$1
for tool in ip sysctl iptables sudo; do
  if ! command -v "$tool" >/dev/null; then
    echo "Missing $tool. This script requires Linux with Docker's iptables backend." >&2
    exit 1
  fi
done

ip link show dev "$EXTERNAL_INTERFACE" >/dev/null
if ! sudo iptables -w -nL DOCKER-USER >/dev/null 2>&1; then
  echo "DOCKER-USER is missing. Start Docker with its iptables backend first." >&2
  exit 1
fi

sudo sysctl -w net.ipv4.tcp_syncookies=1
printf '%s\n' 'net.ipv4.tcp_syncookies = 1' | sudo tee /etc/sysctl.d/99-syncookies.conf >/dev/null

# Only rebuild our own chain; never flush INPUT or Docker's chains.
sudo iptables -w -nL syn_flood >/dev/null 2>&1 || sudo iptables -w -N syn_flood
sudo iptables -w -F syn_flood
sudo iptables -w -A syn_flood -p tcp --syn \
  -m hashlimit \
    --hashlimit-name synflood \
    --hashlimit-mode srcip \
    --hashlimit-upto 20/second \
    --hashlimit-burst 40 \
  -j RETURN
sudo iptables -w -A syn_flood -j DROP

# Remove the legacy all-ports rule, which also rate-limited SSH.
while sudo iptables -w -C INPUT -p tcp --syn -j syn_flood 2>/dev/null; do
  sudo iptables -w -D INPUT -p tcp --syn -j syn_flood
done

# INPUT covers host listeners (including standalone Certbot).
# Published Docker ports are forwarded through DOCKER-USER instead of INPUT.
for chain in INPUT DOCKER-USER; do
  rule=(-i "$EXTERNAL_INTERFACE" -p tcp --syn -m multiport --dports 80,443 -j syn_flood)
  sudo iptables -w -C "$chain" "${rule[@]}" 2>/dev/null || \
    sudo iptables -w -I "$chain" 1 "${rule[@]}"
done

echo "IPv4 SYN limiting enabled for ports 80/443 on $EXTERNAL_INTERFACE."
echo "Reapply after reboot or firewall reset; Docker's dynamic rules are not persisted."
