@echo off
echo ====================================
echo     LOCAL BUILD VERIFICATION
echo ====================================
echo.

echo Testing production build locally...
echo Installing serve if not present...
call npm install -g serve

echo.
echo Starting local server on port 5000...
echo Open http://localhost:5000 in your browser
echo.
echo Press Ctrl+C to stop the server
echo.

cd build
call serve -s . -p 5000
