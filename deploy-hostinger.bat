@echo off
echo ====================================
echo     HOSTINGER DEPLOYMENT SCRIPT
echo ====================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building production version...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build project
    pause
    exit /b 1
)

echo.
echo [3/4] Creating deployment package...
powershell -Command "Compress-Archive -Path '.\build\*' -DestinationPath '.\hostinger-deployment.zip' -Force"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create zip file
    pause
    exit /b 1
)

echo.
echo [4/4] Deployment package created successfully!
echo.
echo ====================================
echo   DEPLOYMENT READY FOR AAYUSHMISHRA.TECH
echo ====================================
echo.
echo 1. Extract 'hostinger-deployment.zip' to your computer
echo 2. Login to your Hostinger File Manager (hPanel)
echo 3. Navigate to public_html folder
echo 4. Upload all extracted files to public_html
echo 5. Make sure index.html is in the root of public_html
echo.
echo Your website will be live at: https://aayushmishra.tech
echo.
pause
