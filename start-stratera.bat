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
echo  STRATERA opens a desktop window (SQL database) and a browser tab.
echo  Keep the DESKTOP window open — the browser uses it for live data.
echo  Keep this command window open while you use the app.
echo  If nothing opens, double-click open-stratera.bat
echo.
echo  Do NOT use "npm run dev" in PowerShell — use this file instead.
echo.

node scripts\launch-stratera.mjs
if errorlevel 1 (
  echo.
  echo  STRATERA failed to start. Try install.bat, then run this file again.
  pause
)
