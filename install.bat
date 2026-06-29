@echo off
cd /d "%~dp0"
echo Installing STRATERA dependencies...
call npm.cmd install
if %ERRORLEVEL% NEQ 0 (
  echo Install failed. See errors above.
  pause
  exit /b 1
)
echo.
echo Setting up Electron...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-electron.ps1"
if %ERRORLEVEL% NEQ 0 (
  echo Electron setup failed.
  pause
  exit /b 1
)
echo.
echo Done! Double-click start-stratera.bat to run STRATERA.
echo In PowerShell, run: .\start-stratera.ps1
pause
