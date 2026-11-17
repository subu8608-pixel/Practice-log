@echo off
chcp 65001 > nul
title 벨리댄스 연습일지 실행

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo 벨리댄스 연습일지 로컬 서버를 구동 중입니다...
    python server.py
) else (
    echo 브라우저에서 직접 index.html을 엽니다...
    start index.html
)
pause
