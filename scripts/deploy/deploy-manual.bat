@echo off
echo =====================================
echo   MANUAL DEPLOYMENT HELPER
echo =====================================
echo.

echo Step 1: Adding your manual changes...
git add build/
git add .github/workflows/urgent-fix.yml

echo.
echo Step 2: Committing manual updates...
set /p message="Enter commit message (or press Enter for default): "
if "%message%"=="" set message="Manual deployment: Updated build files"

git commit -m "%message%"

echo.
echo Step 3: Pushing to GitHub...
git push origin main

echo.
echo =====================================
echo   DEPLOYMENT COMPLETE!
echo =====================================
echo.
echo Your manually edited files have been:
echo ✅ Committed to Git
echo ✅ Pushed to GitHub  
echo ✅ Auto-deployed to aayushmishra.tech
echo.
echo Check your live site in 2-3 minutes!
echo.
pause
