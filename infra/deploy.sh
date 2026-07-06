#!/usr/bin/env bash
# 서버측 배포 스크립트 — GitHub Actions 가 SSH 로 호출한다.
# 배치 위치: /opt/singunu/deploy.sh  (chmod +x)
# 사용법:   bash /opt/singunu/deploy.sh <이미지:태그>
#   예)     bash /opt/singunu/deploy.sh ghcr.io/OWNER/singunu-api:ab12cd3
#   인자 생략 시 :latest 로 동작.
#
# 전제:
#   - /opt/singunu/.env 에 운영 환경변수가 있다 (infra/.env.prod.example 참고, 절대 커밋 금지)
#   - Docker 설치 완료
#   - (이미지가 private GHCR 이면) 서버에서 미리 docker login ghcr.io 완료
#     (패키지를 public 으로 두면 로그인 불필요 — 가이드 참고)
set -euo pipefail

CONTAINER="singunu-api"
ENV_FILE="/opt/singunu/.env"
DEFAULT_IMAGE="ghcr.io/OWNER/singunu-api:latest"   # 👈 OWNER 교체
IMAGE="${1:-$DEFAULT_IMAGE}"
HEALTH_URL="http://127.0.0.1:8080/api/health"

echo "▶ 배포 시작: $IMAGE"

if [ ! -f "$ENV_FILE" ]; then
  echo "✖ 환경변수 파일이 없습니다: $ENV_FILE  (배포 중단)"
  exit 1
fi

# 롤백을 위해 현재 실행 중인 이미지 ID 기억
PREV_IMAGE="$(docker inspect --format '{{.Image}}' "$CONTAINER" 2>/dev/null || echo '')"

echo "▶ 이미지 pull"
docker pull "$IMAGE"

echo "▶ 기존 컨테이너 정리"
docker stop "$CONTAINER" 2>/dev/null || true
docker rm   "$CONTAINER" 2>/dev/null || true

echo "▶ 새 컨테이너 실행"
docker run -d \
  --name "$CONTAINER" \
  --env-file "$ENV_FILE" \
  -p 127.0.0.1:8080:8080 \
  --restart unless-stopped \
  "$IMAGE"

# ── 헬스체크 폴링 (/api/health 가 200 이 될 때까지 최대 ~60초) ──
echo "▶ 헬스체크 대기 ($HEALTH_URL)"
OK=0
for i in $(seq 1 30); do
  if curl -fs "$HEALTH_URL" | grep -q '"status":"ok"'; then
    OK=1
    echo "✔ 헬스체크 통과 (${i}회 시도)"
    break
  fi
  sleep 2
done

if [ "$OK" -ne 1 ]; then
  echo "✖ 헬스체크 실패 — 새 이미지가 정상 기동하지 못했습니다."
  echo "  최근 로그:"
  docker logs --tail 50 "$CONTAINER" || true
  echo ""
  echo "  ── 롤백 안내 ──"
  if [ -n "$PREV_IMAGE" ]; then
    echo "  이전 이미지로 되돌리려면:"
    echo "    docker stop $CONTAINER && docker rm $CONTAINER"
    echo "    docker run -d --name $CONTAINER --env-file $ENV_FILE -p 127.0.0.1:8080:8080 --restart unless-stopped $PREV_IMAGE"
  else
    echo "  이전 이미지 정보가 없어 자동 롤백 불가 — 로그를 확인해 원인을 조치하세요."
  fi
  exit 1
fi

# 성공 시 오래된 이미지 정리 (디스크 절약, 실패해도 무시)
docker image prune -f >/dev/null 2>&1 || true

echo "✅ 배포 완료: $IMAGE"
