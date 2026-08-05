# Requires Administrator — enable SQL Server TCP/IP on port 1433 and restart the service.
$ErrorActionPreference = 'Stop'
$base = 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib'
Set-ItemProperty -Path "$base\Tcp" -Name Enabled -Value 1
Set-ItemProperty -Path "$base\Tcp\IPAll" -Name TcpPort -Value '1433'
Set-ItemProperty -Path "$base\Tcp\IPAll" -Name TcpDynamicPorts -Value ''
# Enable common IP entries if present
Get-ChildItem "$base\Tcp" | Where-Object { $_.PSChildName -like 'IP*' } | ForEach-Object {
  try { Set-ItemProperty -Path $_.PSPath -Name Enabled -Value 1 -ErrorAction SilentlyContinue } catch {}
}
Write-Host 'TCP/IP enabled. Restarting SQL Server...'
Restart-Service -Name 'MSSQLSERVER' -Force
Start-Sleep -Seconds 4
$listening = netstat -ano | Select-String ':1433' | Select-String 'LISTENING'
if ($listening) {
  Write-Host 'SQL Server is listening on 1433.'
  exit 0
}
Write-Host 'WARNING: Port 1433 still not listening. Open SQL Server Configuration Manager and enable TCP/IP manually.'
exit 1
