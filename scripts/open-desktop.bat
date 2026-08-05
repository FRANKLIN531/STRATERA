@echo off
cd /d "%~dp0.."
title STRATERA Desktop

echo.
echo  Closing any stuck STRATERA desktop processes...
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo  Opening STRATERA desktop window...
node "%~dp0open-desktop-window.mjs"
if errorlevel 1 (
  echo.
  echo  Failed to open desktop. Make sure start-stratera.bat is running.
  pause
  exit /b 1
)

echo.
echo  If no window appears, fully stop start-stratera.bat ^(Ctrl+C^),
echo  then run start-stratera.bat again and use this file once more.
echo.
timeout /t 4 >nul
