#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "아차사고 레이더 데모를 http://localhost:3333 에 띄웁니다…"
( sleep 1.5; open "http://localhost:3333" ) &
npx -y serve -l 3333 . || python3 -m http.server 3333
