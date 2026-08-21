#!/bin/sh
# Usage: lab-management-system-vue.sh <DOCKER_USERNAME> <DOCKER_PASSWORD> [VERSION]
#
# 由 .github/workflows/ci.yml deploy job 远程调用:
#   ssh deploy@vps -- cd /home/deploy/lab-management-system-vue
#                    && sh lab-management-system-vue.sh $DOCKER_USERNAME $DOCKER_PASSWORD $VERSION
#
# Vite SPA (nginx:alpine 静态托管):无 runtime env,无数据库,无 health-wait 循环。
# 容器内监听 :80;VPS nginx 反代到 127.0.0.1:8010 (lab-vue.xiangru.uk)。

set -eu

USERNAME="${1:-}"
PASSWORD="${2:-}"
VERSION="${3:-latest}"
IMAGE="${USERNAME}/lab-management-system-vue:${VERSION}"
BASE="/home/deploy/lab-management-system-vue"
CONTAINER_NAME="lab-management-system-vue"
HOST_PORT=8010

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <DOCKER_USERNAME> <DOCKER_PASSWORD> [VERSION]" >&2
  exit 2
fi

echo "→ image: $IMAGE"
printf '%s' "$PASSWORD" | docker login -u "$USERNAME" --password-stdin
docker pull "$IMAGE"

echo "→ docker stop & rm $CONTAINER_NAME"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "→ docker run"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  "$IMAGE"

docker image prune -f
docker ps --filter name="$CONTAINER_NAME"
echo "→ deploy done at $(date -u)"