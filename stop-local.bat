@echo off
REM Stop all Gooqi Scribe local services (Redis + API + Worker + Web).
echo Stopping Gooqi services...

REM Redis
taskkill /F /IM redis-server.exe >nul 2>&1

REM Node processes belonging to this repo only
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*gooqi-medical-transcriber*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

echo Done. All Gooqi services stopped.
pause
