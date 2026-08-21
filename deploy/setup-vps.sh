#!/bin/sh
# Usage: setup-vps.sh <domain>
#
# VPS 一次性 bootstrap (lab-management-system-vue):
# - 装 docker.io (apt)
# - 建 deploy 用户 (/home/deploy, sudo NOPASSWD docker)
# - mkdir /home/deploy/lab-management-system-vue/
# - 渲染 nginx-vps.conf.example → /etc/nginx/sites-enabled/lab-management-system-vue.conf
# - nginx -t && systemctl reload nginx
#
# 复用前需:
# - 把 <domain>.crt / <domain>.key 放到 /etc/nginx/ssl/
# - 把 DOCKER_USERNAME / DOCKER_PASSWORD 加到 GitHub Repo secrets
# - 母机 .ssh/known_hosts 先 ssh 一次 VPS (TOFU)

set -eu

DOMAIN="${1:-lab-vue.xiangru.uk}"

if [ "$(id -u)" -ne 0 ]; then
  echo "must run as root" >&2
  exit 2
fi

BASE="/home/deploy/lab-management-system-vue"
NGINX_SITE="/etc/nginx/sites-enabled/lab-management-system-vue.conf"
TEMPLATE="$(dirname "$0")/nginx-vps.conf.example"

echo "→ apt install docker.io"
apt-get update -qq
apt-get install -y docker.io

echo "→ create deploy user"
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
mkdir -p "$BASE"
chown -R deploy:deploy "$BASE"
echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker" >/etc/sudoers.d/deploy-docker

echo "→ render nginx vhost"
sed "s/<domain>/${DOMAIN}/g" "$TEMPLATE" >"$NGINX_SITE"
nginx -t
systemctl reload nginx

echo "→ setup done"
echo "  deploy dir: $BASE"
echo "  domain:     $DOMAIN"
echo "  next:       ci.yml tag push will pull + run container"