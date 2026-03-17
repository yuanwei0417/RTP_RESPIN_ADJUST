@echo off
cd /d "%~dp0"
echo Starting RTP Tool Server...
echo.
echo   http://localhost:3000
echo.
start http://localhost:3000
node server.js
pause
