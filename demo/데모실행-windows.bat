@echo off
cd /d "%~dp0"
echo 아차사고 레이더 데모를 http://localhost:3333 에 띄웁니다...
start "" http://localhost:3333
npx -y serve -l 3333 . || py -m http.server 3333
