#!/usr/bin/env bash
# Instalación inicial del servidor Linux para deploy con Docker — Ubuntu/Debian.
# Ejecutar en el servidor: bash deploy/setup-server.sh
set -euo pipefail

echo "==> Actualizando paquetes del sistema"
sudo apt update && sudo apt upgrade -y

echo "==> Instalando utilidades base"
sudo apt install -y ca-certificates curl gnupg git make nginx certbot python3-certbot-nginx

echo "==> Instalando Docker Engine + Compose plugin"
# Repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Instalando Node.js 20 (necesario en el host para hacer build del frontend)"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "==> Habilitando Docker al inicio"
sudo systemctl enable --now docker

echo "==> Agregando usuario actual al grupo docker (para correr docker sin sudo)"
sudo usermod -aG docker "$USER"

echo ""
echo "✅ Instalación base completada. Versiones:"
node --version
npm --version
docker --version
docker compose version
nginx -v

echo ""
echo "─────────────────────────────────────────────────────────────"
echo "  IMPORTANTE: Cierra y vuelve a abrir tu sesión SSH para"
echo "  que el cambio de grupo 'docker' tenga efecto."
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Próximos pasos:"
echo "  1. git clone <repo> /opt/webexams && cd /opt/webexams"
echo "  2. cp .env.example .env && nano .env   (pon tus credenciales reales)"
echo "  3. make deploy                          (build + frontend + up)"
echo "  4. Configura Nginx del host con SSL:"
echo "       sudo cp deploy/nginx-host.conf.example /etc/nginx/sites-available/webexams"
echo "       sudo nano /etc/nginx/sites-available/webexams   (reemplaza tu-dominio.com)"
echo "       sudo ln -sf /etc/nginx/sites-available/webexams /etc/nginx/sites-enabled/"
echo "       sudo rm -f /etc/nginx/sites-enabled/default"
echo "       sudo nginx -t && sudo systemctl reload nginx"
echo "       sudo certbot --nginx -d tu-dominio.com"
