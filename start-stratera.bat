@echo off
cd /d "%~dp0"
title STRATERA - keep this window open

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Install from https://nodejs.org and run install.bat
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo.
  echo  Dependencies are not installed yet.
  echo  Double-click install.bat first, then run this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo  STRATERA will open at http://localhost:5190/
echo  (also works at http://127.0.0.1:5190/)
echo  Keep this window open while you use the app.
echo  If the browser does not open, double-click open-stratera.bat
echo.
echo  Do NOT use "npm run dev" in PowerShell — use this file instead.
echo.

node scripts\launch-stratera.mjs
if errorlevel 1 (
  echo.
  echo  STRATERA failed to start. Try install.bat, then run this file again.
  pause
)
