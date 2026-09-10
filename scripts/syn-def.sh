#!/bin/bash

set -e

sudo sysctl -w net.ipv4.tcp_syncookies=1
echo "net.ipv4.tcp_syncookies = 1" | sudo tee /etc/sysctl.d/99-syncookies.conf
sudo sysctl --system

sudo iptables -C INPUT -j syn_flood 2>/dev/null || \
  sudo iptables -N syn_flood

sudo iptables -F syn_flood
sudo iptables -A syn_flood -p tcp --syn \
  -m hashlimit \
    --hashlimit-name synflood \
    --hashlimit-mode srcip \
    --hashlimit-upto 20/second \
    --hashlimit-burst 40 \
  -j RETURN
sudo iptables -A syn_flood -j DROP

sudo iptables -C INPUT -p tcp --syn -j syn_flood 2>/dev/null || \
  sudo iptables -I INPUT -p tcp --syn -j syn_flood

sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
sudo netfilter-persistent save

echo "FINISH"
