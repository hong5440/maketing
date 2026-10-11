#!/usr/bin/env bash
# ================================================================
# Seedance 2.5로 생성된 사이트 영상을 로컬(assets/)로 내려받는 스크립트
# 사용법:  bash assets/fetch-videos.sh
# ----------------------------------------------------------------
# 사이트는 기본적으로 로컬 파일(assets/*.mp4)을 먼저 시도하고,
# 없으면 Higgsfield CDN 원본 주소로 자동 폴백합니다.
# 오프라인 배포나 CDN 의존 제거를 원할 때만 실행하면 됩니다.
# ================================================================
set -euo pipefail
cd "$(dirname "$0")"

HERO_URL="https://d8j0ntlcm91z4.cloudfront.net/user_3KRk1RHdYzBrLJbRyEaUBAkQCsp/hf_20261011_052906_f49d6984-9bda-457a-934b-902c085f5830.mp4"
MOBILE_URL="https://d8j0ntlcm91z4.cloudfront.net/user_3KRk1RHdYzBrLJbRyEaUBAkQCsp/hf_20261011_052906_9ca17057-d26c-4ea0-814c-6e410abe5052.mp4"

echo "⬇️  hero.mp4 (16:9 히어로 배경) 다운로드 중..."
curl -fL --retry 3 -o hero.mp4 "$HERO_URL"
echo "⬇️  mobile.mp4 (9:16 모바일 쇼케이스) 다운로드 중..."
curl -fL --retry 3 -o mobile.mp4 "$MOBILE_URL"

echo "✅ 완료! index.html이 이제 로컬 영상을 사용합니다."
ls -lh hero.mp4 mobile.mp4
