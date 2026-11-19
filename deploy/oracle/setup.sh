#!/usr/bin/env bash
# One-time setup for an Ubuntu VM (Oracle Cloud Always Free). Run as the default user:  bash setup.sh
set -euo pipefail

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# Oracle's Ubuntu images block 80/443 in the VM firewall as well as in the cloud console
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt-get install -y iptables-persistent >/dev/null
sudo netfilter-persistent save

echo "Done. Log out and back in once so the docker group applies."
echo "Also open ports 80 and 443 in the Oracle console: Networking > VCN > Security List > Add Ingress Rules."
