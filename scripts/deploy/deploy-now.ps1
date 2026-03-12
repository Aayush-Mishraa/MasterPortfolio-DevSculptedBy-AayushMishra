# One-click deployment script for portfolio
$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  PORTFOLIO DEPLOYMENT (ONE-CLICK)" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Checking git branch..." -ForegroundColor Green
$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($currentBranch -ne "main") {
  Write-Host "WARNING: You are on branch '$currentBranch' (recommended: main)" -ForegroundColor Yellow
  $continueBranch = Read-Host "Continue anyway? (y/n)"
  if ($continueBranch -ne "y" -and $continueBranch -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
  }
}

Write-Host ""
Write-Host "[2/5] Building production app..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Build failed. Deployment stopped." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host ""
Write-Host "[3/5] Staging all changes..." -ForegroundColor Green
git add -A

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No staged changes found. Nothing to deploy." -ForegroundColor Yellow
  Read-Host "Press Enter to exit"
  exit 0
}

Write-Host ""
$message = Read-Host "[4/5] Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($message)) {
  $message = "Deploy: latest portfolio updates"
}

git commit -m "$message"
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Commit failed. Deployment stopped." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host ""
Write-Host "[5/5] Pushing to GitHub main..." -ForegroundColor Green
git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Push failed. Deployment stopped." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT TRIGGERED SUCCESSFULLY" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "GitHub Actions will now build and deploy to Hostinger." -ForegroundColor White
Write-Host "Track workflow in: GitHub > Actions" -ForegroundColor White
Read-Host "Press Enter to exit"
