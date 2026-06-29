@echo off
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed.
  pause
  exit /b 1
)

node -e "fetch('http://127.0.0.1:5190/').then(function(r){if(!r.ok)throw new Error('bad status');process.exit(0);}).catch(function(){process.exit(1);})" >nul 2>&1
if errorlevel 1 (
  echo.
  echo  STRATERA is not running yet.
  echo  1. Double-click start-stratera.bat
  echo  2. Wait until you see "STRATERA is ready"
  echo  3. Then run this file again
  echo.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5190/?reload=1"
echo Opened http://127.0.0.1:5190/ in your browser.
echo If the page looks outdated, press Ctrl+Shift+R to hard refresh.
timeout /t 3 >nul
