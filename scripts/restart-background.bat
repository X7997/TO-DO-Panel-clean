@echo off
setlocal
node "%~dp0stop-background.js"
if errorlevel 1 exit /b %errorlevel%
timeout /t 2 /nobreak >nul
node "%~dp0launch-background.js"
exit /b %errorlevel%
