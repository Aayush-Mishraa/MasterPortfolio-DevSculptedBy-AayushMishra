# Hostinger deployment package builder
$ErrorActionPreference = "Stop"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   HOSTINGER DEPLOYMENT PACKAGE" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Building production app..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Build failed." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "[2/3] Creating hostinger-deployment.zip..." -ForegroundColor Green
$zipPath = Join-Path (Get-Location) "hostinger-deployment.zip"
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
Compress-Archive -Path ".\build\*" -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "[3/3] Package ready." -ForegroundColor Green
$zipInfo = Get-Item $zipPath
Write-Host "File: $($zipInfo.FullName)" -ForegroundColor White
Write-Host ("Size: {0:N2} MB" -f ($zipInfo.Length / 1MB)) -ForegroundColor White
Write-Host ""
Write-Host "Upload all extracted files to Hostinger public_html." -ForegroundColor Yellow
