@echo off
REM Auto-refresh GitHub data for your portfolio
REM This batch file can be run as a Windows scheduled task

echo [%date% %time%] Starting GitHub data auto-refresh...

cd /d "%~dp0"

REM Run the data fetcher
node git_data_fetcher.mjs

if %errorlevel% equ 0 (
    echo [%date% %time%] GitHub data refresh completed successfully
) else (
    echo [%date% %time%] GitHub data refresh failed with error level %errorlevel%
)

REM Optional: Add a small delay to see output
timeout /t 3 /nobreak > nul

exit /b %errorlevel%
