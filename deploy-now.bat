@echo off
setlocal EnableExtensions

echo =====================================
echo   PORTFOLIO DEPLOYMENT (ONE-CLICK)
echo =====================================
echo.

echo [1/5] Checking git branch...
for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
if /I not "%CURRENT_BRANCH%"=="main" (
  echo WARNING: You are on branch "%CURRENT_BRANCH%" (recommended: main)
  set /p continueBranch="Continue anyway? (y/n): "
  if /I not "%continueBranch%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 1
  )
)

echo.
echo [2/5] Building production app...
call npm run build
if %errorlevel% neq 0 (
  echo ERROR: Build failed. Deployment stopped.
  pause
  exit /b 1
)

echo.
echo [3/5] Staging all changes...
git add -A

git diff --cached --quiet
if %errorlevel% equ 0 (
  echo No staged changes found. Nothing to deploy.
  pause
  exit /b 0
)

echo.
set /p message="[4/5] Enter commit message (or press Enter for default): "
if "%message%"=="" set message=Deploy: latest portfolio updates

git commit -m "%message%"
if %errorlevel% neq 0 (
  echo ERROR: Commit failed. Deployment stopped.
  pause
  exit /b 1
)

echo.
echo [5/5] Pushing to GitHub main...
git push origin main
if %errorlevel% neq 0 (
  echo ERROR: Push failed. Deployment stopped.
  pause
  exit /b 1
)

echo.
echo =====================================
echo   DEPLOYMENT TRIGGERED SUCCESSFULLY
echo =====================================
echo.
echo GitHub Actions will now build and deploy to Hostinger.
echo Track workflow in: GitHub ^> Actions
pause
