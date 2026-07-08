@echo off
REM ============================================================
REM  Gooqi Scribe - local dev launcher
REM  Starts Redis + API + Worker + Web, each in its own window.
REM  Run this after a reboot (or whenever nothing is running).
REM ============================================================

cd /d "D:\gooqi-medical-transcriber"

echo.
echo [1/4] Starting Redis (job queue)...
start "Gooqi Redis" /min /d "D:\redis-server" "D:\redis-server\redis-server.exe" --port 6379

REM give Redis a moment to accept connections before the worker/api connect
timeout /t 3 /nobreak >nul

echo [2/4] Starting API        (http://localhost:4000)...
start "Gooqi API"    cmd /k "cd /d D:\gooqi-medical-transcriber && pnpm --filter @gooqi/api dev"

echo [3/4] Starting Worker     (ASR + note generation)...
start "Gooqi Worker" cmd /k "cd /d D:\gooqi-medical-transcriber && pnpm --filter @gooqi/worker dev"

echo [4/4] Starting Web        (http://localhost:3000)...
start "Gooqi Web"    cmd /k "cd /d D:\gooqi-medical-transcriber && pnpm --filter @gooqi/web dev"

echo.
echo All four services are launching in separate windows.
echo   Web:    http://localhost:3000
echo   API:    http://localhost:4000
echo   Redis:  localhost:6379  (minimized window)
echo.
echo Give the Web window ~15s to compile, then open http://localhost:3000
echo To STOP everything: close the four windows (or run stop-local.bat).
echo.
pause
