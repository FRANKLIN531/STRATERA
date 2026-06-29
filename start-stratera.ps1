$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is not installed. Install from https://nodejs.org and run install.bat'
  exit 1
}

if (-not (Test-Path "$PSScriptRoot\node_modules\vite\package.json")) {
  Write-Host ''
  Write-Host 'Dependencies are not installed yet.'
  Write-Host 'Run install.bat first, then start STRATERA again.'
  Write-Host ''
  exit 1
}

Write-Host ''
Write-Host 'Starting STRATERA (do not use npm run dev in PowerShell — use this script).'
Write-Host ''

node scripts\launch-stratera.mjs
