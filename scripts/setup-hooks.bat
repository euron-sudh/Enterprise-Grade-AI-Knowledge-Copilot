@echo off
REM ============================================================================
REM  One-time setup: configure Git to use the shared .githooks directory.
REM  Run from the project root:   scripts\setup-hooks.bat
REM ============================================================================

cd /d "%~dp0\.."

echo.
echo  Setting up Git hooks...
echo.

git config core.hooksPath .githooks

if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Failed to configure git hooks.
    exit /b 1
)

echo  [OK] Git hooks configured successfully.
echo.
echo  The pre-push hook will now run automatically before every "git push".
echo  To bypass in emergencies:  git push --no-verify
echo.
