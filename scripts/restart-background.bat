@echo off
taskkill /F /IM electron.exe /T >nul 2>&1
ping 127.0.0.1 -n 2 >nul 2>&1
node Q:\Todo\scripts\launch-background.js
