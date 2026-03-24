@echo off
title KnowledgeForge - Rebuild Frontend
echo.
echo Rebuilding frontend in production mode...
echo (Run this after making code changes)
echo.

REM Kill existing frontend
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

cd /d "%~dp0frontend"
echo Building...
npm run build
if %errorlevel% neq 0 (
    echo Build FAILED. Check errors above.
    pause
    exit /b 1
)

echo.
echo Starting frontend...
start "KnowledgeForge Frontend" cmd /k "npm start -- --port 3001"
echo Done! Frontend available at http://localhost:3001
echo.
pause
