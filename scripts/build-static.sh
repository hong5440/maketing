#!/usr/bin/env bash
# 정적 HTML 데모 빌드: API 라우트를 잠시 치우고 output:export로 내보낸 뒤 demo/ 에 복사.
# 결과물은 아무 정적 서버로 열면 된다 (npx serve demo). AI 호출은 전부 데모 폴백으로 동작.
set -euo pipefail
cd "$(dirname "$0")/.."

API_DIR="app/api"
BACKUP_DIR=".api-backup"

restore() {
  if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$API_DIR"
    mv "$BACKUP_DIR" "$API_DIR"
  fi
}
trap restore EXIT

# output:export 는 API 라우트와 공존할 수 없으므로 빌드 동안만 치워 둔다
rm -rf "$BACKUP_DIR"
mv "$API_DIR" "$BACKUP_DIR"

rm -rf out
STATIC_EXPORT=1 next build

rm -rf demo
cp -r out demo

# ── 더블클릭 실행 런처 + 안내문 ──────────────────────
cat > "demo/데모실행-mac.command" <<'SH'
#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "아차사고 레이더 데모를 http://localhost:3333 에 띄웁니다…"
( sleep 1.5; open "http://localhost:3333" ) &
npx -y serve -l 3333 . || python3 -m http.server 3333
SH
chmod +x "demo/데모실행-mac.command"

cat > "demo/데모실행-windows.bat" <<'BAT'
@echo off
cd /d "%~dp0"
echo 아차사고 레이더 데모를 http://localhost:3333 에 띄웁니다...
start "" http://localhost:3333
npx -y serve -l 3333 . || py -m http.server 3333
BAT

cat > "demo/README.txt" <<'TXT'
아차사고 레이더 — 정적 HTML 데모
================================

이 폴더는 서버·API 키 없이 동작하는 완전한 정적 데모입니다.
(AI 호출은 전부 미리 준비된 데모 응답으로 대체 — 시연이 끊기지 않음)

실행 방법 (셋 중 아무거나):
  1) 더블클릭: 데모실행-mac.command (macOS) / 데모실행-windows.bat (Windows)
     ※ Node.js 또는 Python이 설치되어 있어야 합니다
  2) 터미널:  npx serve .        (이 폴더에서)
  3) 터미널:  python3 -m http.server 8000

열리는 주소:
  /            관제 대시보드 (3D 맵·히트맵·타임라인)
  /report/     근로자 모바일 보고 (?zone=12 로 구역 자동 입력)
  /tbm/1/ ~ /tbm/22/   구역별 TBM 자료

주의: index.html 을 파일로 직접(더블클릭) 열면 브라우저 보안 정책(file://)
때문에 동작하지 않습니다. 반드시 위의 방법으로 로컬 서버를 통해 여세요.
같은 와이파이의 휴대폰에서 QR 보고를 시연하려면 노트북 IP로 접속하면 됩니다.
TXT

echo
echo "✅ 정적 데모 생성 완료: demo/"
echo "   실행:  npx serve demo   (또는 demo/데모실행-*.{command,bat} 더블클릭)"
