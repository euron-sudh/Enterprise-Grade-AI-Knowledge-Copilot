@echo off
setlocal EnableDelayedExpansion
title KnowledgeForge Launcher

echo ============================================================
echo   KnowledgeForge AI Copilot - Smart Start
echo   DB : Supabase cloud  (no local DB container!)
echo   API: Native Python   (no Docker for API!)
echo   Cache: Redis via Docker
echo   Frontend: Production build (low RAM)
echo ============================================================
echo.

REM ── Step 1: Ensure Docker Desktop is running (only for Redis) ─
echo [1/5] Checking Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   Docker not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo   Waiting for Docker to be ready...
    :waitdocker
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto waitdocker
    echo   Docker is ready!
) else (
    echo   Docker already running. [SKIP]
)

REM ── Step 2: Start Redis only ──────────────────────────────────
echo.
echo [2/5] Starting Redis...
cd /d "%~dp0backend"

docker compose ps --status running 2>nul | findstr "redis" >nul 2>&1
if %errorlevel% equ 0 (
    echo   Redis already running. [SKIP]
) else (
    docker compose up -d redis >nul 2>&1
    :waitredis
    docker compose ps --status healthy 2>nul | findstr "redis" >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 2 /nobreak >nul
        goto waitredis
    )
    echo   Redis ready!
)

REM ── Step 3: Start API directly on host (connects to Supabase) ─
echo.
echo [3/5] Starting Backend API (native Python)...

netstat -an | findstr ":8010 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   API already running on port 8010. [SKIP]
) else (
    cd /d "%~dp0backend"
    start "KnowledgeForge API" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8010"
    echo   Waiting for API to be ready...
    :waitapi
    curl -s http://localhost:8010/health >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 3 /nobreak >nul
        goto waitapi
    )
    echo   API ready!
)

REM ── Step 4: Build frontend (production, only if needed) ───────
echo.
echo [4/5] Checking frontend build...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo   Installing npm packages...
    npm install --silent
    echo   Done!
) else (
    echo   node_modules exists. [SKIP]
)

REM Build if no production build exists yet
if not exist ".next\BUILD_ID" (
    echo   No production build found. Building now (one-time, ~60s)...
    npm run build
    echo   Build complete!
) else (
    echo   Production build exists. [SKIP]
)

REM ── Step 5: Start frontend in production mode ─────────────────
echo.
echo [5/5] Starting Frontend (production mode - low RAM)...

netstat -an | findstr ":3001 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   Frontend already running on port 3001. [SKIP]
) else (
    start "KnowledgeForge Frontend" cmd /k "npm start -- --port 3001"
    echo   Frontend starting...
    :waitfrontend
    curl -s http://localhost:3001 >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 2 /nobreak >nul
        goto waitfrontend
    )
    echo   Frontend ready!
)

REM ── Done ──────────────────────────────────────────────────────
echo.
echo ============================================================
echo   All services are UP!
echo.
echo   Frontend  : http://localhost:3001
echo   Backend   : http://localhost:8010
echo   API Docs  : http://localhost:8010/docs
echo   Database  : Supabase cloud (always on, zero RAM)
echo.
echo   Login     : demo@knowledgeforge.ai / demo12345
echo.
echo   NOTE: After code changes, run rebuild.bat to update build.
echo   To STOP   : run stop.bat
echo ============================================================
echo.
pause
