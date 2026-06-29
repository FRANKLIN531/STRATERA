@echo off
cd /d "%~dp0"
title STRATERA - reset to fresh install

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Run install.bat first.
  pause
  exit /b 1
)

echo.
echo  This will DELETE all STRATERA data and restore a fresh install.
echo  Close STRATERA and any start-stratera.bat window first.
echo.
pause

node scripts\reset-fresh-system.mjs
if errorlevel 1 pause
