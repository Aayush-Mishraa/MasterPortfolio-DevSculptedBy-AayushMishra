# Manual Deployment Script for Portfolio
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   MANUAL DEPLOYMENT HELPER" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Adding your manual changes..." -ForegroundColor Green
git add build/
git add .github/workflows/urgent-fix.yml
git add deploy-manual.*

Write-Host ""
$message = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "Manual deployment: Updated build files"
}

Write-Host ""
Write-Host "Step 2: Committing manual updates..." -ForegroundColor Green
git commit -m $message

Write-Host ""
Write-Host "Step 3: Pushing to GitHub..." -ForegroundColor Green
git push origin main

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your manually edited files have been:" -ForegroundColor White
Write-Host "✅ Committed to Git" -ForegroundColor Green
Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
Write-Host "✅ Auto-deployed to aayushmishra.tech" -ForegroundColor Green
Write-Host ""
Write-Host "Check your live site in 2-3 minutes!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
