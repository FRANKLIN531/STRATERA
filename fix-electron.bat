@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-electron.ps1"
if %ERRORLEVEL% NEQ 0 pause
