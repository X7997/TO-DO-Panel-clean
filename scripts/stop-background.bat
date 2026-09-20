@echo off
setlocal
node "%~dp0stop-background.js"
exit /b %errorlevel%
