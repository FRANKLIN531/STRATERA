@echo off
cd /d "%~dp0"
echo Syncing STRATERA to GitHub...
node scripts\sync-to-github.mjs
if errorlevel 1 (
  echo.
  echo Sync failed. Check your internet and GitHub sign-in, then try again.
  pause
  exit /b 1
)
echo.
pause
