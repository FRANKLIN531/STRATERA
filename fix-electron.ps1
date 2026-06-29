$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$electronDir = Join-Path $root 'node_modules\electron'
$distDir = Join-Path $electronDir 'dist'
$pathFile = Join-Path $electronDir 'path.txt'

if (Test-Path (Join-Path $distDir 'electron.exe')) {
  if (-not (Test-Path $pathFile)) {
    Set-Content -Path $pathFile -Value 'electron.exe' -NoNewline
  }
  Write-Host 'Electron is already installed.'
  exit 0
}

Write-Host 'Downloading Electron (if needed)...'
Push-Location $electronDir
node install.js
Pop-Location

if (Test-Path (Join-Path $distDir 'electron.exe')) {
  Set-Content -Path $pathFile -Value 'electron.exe' -NoNewline
  Write-Host 'Electron installed successfully.'
  exit 0
}

Write-Host 'Extracting Electron from local cache...'
$cacheRoot = Join-Path $env:LOCALAPPDATA 'electron\Cache'
$zip = Get-ChildItem $cacheRoot -Recurse -Filter 'electron-v*-win32-x64.zip' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $zip) {
  Write-Host 'ERROR: Could not find Electron download. Check your internet connection and run install.bat again.'
  exit 1
}

Remove-Item $distDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Expand-Archive -Path $zip.FullName -DestinationPath $distDir -Force
Set-Content -Path $pathFile -Value 'electron.exe' -NoNewline
Write-Host 'Electron repaired successfully.'
