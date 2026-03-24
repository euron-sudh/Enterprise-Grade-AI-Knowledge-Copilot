@echo off
title KnowledgeForge - Stopping

echo ============================================================
echo   KnowledgeForge - Stopping Services
echo ============================================================
echo.

echo Stopping backend containers (data is preserved)...
cd /d "%~dp0backend"
docker compose stop >nul 2>&1
echo   Backend stopped.

echo.
echo Closing frontend window...
taskkill /FI "WINDOWTITLE eq KnowledgeForge Frontend" /F >nul 2>&1
echo   Frontend stopped.

echo.
echo ============================================================
echo   All services stopped.
echo   Your data (DB) is preserved.
echo   Next start will be FAST - run start.bat
echo ============================================================
echo.
pause
